<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatientCase extends Model
{
    protected $fillable = ['patient_id', 'case_type_id', 'details'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function caseType(): BelongsTo
    {
        return $this->belongsTo(CaseType::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(CaseImage::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(PatientCaseTask::class);
    }
}
