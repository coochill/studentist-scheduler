<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    public function up(): void
    {
        $email = strtolower(trim((string) env('AUTH_USER_EMAIL')));
        $password = (string) env('AUTH_USER_PASSWORD');

        if ($email === '' || $password === '') {
            return;
        }

        DB::table('users')->updateOrInsert(
            ['email' => $email],
            [
                'name' => env('AUTH_USER_NAME', 'Studentist Administrator'),
                'password' => Hash::make($password),
                'email_verified_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        $email = strtolower(trim((string) env('AUTH_USER_EMAIL')));

        if ($email !== '') {
            DB::table('users')->where('email', $email)->delete();
        }
    }
};
