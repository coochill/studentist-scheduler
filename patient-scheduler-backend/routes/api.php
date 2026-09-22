<?php

use App\Http\Controllers\CaseTypeController;
use App\Http\Controllers\PatientController;
use Illuminate\Support\Facades\Route;

Route::apiResource('case-types', CaseTypeController::class);
Route::apiResource('patients', PatientController::class);
