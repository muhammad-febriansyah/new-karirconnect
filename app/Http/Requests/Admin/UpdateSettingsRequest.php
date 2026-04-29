<?php

namespace App\Http\Requests\Admin;

use App\Enums\SettingType;
use App\Enums\UserRole;
use App\Models\Setting;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Admin;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $group = (string) $this->route('group');

        $rules = [
            'group' => ['required', 'string'],
            'values' => ['array'],
            'files' => ['array'],
        ];

        $settings = Setting::query()->where('group', $group)->get();

        foreach ($settings as $setting) {
            $key = "values.{$setting->key}";
            $fileKey = "files.{$setting->key}";

            $rules[$key] = match ($setting->type) {
                SettingType::Bool => ['nullable', 'boolean'],
                SettingType::Int => ['nullable', 'integer'],
                SettingType::Float => ['nullable', 'numeric'],
                SettingType::Json => ['nullable', 'array'],
                SettingType::Text => ['nullable', 'string', 'max:50000'],
                SettingType::File => ['nullable', 'string'],
                SettingType::Password => ['nullable', 'string', 'max:1024'],
                default => ['nullable', 'string', 'max:1024'],
            };

            if ($setting->type === SettingType::File) {
                $rules[$fileKey] = ['nullable', 'file', 'mimes:png,jpg,jpeg,webp,svg,ico', 'max:2048'];
            }
        }

        $rules['group'] = [
            'required',
            Rule::in(['general', 'branding', 'seo', 'ai', 'payment', 'email', 'feature_flags', 'legal']),
        ];

        return $rules;
    }
}
