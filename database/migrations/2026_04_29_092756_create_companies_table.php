<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tagline', 255)->nullable();
            $table->string('logo_path')->nullable();
            $table->string('cover_path')->nullable();
            $table->string('website')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->foreignId('industry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('company_size_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('founded_year')->nullable();
            $table->foreignId('province_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('city_id')->nullable()->constrained()->nullOnDelete();
            $table->text('address')->nullable();
            $table->longText('about')->nullable();
            $table->longText('culture')->nullable();
            $table->longText('benefits')->nullable();
            $table->string('status', 16)->default('pending')->index();
            $table->string('verification_status', 16)->default('unverified')->index();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'verification_status']);
            $table->index('city_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
