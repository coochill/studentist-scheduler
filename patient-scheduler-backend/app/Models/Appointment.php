<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date:Y-m-d',
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
        ];
    }

    public function patientCase(): BelongsTo
    {
        return $this->belongsTo(PatientCase::class);
    }

    /**
     * The one or more checklist tasks this appointment was booked for.
     * All tasks on a given appointment must belong to the same
     * patient_case (enforced in AppointmentController), since the
     * appointment still carries a single patient_case_id.
     */
    public function tasks(): BelongsToMany
    {
        return $this->belongsToMany(PatientCaseTask::class, 'appointment_task', 'appointment_id', 'patient_case_task_id')
            ->withTimestamps();
    }
}