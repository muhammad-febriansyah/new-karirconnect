<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAboutPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'hero_title' => ['nullable', 'string', 'max:160'],
            'hero_subtitle' => ['nullable', 'string', 'max:500'],
            'hero_image' => ['nullable', 'file', 'image', 'max:4096'],
            'remove_hero_image' => ['nullable', 'boolean'],

            'story_body' => ['nullable', 'string', 'max:20000'],
            'vision' => ['nullable', 'string', 'max:5000'],
            'mission' => ['nullable', 'string', 'max:5000'],

            'values' => ['nullable', 'array', 'max:12'],
            'values.*.icon' => ['nullable', 'string', 'max:32'],
            'values.*.title' => ['nullable', 'string', 'max:80'],
            'values.*.body' => ['nullable', 'string', 'max:400'],

            'stats' => ['nullable', 'array', 'max:8'],
            'stats.*.number' => ['nullable', 'string', 'max:32'],
            'stats.*.label' => ['nullable', 'string', 'max:80'],
            'stats.*.description' => ['nullable', 'string', 'max:160'],

            'team_members' => ['nullable', 'array', 'max:24'],
            'team_members.*.photo' => ['nullable', 'file', 'image', 'max:2048'],
            'team_members.*.photo_path' => ['nullable', 'string', 'max:255'],
            'team_members.*.name' => ['nullable', 'string', 'max:120'],
            'team_members.*.role' => ['nullable', 'string', 'max:120'],
            'team_members.*.bio_short' => ['nullable', 'string', 'max:400'],
            'team_members.*.linkedin_url' => ['nullable', 'url', 'max:255'],

            'office_address' => ['nullable', 'string', 'max:500'],
            'office_map_embed' => ['nullable', 'string', 'max:1024'],

            'seo_title' => ['nullable', 'string', 'max:80'],
            'seo_description' => ['nullable', 'string', 'max:200'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'remove_hero_image' => $this->boolean('remove_hero_image'),
        ]);
    }
}
