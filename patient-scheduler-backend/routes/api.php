<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseTypeController;
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
});
