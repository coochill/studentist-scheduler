<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CaseImage extends Model
{
    protected $fillable = ['patient_case_id', 'image_path'];

    public function patientCase(): BelongsTo
    {
        return $this->belongsTo(PatientCase::class);
    }
}
