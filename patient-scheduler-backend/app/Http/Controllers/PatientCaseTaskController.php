<?php

namespace App\Http\Controllers;

use App\Models\PatientCaseTask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientCaseTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            PatientCaseTask::query()
                ->with('patientCase.patient', 'patientCase.caseType')
                ->when($request->filled('patient_case_id'), fn ($query) => $query->where('patient_case_id', $request->integer('patient_case_id')))
                ->orderBy('id')
                ->get(),
        );
    }

    public function update(Request $request, PatientCaseTask $patientCaseTask): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'expected_end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'completed_date' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['required', 'string', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        $patientCaseTask->update($validated);

        return response()->json($patientCaseTask->fresh()->load('checklistItem'));
    }
}
