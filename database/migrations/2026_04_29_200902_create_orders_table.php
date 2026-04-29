<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 40)->unique();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('item_type', 32)->index();
            $table->unsignedBigInteger('item_ref_id')->nullable();
            $table->string('description');
            $table->unsignedInteger('amount_idr');
            $table->unsignedSmallInteger('quantity')->default(1);
            $table->string('currency', 8)->default('IDR');
            $table->string('status', 32)->default('pending')->index();
            $table->string('payment_provider', 32)->default('duitku');
            $table->string('payment_reference')->nullable();
            $table->string('payment_url', 512)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
