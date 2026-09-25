<?php

namespace App\Http\Controllers;

use App\Models\PatientCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PatientCaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $patientCases = PatientCase::query()
            ->with('patient', 'caseType', 'images', 'tasks')   // ← add 'tasks'
            ->when($request->filled('patient_id'), fn ($query) => $query->where('patient_id', $request->integer('patient_id')))
            ->when($request->filled('case_type_id'), fn ($query) => $query->where('case_type_id', $request->integer('case_type_id')))
            ->latest()
            ->get();

        return response()->json($patientCases);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);

        $patientCase = DB::transaction(function () use ($validated) {
            $imagePaths = $validated['image_paths'] ?? [];
            unset($validated['image_paths']);

            $patientCase = PatientCase::create($validated);
            $patientCase->images()->createMany(array_map(
                fn (string $imagePath): array => ['image_path' => $imagePath],
                $imagePaths,
            ));

            $patientCase->load('caseType.checklistItems');
            $patientCase->tasks()->createMany($patientCase->caseType->checklistItems->map(fn ($item) => [
                'case_type_checklist_item_id' => $item->id,
                'title' => $item->title,
                'status' => 'pending',
            ])->all());

            return $patientCase;
        });

        return response()->json($patientCase->load('patient', 'caseType', 'images', 'tasks'), 201);
    }

    public function show(PatientCase $patientCase): JsonResponse
    {
        return response()->json($patientCase->load('patient', 'caseType', 'images', 'tasks', 'appointments'));
    }

    public function update(Request $request, PatientCase $patientCase): JsonResponse
    {
        $validated = $this->validatedData($request);

        $patientCase = DB::transaction(function () use ($validated, $patientCase) {
            $imagePaths = $validated['image_paths'] ?? null;
            unset($validated['image_paths']);

            $patientCase->update($validated);

            if ($patientCase->wasChanged('case_type_id')) {
                $patientCase->tasks()->delete();
                $patientCase->load('caseType.checklistItems');
                $patientCase->tasks()->createMany($patientCase->caseType->checklistItems->map(fn ($item) => [
                    'case_type_checklist_item_id' => $item->id,
                    'title' => $item->title,
                    'status' => 'pending',
                ])->all());
            }

            if ($imagePaths !== null) {
                $patientCase->images()->delete();
                $patientCase->images()->createMany(array_map(
                    fn (string $imagePath): array => ['image_path' => $imagePath],
                    $imagePaths,
                ));
            }

            return $patientCase->fresh();
        });

        return response()->json($patientCase->load('patient', 'caseType', 'images', 'tasks'));
    }

    public function destroy(PatientCase $patientCase): JsonResponse
    {
        $patientCase->delete();

        return response()->json(null, 204);
    }

    private function validatedData(Request $request): array
    {
        return $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'case_type_id' => ['required', 'integer', 'exists:case_types,id'],
            'details' => ['nullable', 'string'],
            'image_paths' => ['sometimes', 'array'],
            'image_paths.*' => ['string', 'max:2048'],
        ]);
    }
}
