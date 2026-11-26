<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentGoogleCalendarEvent;
use App\Models\CaseType;
use App\Models\GoogleCalendarConnection;
use App\Models\PatientCase;
use App\Models\User;
use App\Services\AppointmentCalendarEventMapper;
use App\Services\GoogleCalendarSyncService;
use Google\Client as GoogleClient;
use Google\Service\Calendar as GoogleCalendar;
use Google\Service\Calendar\Event as GoogleCalendarEvent;
use Google\Service\Exception as GoogleServiceException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class GoogleCalendarSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_mapping_contains_only_generic_appointment_details(): void
    {
        config(['app.timezone' => 'Asia/Manila']);
        [$user, $appointment] = $this->makeAppointment();

        $event = (new AppointmentCalendarEventMapper)->map($appointment, $user->id);

        $this->assertSame('SchedPx Appointment', $event->getSummary());
        $this->assertNull($event->getDescription());
        $this->assertSame('schedpvu'.$user->id.'a'.$appointment->id, $event->getId());
        $this->assertSame('2026-11-24T09:30:00+08:00', $event->getStart()->getDateTime());
        $this->assertSame('Asia/Manila', $event->getStart()->getTimeZone());
        $this->assertStringNotContainsString('Private Patient', json_encode($event));
        $this->assertStringNotContainsString('clinical note', json_encode($event));
    }

    public function test_sync_creates_event_mapping_and_records_last_success(): void
    {
        [$user, $appointment, $connection] = $this->makeAppointmentWithConnection();
        $client = Mockery::mock(GoogleClient::class);
        $client->shouldIgnoreMissing();
        $logger = Mockery::mock();
        $logger->shouldIgnoreMissing();
        $client->shouldReceive('getLogger')->andReturn($logger);
        $client->shouldReceive('setClientId')->once();
        $client->shouldReceive('setClientSecret')->once();
        $client->shouldReceive('setAccessToken')->twice();
        $client->shouldReceive('fetchAccessTokenWithRefreshToken')
            ->once()
            ->with('stored-refresh-token')
            ->andReturn(['access_token' => 'test-access-token']);
        $client->shouldReceive('execute')
            ->once()
            ->andReturn(new GoogleCalendarEvent);

        $service = new GoogleCalendarSyncService($client, new GoogleCalendar($client));

        $this->assertTrue($service->syncAppointment($connection, $appointment));

        $mapping = AppointmentGoogleCalendarEvent::where('appointment_id', $appointment->id)->firstOrFail();
        $this->assertSame('primary', $mapping->google_calendar_id);
        $this->assertSame('schedpvu'.$user->id.'a'.$appointment->id, $mapping->google_event_id);
        $this->assertSame('synced', $mapping->status);
        $this->assertNotNull($mapping->last_synced_at);
        $this->assertNull($mapping->last_sync_error);
    }

    public function test_repeated_sync_updates_the_existing_event_mapping(): void
    {
        [, $appointment, $connection] = $this->makeAppointmentWithConnection();
        $client = Mockery::mock(GoogleClient::class);
        $client->shouldIgnoreMissing();
        $logger = Mockery::mock();
        $logger->shouldIgnoreMissing();
        $client->shouldReceive('getLogger')->andReturn($logger);
        $client->shouldReceive('setClientId')->once();
        $client->shouldReceive('setClientSecret')->once();
        $client->shouldReceive('setAccessToken')->twice();
        $client->shouldReceive('fetchAccessTokenWithRefreshToken')
            ->once()
            ->andReturn(['access_token' => 'test-access-token']);
        $client->shouldReceive('isAccessTokenExpired')->once()->andReturn(false);
        $client->shouldReceive('execute')
            ->twice()
            ->andReturn(new GoogleCalendarEvent);

        $service = new GoogleCalendarSyncService($client, new GoogleCalendar($client));

        $this->assertTrue($service->syncAppointment($connection, $appointment));
        $this->assertTrue($service->syncAppointment($connection, $appointment));
        $this->assertSame(1, AppointmentGoogleCalendarEvent::where('appointment_id', $appointment->id)->count());
    }

    public function test_quota_failure_is_recorded_with_a_safe_retry_message(): void
    {
        [, $appointment, $connection] = $this->makeAppointmentWithConnection();
        $client = Mockery::mock(GoogleClient::class);
        $client->shouldIgnoreMissing();
        $logger = Mockery::mock();
        $logger->shouldIgnoreMissing();
        $client->shouldReceive('getLogger')->andReturn($logger);
        $client->shouldReceive('setClientId')->once();
        $client->shouldReceive('setClientSecret')->once();
        $client->shouldReceive('setAccessToken')->twice();
        $client->shouldReceive('fetchAccessTokenWithRefreshToken')
            ->once()
            ->andReturn(['access_token' => 'test-access-token']);
        $client->shouldReceive('execute')
            ->once()
            ->andThrow(new GoogleServiceException('Sensitive provider details', 429));

        $service = new GoogleCalendarSyncService($client, new GoogleCalendar($client));

        $this->assertFalse($service->syncAppointment($connection, $appointment));

        $mapping = AppointmentGoogleCalendarEvent::where('appointment_id', $appointment->id)->firstOrFail();
        $this->assertSame('failed', $mapping->status);
        $this->assertSame('Google Calendar is temporarily rate-limited. Retry synchronization later.', $mapping->last_sync_error);
        $this->assertStringNotContainsString('Sensitive provider details', $mapping->last_sync_error);
    }

    public function test_invalid_refresh_token_revokes_the_connection(): void
    {
        [, $appointment, $connection] = $this->makeAppointmentWithConnection();
        $client = Mockery::mock(GoogleClient::class);
        $client->shouldReceive('setClientId')->once();
        $client->shouldReceive('setClientSecret')->once();
        $client->shouldReceive('setAccessToken')->once();
        $client->shouldReceive('fetchAccessTokenWithRefreshToken')
            ->once()
            ->andReturn(['error' => 'invalid_grant']);

        $service = new GoogleCalendarSyncService($client, new GoogleCalendar($client));

        $this->assertFalse($service->syncAppointment($connection, $appointment));
        $this->assertSame('revoked', $connection->fresh()->status);
        $this->assertSame(
            'Google authorization expired or was revoked. Reconnect Google Calendar.',
            $appointment->googleCalendarEvent()->firstOrFail()->last_sync_error,
        );
    }

    public function test_failed_delete_survives_appointment_removal_and_can_be_retried(): void
    {
        [$owner, $appointment, $connection] = $this->makeAppointmentWithConnection();
        $mapping = AppointmentGoogleCalendarEvent::create([
            'user_id' => $owner->id,
            'appointment_id' => $appointment->id,
            'google_calendar_id' => 'primary',
            'google_event_id' => 'event-to-delete',
            'status' => 'synced',
        ]);
        $failingClient = $this->makeGoogleClientMock(new GoogleServiceException('Quota failure', 429));
        $service = new GoogleCalendarSyncService($failingClient, new GoogleCalendar($failingClient));

        $this->assertFalse($service->deleteAppointment($connection, $appointment));
        $this->assertSame('failed', $mapping->fresh()->status);
        $this->assertSame('delete', $mapping->fresh()->sync_action);

        $appointment->delete();
        $this->assertNull($mapping->fresh()->appointment_id);
        $this->assertSame($appointment->id, $mapping->fresh()->deleted_appointment_id);

        $retryClient = $this->makeGoogleClientMock(null);
        $retryService = new GoogleCalendarSyncService($retryClient, new GoogleCalendar($retryClient));
        $this->assertTrue($retryService->retryMapping($connection, $mapping->fresh()));
        $this->assertDatabaseMissing('appointment_google_calendar_events', ['id' => $mapping->id]);
    }

    public function test_delete_without_connection_records_a_retryable_tombstone(): void
    {
        [$user, $appointment] = $this->makeAppointment();
        $mapping = AppointmentGoogleCalendarEvent::create([
            'user_id' => $user->id,
            'appointment_id' => $appointment->id,
            'google_calendar_id' => 'primary',
            'google_event_id' => 'event-to-delete',
            'status' => 'synced',
        ]);

        $this->assertFalse((new GoogleCalendarSyncService)->deleteAppointment(null, $appointment));

        $this->assertSame('failed', $mapping->fresh()->status);
        $this->assertSame('delete', $mapping->fresh()->sync_action);
        $this->assertSame($appointment->id, $mapping->fresh()->deleted_appointment_id);
        $this->assertSame('Connect Google Calendar to retry deleting this event.', $mapping->fresh()->last_sync_error);
    }

    public function test_manual_sync_is_limited_to_the_authenticated_users_appointments(): void
    {
        [$owner, $appointment, $connection] = $this->makeAppointmentWithConnection();
        [, $otherAppointment] = $this->makeAppointment();
        $syncService = Mockery::mock(GoogleCalendarSyncService::class);
        $syncService->shouldReceive('syncAppointment')
            ->once()
            ->withArgs(fn (GoogleCalendarConnection $actualConnection, Appointment $actualAppointment): bool => $actualConnection->is($connection) && $actualAppointment->is($appointment))
            ->andReturn(true);
        $this->app->instance(GoogleCalendarSyncService::class, $syncService);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/google-calendar/sync', ['appointment_id' => $appointment->id])
            ->assertOk()
            ->assertJsonPath('synced', 1);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/google-calendar/sync', ['appointment_id' => $otherAppointment->id])
            ->assertNotFound();
    }

    public function test_retry_endpoint_only_retries_failed_owned_appointments(): void
    {
        [$owner, $failedAppointment, $connection] = $this->makeAppointmentWithConnection();
        [, $syncedAppointment] = $this->makeAppointment($owner);
        AppointmentGoogleCalendarEvent::create([
            'user_id' => $owner->id,
            'appointment_id' => $failedAppointment->id,
            'google_calendar_id' => 'primary',
            'google_event_id' => 'failed-event-id',
            'status' => 'failed',
            'last_sync_error' => 'Retry this event.',
        ]);
        AppointmentGoogleCalendarEvent::create([
            'user_id' => $owner->id,
            'appointment_id' => $syncedAppointment->id,
            'google_calendar_id' => 'primary',
            'google_event_id' => 'synced-event-id',
            'status' => 'synced',
            'last_synced_at' => now(),
        ]);

        $syncService = Mockery::mock(GoogleCalendarSyncService::class);
        $syncService->shouldReceive('retryMapping')
            ->once()
            ->withArgs(fn (GoogleCalendarConnection $actualConnection, AppointmentGoogleCalendarEvent $actualMapping): bool => $actualConnection->is($connection) && $actualMapping->appointment_id === $failedAppointment->id)
            ->andReturnUsing(function (GoogleCalendarConnection $actualConnection, AppointmentGoogleCalendarEvent $actualMapping): bool {
                $actualMapping->update([
                    'status' => 'synced',
                    'last_sync_error' => null,
                    'last_synced_at' => now(),
                ]);

                return true;
            });
        $this->app->instance(GoogleCalendarSyncService::class, $syncService);

        $this->actingAs($owner, 'sanctum')
            ->postJson('/api/google-calendar/sync/retry')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('synced', 1)
            ->assertJsonPath('failed', 0);
    }

    public function test_sync_status_contains_only_the_authenticated_users_records(): void
    {
        [$owner, $failedAppointment] = $this->makeAppointment();
        [, $otherAppointment] = $this->makeAppointment();
        AppointmentGoogleCalendarEvent::create([
            'user_id' => $owner->id,
            'appointment_id' => $failedAppointment->id,
            'google_calendar_id' => 'primary',
            'google_event_id' => 'failed-event-id',
            'status' => 'failed',
            'last_sync_error' => 'Retry this event.',
        ]);
        AppointmentGoogleCalendarEvent::create([
            'user_id' => User::where('id', '!=', $owner->id)->firstOrFail()->id,
            'appointment_id' => $otherAppointment->id,
            'google_calendar_id' => 'primary',
            'google_event_id' => 'other-user-event-id',
            'status' => 'failed',
            'last_sync_error' => 'Do not expose another user event.',
        ]);

        $this->actingAs($owner, 'sanctum')
            ->getJson('/api/google-calendar/sync/status')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('failed', 1)
            ->assertJsonPath('pending', 0)
            ->assertJsonCount(1, 'failures')
            ->assertJsonPath('failures.0.appointment_id', $failedAppointment->id)
            ->assertJsonPath('failures.0.error', 'Retry this event.');
    }

    private function makeAppointmentWithConnection(): array
    {
        [$user, $appointment] = $this->makeAppointment();
        $connection = GoogleCalendarConnection::create([
            'user_id' => $user->id,
            'google_account_id' => 'google-account-'.$user->id,
            'google_email' => 'calendar@example.com',
            'refresh_token' => 'stored-refresh-token',
            'status' => 'connected',
        ]);

        return [$user, $appointment, $connection];
    }

    private function makeGoogleClientMock(?GoogleServiceException $exception): GoogleClient
    {
        $client = Mockery::mock(GoogleClient::class);
        $client->shouldIgnoreMissing();
        $logger = Mockery::mock();
        $logger->shouldIgnoreMissing();
        $client->shouldReceive('getLogger')->andReturn($logger);
        $client->shouldReceive('setClientId')->once();
        $client->shouldReceive('setClientSecret')->once();
        $client->shouldReceive('setAccessToken')->twice();
        $client->shouldReceive('fetchAccessTokenWithRefreshToken')
            ->once()
            ->andReturn(['access_token' => 'test-access-token']);

        if ($exception) {
            $client->shouldReceive('execute')->once()->andThrow($exception);
        } else {
            $client->shouldReceive('execute')->once()->andReturn(null);
        }

        return $client;
    }

    private function makeAppointment(?User $user = null): array
    {
        $user ??= User::factory()->create();
        $patient = $user->patients()->create([
            'first_name' => 'Private Patient',
            'last_name' => 'Example',
            'notes' => 'clinical note',
        ]);
        $caseType = CaseType::create(['name' => 'Test case '.uniqid()]);
        $patientCase = PatientCase::create([
            'patient_id' => $patient->id,
            'case_type_id' => $caseType->id,
            'details' => 'private case detail',
        ]);
        $appointment = Appointment::create([
            'patient_case_id' => $patientCase->id,
            'appointment_date' => '2026-11-24',
            'start_time' => '09:30',
            'end_time' => '10:15',
            'status' => 'scheduled',
            'notes' => 'clinical note',
        ]);

        return [$user, $appointment];
    }
}
