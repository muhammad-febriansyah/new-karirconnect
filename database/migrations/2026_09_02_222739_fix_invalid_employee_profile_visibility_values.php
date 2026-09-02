<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * `employee_profiles.visibility` was seeded with a legacy 'employers'
     * value that isn't one of the app's valid options (public,
     * recruiter_only, private). Any profile stuck on it renders a blank
     * "Visibilitas" select on the edit form and cannot be saved without
     * first re-picking a value. Backfill it to its closest current
     * equivalent, 'recruiter_only'.
     */
    public function up(): void
    {
        DB::table('employee_profiles')
            ->where('visibility', 'employers')
            ->update(['visibility' => 'recruiter_only']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not reversible: the original 'employers' value is not a value
        // the application accepts, so there is nothing safe to roll back to.
    }
};
