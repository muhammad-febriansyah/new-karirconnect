<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('talent_search_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->json('filters')->nullable();
            $table->unsignedInteger('result_count')->default(0);
            $table->timestamp('searched_at')->useCurrent();
            $table->timestamps();

            $table->index(['company_id', 'searched_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('talent_search_logs');
    }
};
