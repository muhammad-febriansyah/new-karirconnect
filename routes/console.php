<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('alerts:dispatch')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer()
    ->name('alerts:dispatch');

Schedule::command('notifications:send-interview-reminders')
    ->everyFifteenMinutes()
    ->withoutOverlapping()
    ->onOneServer()
    ->name('notifications:send-interview-reminders');

Schedule::command('notifications:notify-expiring-subscriptions')
    ->dailyAt('09:00')
    ->withoutOverlapping()
    ->onOneServer()
    ->name('notifications:notify-expiring-subscriptions');
