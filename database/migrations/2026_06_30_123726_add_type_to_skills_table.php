<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('skills', function (Blueprint $table): void {
            // Top-level grouping for the recruiter skill picker: soft vs hard.
            // `category` holds the sub-group (e.g. "Komunikasi & Kolaborasi").
            $table->string('type')->default('hard')->after('slug')->index();
        });
    }

    public function down(): void
    {
        Schema::table('skills', function (Blueprint $table): void {
            $table->dropColumn('type');
        });
    }
};
