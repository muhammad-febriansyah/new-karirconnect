<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('feature', 32);
            $table->string('provider', 32);
            $table->string('model', 64);
            $table->unsignedInteger('prompt_tokens')->nullable();
            $table->unsignedInteger('completion_tokens')->nullable();
            $table->decimal('total_cost_usd', 10, 6)->nullable();
            $table->json('input_json')->nullable();
            $table->json('output_json')->nullable();
            $table->unsignedInteger('latency_ms')->nullable();
            $table->string('status', 16)->default('success');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['feature', 'created_at']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_audit_logs');
    }
};
