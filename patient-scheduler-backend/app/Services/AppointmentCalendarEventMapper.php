<?php

namespace App\Services;

use App\Models\Appointment;
use Google\Service\Calendar\Event;
use Illuminate\Support\Carbon;

class AppointmentCalendarEventMapper
{
    public function map(Appointment $appointment, int $userId): Event
    {
        $timezone = (string) config('app.timezone', 'UTC');
        $date = $appointment->appointment_date->format('Y-m-d');
        $start = Carbon::createFromFormat('Y-m-d H:i:s', $date.' '.$appointment->start_time->format('H:i:s'), $timezone);
        $end = Carbon::createFromFormat('Y-m-d H:i:s', $date.' '.$appointment->end_time->format('H:i:s'), $timezone);

        return new Event([
            'id' => $this->eventId($appointment, $userId),
            'summary' => 'SchedPx Appointment',
            'start' => [
                'dateTime' => $start->toRfc3339String(),
                'timeZone' => $timezone,
            ],
            'end' => [
                'dateTime' => $end->toRfc3339String(),
                'timeZone' => $timezone,
            ],
        ]);
    }

    public function eventId(Appointment $appointment, int $userId): string
    {
        return 'schedpvu'.$userId.'a'.$appointment->getKey();
    }
}
