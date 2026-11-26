<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentGoogleCalendarEvent extends Model
{
    protected $fillable = [
        'user_id',
        'appointment_id',
        'deleted_appointment_id',
        'google_calendar_id',
        'google_event_id',
        'status',
        'sync_action',
        'last_synced_at',
        'last_sync_error',
    ];

    protected function casts(): array
    {
        return [
            'last_synced_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }
}
