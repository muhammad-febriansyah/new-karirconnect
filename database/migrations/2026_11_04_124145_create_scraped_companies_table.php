<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('scraped_companies', function (Blueprint $table): void {
            $table->id();
            // Profile fields mirror `companies` so a scraped employer can later
            // be linked to (or turned into) a real company without remapping.
            $table->string('name', 191);
            $table->string('normalized_name', 191);
            $table->string('domain', 191)->default('');
            $table->string('tagline', 255)->nullable();
            $table->string('logo_url', 2048)->nullable();
            $table->string('logo_path')->nullable();
            $table->string('cover_url', 2048)->nullable();
            $table->string('cover_path')->nullable();
            $table->string('website', 2048)->nullable();
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
            $table->string('profile_source_url', 2048)->nullable();
            $table->timestamp('profile_fetched_at')->nullable();
            $table->timestamp('logo_fetched_at')->nullable();
            $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->unique(['normalized_name', 'domain']);
            $table->index('company_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scraped_companies');
    }
};
