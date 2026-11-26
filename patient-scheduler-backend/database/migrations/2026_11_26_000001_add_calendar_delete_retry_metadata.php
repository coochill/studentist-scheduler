<?php

use App\Models\Appointment;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_google_calendar_events', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->unsignedBigInteger('deleted_appointment_id')->nullable()->after('appointment_id');
            $table->string('sync_action')->default('upsert')->after('status');
            $table->index(['user_id', 'status', 'deleted_appointment_id'], 'calendar_retry_owner_idx');
            $table->foreignId('appointment_id')->nullable()->change();
            $table->foreign('appointment_id')->references('id')->on('appointments')->nullOnDelete();
        });

        Appointment::query()
            ->with('patientCase.patient')
            ->whereHas('googleCalendarEvent', fn ($query) => $query->whereNull('user_id'))
            ->chunkById(100, function ($appointments): void {
                foreach ($appointments as $appointment) {
                    $userId = $appointment->patientCase?->patient?->user_id;
                    if ($userId !== null) {
                        $appointment->googleCalendarEvent()->update(['user_id' => $userId]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('appointment_google_calendar_events', function (Blueprint $table) {
            $table->dropForeign(['appointment_id']);
            $table->dropForeign(['user_id']);
            $table->dropIndex('calendar_retry_owner_idx');
            $table->dropColumn(['user_id', 'deleted_appointment_id', 'sync_action']);
            $table->foreignId('appointment_id')->nullable(false)->change();
            $table->foreign('appointment_id')->references('id')->on('appointments')->cascadeOnDelete();
        });
    }
};
