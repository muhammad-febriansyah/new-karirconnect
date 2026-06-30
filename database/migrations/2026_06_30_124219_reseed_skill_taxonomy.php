<?php

use Database\Seeders\LookupSeeder;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Apply the new soft/hard skill taxonomy on deploy. LookupSeeder upserts the
     * canonical lookup data (idempotent) and prunes skills outside the taxonomy,
     * so old tech-only skills are replaced by the grouped recruiter list.
     */
    public function up(): void
    {
        (new LookupSeeder)->run();
    }

    public function down(): void
    {
        // Data migration — no structural rollback.
    }
};
