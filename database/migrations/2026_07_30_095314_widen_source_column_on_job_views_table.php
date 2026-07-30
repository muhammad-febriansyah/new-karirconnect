<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The column stores the raw HTTP referer, which on a filtered job search is
     * a full URL carrying every filter as a query parameter. Those routinely
     * pass 64 characters, and the insert then failed with SQLSTATE 22001,
     * turning an ordinary job page view into a 500 for the visitor.
     */
    public function up(): void
    {
        Schema::table('job_views', function (Blueprint $table): void {
            $table->string('source', 512)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('job_views', function (Blueprint $table): void {
            $table->string('source', 64)->nullable()->change();
        });
    }
};
