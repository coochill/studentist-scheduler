<?php

namespace App\Http\Controllers;

use App\Models\CaseType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CaseTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(CaseType::query()->with('checklistItems')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatedData($request);

        $caseType = DB::transaction(function () use ($validated) {
            $items = $validated['checklist_items'] ?? [];
            unset($validated['checklist_items']);
            $caseType = CaseType::create($validated);
            $caseType->checklistItems()->createMany($this->checklistRows($items));

            return $caseType;
        });

        return response()->json($caseType->load('checklistItems'), 201);
    }

    public function show(CaseType $caseType): JsonResponse
    {
        return response()->json($caseType->load('checklistItems'));
    }

    public function update(Request $request, CaseType $caseType): JsonResponse
    {
        $validated = $this->validatedData($request, $caseType);

        DB::transaction(function () use ($validated, $caseType) {
            $items = $validated['checklist_items'] ?? null;
            unset($validated['checklist_items']);
            $caseType->update($validated);
            if ($items !== null) {
                $caseType->checklistItems()->delete();
                $caseType->checklistItems()->createMany($this->checklistRows($items));
                $caseType->load('checklistItems');
                $caseType->patientCases()->with('tasks')->get()->each(function ($patientCase) use ($caseType): void {
                    $existingTitles = $patientCase->tasks->pluck('title')->all();
                    $patientCase->tasks()->createMany($caseType->checklistItems
                        ->reject(fn ($item) => in_array($item->title, $existingTitles, true))
                        ->map(fn ($item) => [
                            'case_type_checklist_item_id' => $item->id,
                            'title' => $item->title,
                            'status' => 'pending',
                        ])->all());
                });
            }
        });

        return response()->json($caseType->fresh()->load('checklistItems'));
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

    private function validatedData(Request $request, ?CaseType $caseType = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('case_types', 'name')->ignore($caseType)],
            'description' => ['nullable', 'string'],
            'checklist_items' => ['sometimes', 'array'],
            'checklist_items.*' => ['string', 'max:255'],
        ]);
    }

    private function checklistRows(array $items): array
    {
        return collect($items)
            ->map(fn (string $title, int $index): array => ['title' => trim($title), 'sort_order' => $index])
            ->filter(fn (array $item): bool => $item['title'] !== '')
            ->values()
            ->all();
    }
}
