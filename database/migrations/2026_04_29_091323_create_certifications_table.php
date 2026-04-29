<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certifications', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('employee_profile_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('issuer');
            $table->string('credential_id')->nullable();
            $table->string('credential_url')->nullable();
            $table->date('issued_date')->nullable();
            $table->date('expires_date')->nullable();
            $table->timestamps();

            $table->index('employee_profile_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certifications');
    }
};
