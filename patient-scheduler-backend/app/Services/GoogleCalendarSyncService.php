<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\AppointmentGoogleCalendarEvent;
use App\Models\GoogleCalendarConnection;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendar;
use Google\Service\Calendar\Event as GoogleCalendarEvent;
use Google\Service\Exception as GoogleServiceException;
use Illuminate\Support\Facades\Log;
use Throwable;

class GoogleCalendarSyncService
{
    private ?GoogleClient $activeGoogleClient = null;

    private ?int $activeConnectionId = null;

    public function __construct(
        private readonly ?GoogleClient $googleClient = null,
        private readonly ?GoogleCalendar $calendarService = null,
        private readonly ?AppointmentCalendarEventMapper $eventMapper = null,
    ) {}

    public function syncAppointment(GoogleCalendarConnection $connection, Appointment $appointment): bool
    {
        $mapping = $appointment->googleCalendarEvent()->firstOrNew();

        try {
            if ($connection->status !== 'connected') {
                throw new \RuntimeException('Google Calendar is not connected.');
            }

            $appointment->loadMissing('patientCase.patient');
            if ((int) $appointment->patientCase->patient->user_id !== (int) $connection->user_id) {
                throw new \RuntimeException('Appointment does not belong to this Google Calendar connection.');
            }

            $client = $this->authenticatedClient($connection);
            $calendar = $this->calendarService ?? new GoogleCalendar($client);
            $calendarId = $mapping->google_calendar_id ?: 'primary';
            $event = ($this->eventMapper ?? new AppointmentCalendarEventMapper)
                ->map($appointment, (int) $connection->user_id);

            if ($mapping->exists && $mapping->google_event_id) {
                try {
                    $calendar->events->update($calendarId, $mapping->google_event_id, $event);
                } catch (GoogleServiceException $exception) {
                    if ($exception->getCode() !== 404) {
                        throw $exception;
                    }

                    $this->insertIdempotently($calendar, $calendarId, $event);
                }
            } else {
                $this->insertIdempotently($calendar, $calendarId, $event);
            }

            $mapping->fill([
                'user_id' => $connection->user_id,
                'google_calendar_id' => $calendarId,
                'google_event_id' => $event->getId(),
                'status' => 'synced',
                'sync_action' => 'upsert',
                'deleted_appointment_id' => null,
                'last_synced_at' => now(),
                'last_sync_error' => null,
            ])->save();

            return true;
        } catch (Throwable $exception) {
            $message = $this->safeErrorMessage($exception);

            $mapping->fill([
                'user_id' => $connection->user_id,
                'google_calendar_id' => $mapping->google_calendar_id ?: 'primary',
                'google_event_id' => $mapping->google_event_id ?: ($this->eventMapper ?? new AppointmentCalendarEventMapper)
                    ->eventId($appointment, (int) $connection->user_id),
                'status' => 'failed',
                'sync_action' => 'upsert',
                'last_sync_error' => $message,
            ])->save();

            Log::warning('Google Calendar appointment synchronization failed.', [
                'user_id' => $connection->user_id,
                'appointment_id' => $appointment->getKey(),
                'exception' => $exception::class,
                'code' => $exception->getCode(),
            ]);

            return false;
        }
    }

    public function deleteAppointment(?GoogleCalendarConnection $connection, Appointment $appointment): bool
    {
        $mapping = $appointment->googleCalendarEvent()->first();
        if (! $mapping) {
            return true;
        }

        $appointment->loadMissing('patientCase.patient');
        $userId = (int) ($connection?->user_id ?? $appointment->patientCase->patient->user_id);
        $mapping->fill([
            'user_id' => $userId,
            'deleted_appointment_id' => $appointment->getKey(),
            'sync_action' => 'delete',
        ]);

        try {
            if (! $connection || $connection->status !== 'connected') {
                throw new \RuntimeException('Connect Google Calendar to retry deleting this event.');
            }

            if ($userId !== (int) $connection->user_id) {
                throw new \RuntimeException('Appointment does not belong to this Google Calendar connection.');
            }

            $client = $this->authenticatedClient($connection);
            $calendar = $this->calendarService ?? new GoogleCalendar($client);

            try {
                $calendar->events->delete($mapping->google_calendar_id, $mapping->google_event_id);
            } catch (GoogleServiceException $exception) {
                if ($exception->getCode() !== 404) {
                    throw $exception;
                }
            }

            $mapping->delete();

            return true;
        } catch (Throwable $exception) {
            $mapping->fill([
                'status' => 'failed',
                'last_sync_error' => $this->safeErrorMessage($exception),
            ])->save();

            Log::warning('Google Calendar appointment deletion failed.', [
                'user_id' => $userId,
                'appointment_id' => $appointment->getKey(),
                'exception' => $exception::class,
                'code' => $exception->getCode(),
            ]);

            return false;
        }
    }

