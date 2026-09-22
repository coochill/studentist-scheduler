<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CaseTypeChecklistItem extends Model
{
    protected $fillable = ['case_type_id', 'title', 'sort_order'];

    public function caseType(): BelongsTo
    {
        return $this->belongsTo(CaseType::class);
    }

    public function patientCaseTasks(): HasMany
    {
        return $this->hasMany(PatientCaseTask::class);
    }
}
