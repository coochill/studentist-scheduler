<?php

use App\Http\Controllers\GoogleCalendarController;
use Illuminate\Support\Facades\Route;

Route::get('/oauth/google-calendar/callback', [GoogleCalendarController::class, 'callback'])
    ->name('google-calendar.callback');
