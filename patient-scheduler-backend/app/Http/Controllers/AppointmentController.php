<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $appointments = Appointment::query()
            ->with('patientCase.patient', 'patientCase.caseType')
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
        $this->ensureNoConflict($validated);

        return response()->json(
            Appointment::create($validated)->load('patientCase.patient', 'patientCase.caseType'),
            201,
        );
    }

    public function show(Appointment $appointment): JsonResponse
    {
        return response()->json($appointment->load('patientCase.patient', 'patientCase.caseType'));
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        $validated = $this->validatedData($request);
        $this->ensureNoConflict($validated, $appointment);

        $appointment->update($validated);

        return response()->json($appointment->fresh()->load('patientCase.patient', 'patientCase.caseType'));
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $appointment->delete();

        return response()->json(null, 204);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'patient_case_id' => ['required', 'integer', 'exists:patient_cases,id'],
            'appointment_date' => ['required', 'date_format:Y-m-d'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'status' => ['sometimes', 'string', Rule::in(['scheduled', 'confirmed', 'completed', 'cancelled'])],
            'notes' => ['nullable', 'string'],
        ]);
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
