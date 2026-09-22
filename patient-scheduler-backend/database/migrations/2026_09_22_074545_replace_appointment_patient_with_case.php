<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('appointments', 'patient_id')) {
            return;
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('patient_case_id')->nullable()->after('id')->constrained('patient_cases')->cascadeOnDelete();
        });

        $legacyCaseTypeId = DB::table('case_types')->where('name', 'Unassigned Legacy Case')->value('id');

        if (! $legacyCaseTypeId && DB::table('appointments')->exists()) {
            $legacyCaseTypeId = DB::table('case_types')->insertGetId([
                'name' => 'Unassigned Legacy Case',
                'description' => 'Created during migration for appointments that did not have a patient case.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (DB::table('appointments')->whereNotNull('patient_id')->select('id', 'patient_id')->get() as $appointment) {
            $patientCaseId = DB::table('patient_cases')
                ->where('patient_id', $appointment->patient_id)
                ->where('case_type_id', $legacyCaseTypeId)
                ->value('id');

            if (! $patientCaseId) {
                $patientCaseId = DB::table('patient_cases')->insertGetId([
                    'patient_id' => $appointment->patient_id,
                    'case_type_id' => $legacyCaseTypeId,
                    'details' => 'Imported from an appointment created before patient cases were introduced.',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            DB::table('appointments')->where('id', $appointment->id)->update(['patient_case_id' => $patientCaseId]);
        }

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['patient_id']);
            $table->dropColumn('patient_id');
            $table->foreignId('patient_case_id')->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->foreignId('patient_id')->nullable()->after('id')->constrained('patients')->cascadeOnDelete();
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropForeign(['patient_case_id']);
            $table->dropColumn('patient_case_id');
            $table->foreignId('patient_id')->nullable(false)->change();
        });
    }
};