    public function retryMapping(
        GoogleCalendarConnection $connection,
        AppointmentGoogleCalendarEvent $mapping,
    ): bool {
        if ($mapping->sync_action === 'delete') {
            try {
                if ($connection->status !== 'connected') {
                    throw new \RuntimeException('Google Calendar is not connected.');
                }

                $client = $this->authenticatedClient($connection);
                $calendar = $this->calendarService ?? new GoogleCalendar($client);

                try {
                    $calendar->events->delete($mapping->google_calendar_id, $mapping->google_event_id);
                } catch (GoogleServiceException $exception) {
                    if ($exception->getCode() !== 404) {
                        throw $exception;
                    }
                }

                $mapping->delete();

                return true;
            } catch (Throwable $exception) {
                $mapping->update([
                    'status' => 'failed',
                    'last_sync_error' => $this->safeErrorMessage($exception),
                ]);

                Log::warning('Google Calendar appointment deletion retry failed.', [
                    'user_id' => $connection->user_id,
                    'appointment_id' => $mapping->deleted_appointment_id,
                    'exception' => $exception::class,
                    'code' => $exception->getCode(),
                ]);

                return false;
            }
        }

        $appointment = $mapping->appointment;
        if (! $appointment) {
            $mapping->update([
                'status' => 'failed',
                'last_sync_error' => 'The SchedPx appointment is no longer available for synchronization.',
            ]);

            return false;
        }

        return $this->syncAppointment($connection, $appointment);
    }

    private function authenticatedClient(GoogleCalendarConnection $connection): GoogleClient
    {
        $client = $this->googleClient ?? new GoogleClient;
        if (
            $this->activeGoogleClient
            && $this->activeConnectionId === (int) $connection->getKey()
            && ! $client->isAccessTokenExpired()
        ) {
            return $this->activeGoogleClient;
        }

        $client->setClientId((string) config('services.google_calendar.client_id'));
        $client->setClientSecret((string) config('services.google_calendar.client_secret'));
        $client->setAccessToken(['refresh_token' => $connection->refresh_token]);

        $token = $client->fetchAccessTokenWithRefreshToken($connection->refresh_token);
        if (isset($token['error'])) {
            if ($token['error'] === 'invalid_grant') {
                $connection->update(['status' => 'revoked']);
            }

            throw new \RuntimeException($token['error'] === 'invalid_grant'
                ? 'Google authorization expired or was revoked. Reconnect Google Calendar.'
                : 'Unable to refresh Google Calendar authorization.');
        }

        $token['refresh_token'] = $connection->refresh_token;
        $client->setAccessToken($token);
        $this->activeGoogleClient = $client;
        $this->activeConnectionId = (int) $connection->getKey();

        return $client;
    }

    private function insertIdempotently(GoogleCalendar $calendar, string $calendarId, GoogleCalendarEvent $event): void
    {
        try {
            $calendar->events->insert($calendarId, $event);
        } catch (GoogleServiceException $exception) {
            if ($exception->getCode() !== 409) {
                throw $exception;
            }

            $calendar->events->get($calendarId, $event->getId());
        }
    }

    private function safeErrorMessage(Throwable $exception): string
    {
        if ($exception instanceof GoogleServiceException && $exception->getCode() === 429) {
            return 'Google Calendar is temporarily rate-limited. Retry synchronization later.';
        }

        if ($exception instanceof GoogleServiceException && $exception->getCode() === 403) {
            return 'Google Calendar denied the request because of permissions or quota limits. Check access, then retry.';
        }

        if ($exception->getMessage() === 'Google authorization expired or was revoked. Reconnect Google Calendar.') {
            return $exception->getMessage();
        }

        if ($exception->getMessage() === 'Appointment does not belong to this Google Calendar connection.') {
            return $exception->getMessage();
        }

        if ($exception->getMessage() === 'Connect Google Calendar to retry deleting this event.') {
            return $exception->getMessage();
        }

        return 'Google Calendar synchronization failed. Retry later.';
    }
}
