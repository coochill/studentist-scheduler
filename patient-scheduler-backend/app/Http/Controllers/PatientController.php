<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $patients = Patient::query()
            ->with('patientCases.caseType', 'patientCases.tasks')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json($patients);
    }

    public function store(Request $request): JsonResponse
    {
        $patient = Patient::create($this->validatedData($request));

        return response()->json($patient->load('patientCases.caseType', 'patientCases.tasks'), 201);
    }

    public function show(Patient $patient): JsonResponse
    {
        return response()->json($patient->load('patientCases.caseType.checklistItems', 'patientCases.images', 'patientCases.tasks', 'patientCases.appointments.patientCase.caseType'));
    }

    public function update(Request $request, Patient $patient): JsonResponse
    {
        $patient->update($this->validatedData($request));

        return response()->json($patient->fresh()->load('patientCases.caseType', 'patientCases.tasks'));
    }

    public function destroy(Patient $patient): JsonResponse
    {
        $patient->delete();

        return response()->json(null, 204);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['nullable', 'date'],
            'address' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);
    }
}
