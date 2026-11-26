<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\CaseType;
use App\Models\GoogleCalendarConnection;
use App\Models\PatientCase;
use App\Models\PatientCaseTask;
use App\Models\User;
use App\Services\GoogleCalendarSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class AppointmentCalendarLifecycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_and_update_succeed_when_google_synchronization_fails(): void
    {
        [$user, $task] = $this->makeTask();
        $this->makeConnection($user);
        $syncService = Mockery::mock(GoogleCalendarSyncService::class);
        $syncService->shouldReceive('syncAppointment')->twice()->andReturn(false);
        $this->app->instance(GoogleCalendarSyncService::class, $syncService);
        $this->actingAs($user, 'sanctum');

        $created = $this->postJson('/api/appointments', $this->payload($task->id))
            ->assertCreated()
            ->assertJsonPath('appointment_date', '2026-12-01')
            ->json();

        $this->putJson('/api/appointments/'.$created['id'], $this->payload($task->id, '2026-12-02'))
            ->assertOk()
            ->assertJsonPath('appointment_date', '2026-12-02');

        $this->assertDatabaseHas('appointments', [
            'id' => $created['id'],
            'appointment_date' => '2026-12-02',
        ]);
    }

    public function test_disconnected_google_calendar_does_not_change_appointment_crud(): void
    {
        [$user, $task] = $this->makeTask();
        $syncService = Mockery::mock(GoogleCalendarSyncService::class);
        $syncService->shouldNotReceive('syncAppointment');
        $syncService->shouldReceive('deleteAppointment')->once()->andReturn(false);
        $this->app->instance(GoogleCalendarSyncService::class, $syncService);
        $this->actingAs($user, 'sanctum');

        $appointment = $this->postJson('/api/appointments', $this->payload($task->id))
            ->assertCreated()
            ->json();

        $this->deleteJson('/api/appointments/'.$appointment['id'])->assertNoContent();
        $this->assertDatabaseMissing('appointments', ['id' => $appointment['id']]);
    }

    public function test_appointment_reads_and_mutations_are_scoped_to_the_owner(): void
    {
        [$owner, $task, $appointment] = $this->makeTaskWithAppointment();
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser, 'sanctum')
            ->getJson('/api/appointments/'.$appointment->id)
            ->assertNotFound();

        $this->putJson('/api/appointments/'.$appointment->id, $this->payload($task->id, '2026-12-02'))
            ->assertNotFound();

        $this->deleteJson('/api/appointments/'.$appointment->id)->assertNotFound();

        $this->assertDatabaseHas('appointments', ['id' => $appointment->id]);
    }

    public function test_foreign_patient_tasks_cannot_be_used_to_create_appointments(): void
    {
        [, $foreignTask] = $this->makeTask();
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/appointments', $this->payload($foreignTask->id))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('task_ids');

        $this->assertDatabaseCount('appointments', 0);
    }

    private function makeTaskWithAppointment(): array
    {
        [$user, $task] = $this->makeTask();
        $patientCase = $task->patientCase;
        $appointment = Appointment::create([
            'patient_case_id' => $patientCase->id,
            'appointment_date' => '2026-12-01',
            'start_time' => '09:30',
            'end_time' => '10:15',
            'status' => 'scheduled',
        ]);
        $appointment->tasks()->attach($task->id);

        return [$user, $task, $appointment];
    }

    private function makeTask(): array
    {
        $user = User::factory()->create();
        $patient = $user->patients()->create([
            'first_name' => 'Test',
            'last_name' => 'Patient',
        ]);
        $caseType = CaseType::create(['name' => 'Type '.uniqid()]);
        $patientCase = PatientCase::create([
            'patient_id' => $patient->id,
            'case_type_id' => $caseType->id,
        ]);
        $task = PatientCaseTask::create([
            'patient_case_id' => $patientCase->id,
            'title' => 'Consultation',
            'status' => 'pending',
        ]);

        return [$user, $task];
    }

    private function makeConnection(User $user): GoogleCalendarConnection
    {
        return GoogleCalendarConnection::create([
            'user_id' => $user->id,
            'google_account_id' => 'account-'.$user->id,
            'google_email' => 'user@example.com',
            'refresh_token' => 'encrypted-refresh-token',
            'status' => 'connected',
        ]);
    }

    private function payload(int $taskId, string $date = '2026-12-01'): array
    {
        return [
            'task_ids' => [$taskId],
            'appointment_date' => $date,
            'start_time' => '09:30',
            'end_time' => '10:15',
            'status' => 'scheduled',
            'notes' => null,
        ];
    }
}
