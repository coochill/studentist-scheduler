<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PatientCaseTask extends Model
{
    protected $fillable = [
        'patient_case_id',
        'case_type_checklist_item_id',
        'title',
        'start_date',
        'expected_end_date',
        'completed_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'expected_end_date' => 'date:Y-m-d',
            'completed_date' => 'date:Y-m-d',
        ];
    }

    public function patientCase(): BelongsTo
    {
        return $this->belongsTo(PatientCase::class);
    }

    public function checklistItem(): BelongsTo
    {
        return $this->belongsTo(CaseTypeChecklistItem::class, 'case_type_checklist_item_id');
    }
}
