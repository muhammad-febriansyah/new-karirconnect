<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interview_participants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('interview_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 24);
            $table->string('invitation_response', 16)->default('pending');
            $table->timestamp('responded_at')->nullable();
            $table->boolean('attended')->nullable();
            $table->timestamps();

            $table->unique(['interview_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_participants');
    }
};
