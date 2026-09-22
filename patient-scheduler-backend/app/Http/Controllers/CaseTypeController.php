<?php

namespace App\Http\Controllers;

use App\Models\CaseType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CaseTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(CaseType::query()->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:case_types,name'],
            'description' => ['nullable', 'string'],
        ]);

        return response()->json(CaseType::create($validated), 201);
    }

    public function show(CaseType $caseType): JsonResponse
    {
        return response()->json($caseType);
    }

    public function update(Request $request, CaseType $caseType): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('case_types', 'name')->ignore($caseType)],
            'description' => ['nullable', 'string'],
        ]);

        $caseType->update($validated);

        return response()->json($caseType->fresh());
    }

    public function destroy(CaseType $caseType): JsonResponse
    {
        if ($caseType->patientCases()->exists()) {
            return response()->json([
                'message' => 'This case type cannot be deleted while patient cases use it.',
            ], 409);
        }

        $caseType->delete();

        return response()->json(null, 204);
    }
}
