<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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

    /**
     * can_complete is computed (not stored) so the frontend always knows
     * whether the "mark complete" checkbox should be enabled.
     */
    protected $appends = ['can_complete'];

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

    public function appointments(): BelongsToMany
    {
        return $this->belongsToMany(Appointment::class, 'appointment_task', 'patient_case_task_id', 'appointment_id')
            ->withTimestamps();
    }

    public function hasCompletedAppointment(): bool
    {
        if ($this->relationLoaded('appointments')) {
            return $this->appointments->contains(fn (Appointment $appointment) => $appointment->status === 'completed');
        }

        return $this->appointments()->where('status', 'completed')->exists();
    }

    public function getCanCompleteAttribute(): bool
    {
        return $this->hasCompletedAppointment();
    }
}