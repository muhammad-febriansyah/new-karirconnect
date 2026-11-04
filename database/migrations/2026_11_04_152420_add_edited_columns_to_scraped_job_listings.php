<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A listing an admin edited keeps the admin's content: later crawls only
     * update when it was last seen.
     */
    public function up(): void
    {
        Schema::table('scraped_job_listings', function (Blueprint $table): void {
            $table->timestamp('edited_at')->nullable()->after('last_seen_at');
            $table->foreignId('edited_by_user_id')->nullable()->after('edited_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('scraped_job_listings', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('edited_by_user_id');
            $table->dropColumn('edited_at');
        });
    }
};
