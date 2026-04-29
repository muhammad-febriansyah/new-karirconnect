<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('candidate_outreach_messages', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('sender_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('candidate_profile_id')->constrained('employee_profiles')->cascadeOnDelete();
            $table->foreignId('candidate_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('job_id')->nullable()->constrained('job_posts')->nullOnDelete();
            $table->string('subject');
            $table->text('body');
            $table->string('status', 20)->default('sent')->index();
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamp('replied_at')->nullable();
            $table->text('reply_body')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'sent_at']);
            $table->index(['candidate_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('candidate_outreach_messages');
    }
};
