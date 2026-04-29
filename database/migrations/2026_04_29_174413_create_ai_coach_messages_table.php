<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_coach_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('session_id')->constrained('ai_coach_sessions')->cascadeOnDelete();
            $table->string('role', 16);
            $table->longText('content');
            $table->unsignedInteger('tokens_used')->nullable();
            $table->string('model_snapshot', 64)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['session_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_coach_messages');
    }
};
