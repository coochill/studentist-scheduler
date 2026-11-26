<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentGoogleCalendarEvent;
use App\Models\GoogleCalendarConnection;
use App\Services\GoogleCalendarSyncService;
use Google\Client as GoogleClient;
use Google\Service\Oauth2;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class GoogleCalendarController extends Controller
{
    private const STATE_TTL = 600;

    public function status(Request $request): JsonResponse
    {
        $connection = $request->user()->googleCalendarConnection;

        return response()->json([
            'connected' => $connection?->status === 'connected',
            'email' => $connection?->google_email,
            'status' => $connection?->status,
            'last_synced_at' => $connection
                ? AppointmentGoogleCalendarEvent::query()
                    ->where('user_id', $request->user()->getKey())
                    ->where('status', 'synced')
                    ->max('last_synced_at')
                : null,
        ]);
    }

    public function syncStatus(Request $request): JsonResponse
    {
        $userId = $request->user()->getKey();
        $appointments = Appointment::query()
            ->whereHas('patientCase.patient', fn ($query) => $query->where('user_id', $userId));
        $mappings = AppointmentGoogleCalendarEvent::query()->where('user_id', $userId);

        return response()->json([
            'total' => (clone $appointments)->count(),
            'synced' => (clone $mappings)->where('status', 'synced')->count(),
            'failed' => (clone $mappings)->where('status', 'failed')->count(),
            'pending' => (clone $appointments)->whereDoesntHave('googleCalendarEvent')->count(),
            'last_synced_at' => (clone $mappings)
                ->where('status', 'synced')
                ->max('last_synced_at'),
            'failures' => (clone $mappings)
                ->where('status', 'failed')
                ->orderBy('id')
                ->limit(100)
                ->get()
                ->map(fn (AppointmentGoogleCalendarEvent $mapping): array => [
                    'appointment_id' => $mapping->deleted_appointment_id ?? $mapping->appointment_id,
                    'error' => $mapping->last_sync_error,
                ])
                ->values(),
        ]);
    }

    public function sync(Request $request, GoogleCalendarSyncService $syncService): JsonResponse
    {
        $validated = $request->validate([
            'appointment_id' => ['sometimes', 'integer', 'min:1', 'prohibits:after_appointment_id'],
            'after_appointment_id' => ['sometimes', 'integer', 'min:1', 'prohibits:appointment_id'],
        ]);
        $connection = $request->user()->googleCalendarConnection;

        if (! $connection || $connection->status !== 'connected') {
            return response()->json(['message' => 'Connect Google Calendar before synchronizing appointments.'], 409);
        }

        $query = $this->userAppointments($request->user()->getKey())
            ->with('googleCalendarEvent')
            ->orderBy('id');

        if (isset($validated['appointment_id'])) {
            $query->whereKey($validated['appointment_id']);
            abort_unless($query->exists(), 404);
            $appointments = $query->limit(1)->get();
            $hasMore = false;
        } else {
            if (isset($validated['after_appointment_id'])) {
                $query->where('id', '>', $validated['after_appointment_id']);
            }

            $appointments = $query->limit(251)->get();
            $hasMore = $appointments->count() > 250;
            $appointments = $appointments->take(250);
        }

        return $this->syncAppointments($appointments, $connection, $syncService, $hasMore);
    }

    public function retry(Request $request, GoogleCalendarSyncService $syncService): JsonResponse
    {
        $validated = $request->validate([
            'appointment_id' => ['sometimes', 'integer', 'min:1', 'prohibits:after_mapping_id'],
            'after_mapping_id' => ['sometimes', 'integer', 'min:1', 'prohibits:appointment_id'],
        ]);
        $connection = $request->user()->googleCalendarConnection;

        if (! $connection || $connection->status !== 'connected') {
            return response()->json(['message' => 'Connect Google Calendar before retrying synchronization.'], 409);
        }

        $query = AppointmentGoogleCalendarEvent::query()
            ->where('user_id', $request->user()->getKey())
            ->where('status', 'failed')
            ->with('appointment')
            ->orderBy('id');

        if (isset($validated['appointment_id'])) {
            $query->where(function (Builder $builder) use ($validated): void {
                $builder->where('appointment_id', $validated['appointment_id'])
                    ->orWhere('deleted_appointment_id', $validated['appointment_id']);
            });
            abort_unless($query->exists(), 404);
            $mappings = $query->limit(1)->get();
            $hasMore = false;
        } else {
            if (isset($validated['after_mapping_id'])) {
                $query->where('id', '>', $validated['after_mapping_id']);
            }

            $mappings = $query->limit(251)->get();
            $hasMore = $mappings->count() > 250;
            $mappings = $mappings->take(250);
        }

        $results = $mappings->map(fn (AppointmentGoogleCalendarEvent $mapping): array => [
            'appointment_id' => $mapping->deleted_appointment_id ?? $mapping->appointment_id,
            'synced' => $syncService->retryMapping($connection, $mapping),
            'error' => $mapping->fresh()?->last_sync_error,
        ]);

        return response()->json([
            'total' => $results->count(),
            'synced' => $results->where('synced', true)->count(),
            'failed' => $results->where('synced', false)->count(),
            'has_more' => $hasMore,
            'next_after_mapping_id' => $hasMore ? $mappings->last()->id : null,
            'results' => $results->values(),
        ]);
    }

    public function connect(Request $request): JsonResponse
    {
        $client = $this->client();
        $state = Str::random(64);

        Cache::put($this->stateKey($state), $request->user()->getKey(), self::STATE_TTL);

        $client->setState($state);
        $client->setAccessType('offline');
        $client->setPrompt('consent');
        $client->setIncludeGrantedScopes(true);
        $client->setScopes([config('services.google_calendar.scope')]);

        return response()->json([
            'authorization_url' => $client->createAuthUrl(),
        ]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = rtrim((string) config('app.frontend_url', env('FRONTEND_URL', '/')), '/');
        $state = $request->string('state')->toString();
        $userId = $state !== '' ? Cache::pull($this->stateKey($state)) : null;

        if ($userId === null) {
            return redirect()->away($frontendUrl.'?google_calendar=invalid_state');
        }

        if ($request->filled('error') || ! $request->filled('code')) {
            return redirect()->away($frontendUrl.'?google_calendar=denied');
        }

        try {
            $client = $this->client();
            $token = $client->fetchAccessTokenWithAuthCode($request->string('code')->toString());

            if (isset($token['error']) || empty($token['access_token'])) {
                return redirect()->away($frontendUrl.'?google_calendar=authorization_failed');
            }

            $client->setAccessToken($token);
            $googleUser = (new Oauth2($client))->userinfo->get();
            $connection = GoogleCalendarConnection::firstOrNew(['user_id' => $userId]);

            $connection->fill([
                'google_account_id' => $googleUser->getId(),
                'google_email' => $googleUser->getEmail(),
                'refresh_token' => $token['refresh_token'] ?? $connection->refresh_token,
                'status' => 'connected',
            ]);

            if (! $connection->refresh_token) {
                return redirect()->away($frontendUrl.'?google_calendar=missing_refresh_token');
            }

            $connection->save();
        } catch (Throwable $exception) {
            Log::warning('Google Calendar authorization failed.', [
                'user_id' => $userId,
                'exception' => $exception::class,
            ]);

            return redirect()->away($frontendUrl.'?google_calendar=authorization_failed');
        }

        return redirect()->away($frontendUrl.'?google_calendar=connected');
    }

    public function disconnect(Request $request): JsonResponse
    {
        $connection = $request->user()->googleCalendarConnection;

        if ($connection) {
            try {
                $client = $this->client();
                $client->revokeToken($connection->refresh_token);
            } catch (Throwable $exception) {
                Log::warning('Google Calendar authorization revocation failed.', [
                    'user_id' => $request->user()->getKey(),
                    'exception' => $exception::class,
                ]);
            }

            $connection->delete();
        }

        return response()->json(['connected' => false]);
    }

    private function client(): GoogleClient
    {
        $client = new GoogleClient;
        $client->setClientId((string) config('services.google_calendar.client_id'));
        $client->setClientSecret((string) config('services.google_calendar.client_secret'));
        $client->setRedirectUri((string) config('services.google_calendar.redirect_uri'));

        return $client;
    }

    private function stateKey(string $state): string
    {
        return 'google-calendar-oauth:'.$state;
    }

    private function userAppointments(int $userId): Builder
    {
        return Appointment::query()
            ->whereHas('patientCase.patient', fn ($query) => $query->where('user_id', $userId));
    }

    private function syncAppointments(
        Collection $appointments,
        GoogleCalendarConnection $connection,
        GoogleCalendarSyncService $syncService,
        bool $hasMore,
    ): JsonResponse {
        $results = $appointments->map(fn (Appointment $appointment): array => [
            'appointment_id' => $appointment->id,
            'synced' => $syncService->syncAppointment($connection, $appointment),
            'error' => $appointment->fresh()->googleCalendarEvent?->last_sync_error,
        ]);

        return response()->json([
            'total' => $results->count(),
            'synced' => $results->where('synced', true)->count(),
            'failed' => $results->where('synced', false)->count(),
            'has_more' => $hasMore,
            'next_after_appointment_id' => $hasMore ? $results->last()['appointment_id'] : null,
            'results' => $results->values(),
        ]);
    }
}
