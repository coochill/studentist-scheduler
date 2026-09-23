<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\PatientCaseTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AppointmentController extends Controller
{
    private const WITH = [
        'patientCase.patient',
        'patientCase.caseType',
        'tasks',
    ];

    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->with(self::WITH)
            ->when($request->filled('date'), fn ($query) => $query->whereDate('appointment_date', $request->date('date')))
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn ($query) => $query->whereDate('appointment_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->whereDate('appointment_date', '<=', $request->date('to')))
            ->orderBy('appointment_date')
            ->orderBy('start_time')
            ->get();

        return response()->json($appointments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);
        $tasks = $this->resolveTasks($validated['task_ids']);
        $patientCaseId = $tasks->first()->patient_case_id;

        $this->ensureNoConflict($validated);

        $appointment = Appointment::create([
            'patient_case_id' => $patientCaseId,
            'appointment_date' => $validated['appointment_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'status' => $validated['status'] ?? 'scheduled',
            'notes' => $validated['notes'] ?? null,
        ]);

        $appointment->tasks()->sync($tasks->pluck('id'));
        $this->syncTaskStatuses($tasks->pluck('id'));

        return response()->json($appointment->load(self::WITH), 201);
    }

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json($appointment->load(self::WITH));
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $this->validatedData($request);
        $tasks = $this->resolveTasks($validated['task_ids']);
        $patientCaseId = $tasks->first()->patient_case_id;
        $previousTaskIds = $appointment->tasks()->pluck('patient_case_tasks.id');

        $this->ensureNoConflict($validated, $appointment);

        $appointment->update([
            'patient_case_id' => $patientCaseId,
            'appointment_date' => $validated['appointment_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'status' => $validated['status'] ?? $appointment->status,
            'notes' => $validated['notes'] ?? null,
        ]);

        $appointment->tasks()->sync($tasks->pluck('id'));
        // Recalculate both the tasks now linked and any tasks that were
        // unlinked by this edit, since either change can affect status.
        $this->syncTaskStatuses($previousTaskIds->merge($tasks->pluck('id'))->unique());

        return response()->json($appointment->fresh()->load(self::WITH));
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $taskIds = $appointment->tasks()->pluck('patient_case_tasks.id');

        $appointment->delete();

        $this->syncTaskStatuses($taskIds);

        return response()->json(null, 204);
    }

    /**
     * Recalculate status (and derived dates) for each given task, based on
     * its currently linked appointments. A task is "completed" once any
     * linked appointment is completed, "in_progress" once it has any
     * non-cancelled appointment, and otherwise falls back to "pending".
     * This is the sole way task status changes now — there is no manual
     * edit path from the patient-details checklist anymore.
     */
    private function syncTaskStatuses(Collection $taskIds): void
    {
        if ($taskIds->isEmpty()) {
            return;
        }

        PatientCaseTask::query()->whereIn('id', $taskIds)->get()->each(function (PatientCaseTask $task) {
            $appointments = $task->appointments()->get();

            $completed = $appointments->first(fn ($appointment) => $appointment->status === 'completed');
            if ($completed) {
                $task->update([
                    'status' => 'completed',
                    'start_date' => $task->start_date ?? $completed->appointment_date->format('Y-m-d'),
                    'completed_date' => $completed->appointment_date->format('Y-m-d'),
                ]);
                return;
            }

            $active = $appointments->first(fn ($appointment) => $appointment->status !== 'cancelled');
            if ($active) {
                $task->update([
                    'status' => 'in_progress',
                    'start_date' => $task->start_date ?? $active->appointment_date->format('Y-m-d'),
                    'completed_date' => null,
                ]);
                return;
            }

            $task->update([
                'status' => 'pending',
                'completed_date' => null,
            ]);
        });
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'task_ids' => ['required', 'array', 'min:1'],
            'task_ids.*' => ['integer', 'exists:patient_case_tasks,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'status' => ['sometimes', 'string', Rule::in(['scheduled', 'confirmed', 'completed', 'cancelled'])],
            'notes' => ['nullable', 'string'],
        ]);
    }

    /**
     * Load the selected tasks and make sure they all belong to the same
     * patient case, since an appointment still carries a single
     * patient_case_id even though it can now cover several tasks.
     */
    private function resolveTasks(array $taskIds): Collection
    {
        $tasks = PatientCaseTask::query()->whereIn('id', $taskIds)->get();

        if ($tasks->pluck('patient_case_id')->unique()->count() > 1) {
            throw ValidationException::withMessages([
                'task_ids' => 'All selected tasks must belong to the same patient case.',
            ]);
        }

        return $tasks;
    }

    private function ensureNoConflict(array $validated, ?Appointment $appointment = null): void
    {
        $conflict = Appointment::query()
            ->where('appointment_date', $validated['appointment_date'])
            ->where('status', '!=', 'cancelled')
            ->when($appointment, fn ($query) => $query->whereKeyNot($appointment->getKey()))
            ->where('start_time', '<', $validated['end_time'])
            ->where('end_time', '>', $validated['start_time'])
            ->exists();

        if ($conflict) {
            abort(response()->json([
                'message' => 'The appointment time overlaps an existing appointment.',
            ], 409));
        }
    }
}