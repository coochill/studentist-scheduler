<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseTypeController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\PatientCaseController;
use App\Http\Controllers\PatientCaseTaskController;
use App\Http\Controllers\PatientController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::apiResource('case-types', CaseTypeController::class);
    Route::apiResource('patients', PatientController::class);
    Route::apiResource('patient-cases', PatientCaseController::class);
    Route::apiResource('patient-case-tasks', PatientCaseTaskController::class)->only(['index', 'update']);
    Route::apiResource('appointments', AppointmentController::class);
    Route::get('/google-calendar/status', [GoogleCalendarController::class, 'status']);
    Route::post('/google-calendar/connect', [GoogleCalendarController::class, 'connect']);
    Route::delete('/google-calendar/disconnect', [GoogleCalendarController::class, 'disconnect']);
    Route::get('/google-calendar/sync/status', [GoogleCalendarController::class, 'syncStatus'])
        ->middleware('throttle:30,1');
    Route::post('/google-calendar/sync', [GoogleCalendarController::class, 'sync'])
        ->middleware('throttle:5,1');
    Route::post('/google-calendar/sync/retry', [GoogleCalendarController::class, 'retry'])
        ->middleware('throttle:5,1');
});
