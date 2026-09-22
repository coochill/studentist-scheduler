<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    protected $fillable = [
        'patient_case_id',
        'appointment_date',
        'start_time',
        'end_time',
        'status',
        'notes',
    ];

    public function patientCase(): BelongsTo
    {
        return $this->belongsTo(PatientCase::class);
    }
}
