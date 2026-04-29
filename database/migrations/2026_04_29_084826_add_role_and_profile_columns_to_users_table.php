<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 16)->default('employee')->after('password')->index();
            $table->string('avatar_path')->nullable()->after('role');
            $table->string('phone', 32)->nullable()->after('avatar_path');
            $table->text('address')->nullable()->after('phone');
            $table->string('locale', 5)->default('id')->after('address');
            $table->boolean('is_active')->default(true)->after('locale')->index();
            $table->json('notification_settings')->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropIndex(['role']);
            $table->dropIndex(['is_active']);
            $table->dropColumn([
                'role',
                'avatar_path',
                'phone',
                'address',
                'locale',
                'is_active',
                'notification_settings',
            ]);
        });
    }
};
