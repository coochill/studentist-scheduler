<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('appointment_google_calendar_events')) {
            Schema::table('appointment_google_calendar_events', function (Blueprint $table) {
                $table->unique(['google_calendar_id', 'google_event_id'], 'calendar_event_unique');
                $table->index(['status', 'last_synced_at'], 'calendar_sync_status_index');
            });

            return;
        }

        Schema::create('appointment_google_calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('google_calendar_id')->default('primary');
            $table->string('google_event_id');
            $table->string('status')->default('pending');
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_sync_error')->nullable();
            $table->timestamps();

            $table->unique(['google_calendar_id', 'google_event_id'], 'calendar_event_unique');
            $table->index(['status', 'last_synced_at'], 'calendar_sync_status_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_google_calendar_events');
    }
};
