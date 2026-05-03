<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Single-row "About Us" page. Modelled as a regular table so the AboutPage
 * model can use Eloquent's full feature set (casts, observers, factories) — we
 * just enforce the singleton at the model layer via firstSingleton().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('about_pages', function (Blueprint $table): void {
            $table->id();

            // Hero
            $table->string('hero_title')->nullable();
            $table->text('hero_subtitle')->nullable();
            $table->string('hero_image_path')->nullable();

            // Cerita & identitas
            $table->longText('story_body')->nullable();
            $table->longText('vision')->nullable();
            $table->longText('mission')->nullable();

            // Repeater payloads — schema enforced at request layer
            $table->json('values')->nullable();
            $table->json('stats')->nullable();
            $table->json('team_members')->nullable();

            // Kantor
            $table->text('office_address')->nullable();
            $table->string('office_map_embed', 1024)->nullable();

            // SEO
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('about_pages');
    }
};
