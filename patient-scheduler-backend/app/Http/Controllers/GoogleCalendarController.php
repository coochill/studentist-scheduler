<?php

namespace App\Http\Controllers;

use App\Models\GoogleCalendarConnection;
use Google\Client as GoogleClient;
use Google\Service\Oauth2;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
}
