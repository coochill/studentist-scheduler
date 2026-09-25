<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // Conflict check: WHERE appointment_date = ? AND status != 'cancelled'
            //   AND start_time < ? AND end_time > ?
            $table->index(['appointment_date', 'start_time', 'end_time'], 'appointments_conflict_idx');
            // Filtering
            $table->index('status');
        });

        Schema::table('patient_case_tasks', function (Blueprint $table) {
            // Filtering / status recalculation
            $table->index(['patient_case_id', 'status'], 'patient_case_tasks_case_status_idx');
        });

        Schema::table('case_type_checklist_items', function (Blueprint $table) {
            // Ordered eager-load
            $table->index(['case_type_id', 'sort_order'], 'case_type_checklist_items_order_idx');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_conflict_idx');
            $table->dropIndex(['status']);
        });

        Schema::table('patient_case_tasks', function (Blueprint $table) {
            $table->dropIndex('patient_case_tasks_case_status_idx');
        });

        Schema::table('case_type_checklist_items', function (Blueprint $table) {
            $table->dropIndex('case_type_checklist_items_order_idx');
        });
    }
};