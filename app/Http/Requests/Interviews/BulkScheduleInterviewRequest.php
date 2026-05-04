<?php

namespace App\Http\Requests\Interviews;

use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkScheduleInterviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Employer;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $mode = $this->input('mode');

        return [
            'application_ids' => ['required', 'array', 'min:1', 'max:50'],
            'application_ids.*' => ['integer', 'distinct', 'exists:applications,id'],

            'stage' => ['required', Rule::in(InterviewStage::values())],
            'mode' => ['required', Rule::in(InterviewMode::values())],
            'title' => ['required', 'string', 'max:200'],

            'start_at' => ['required', 'date', 'after:now'],
            'duration_minutes' => ['required', 'integer', 'between:15,480'],
            'gap_minutes' => ['required', 'integer', 'between:0,240'],
            'group_mode' => ['required', 'boolean'],
            'timezone' => ['nullable', 'string', 'max:64'],

            'candidate_instructions' => ['nullable', 'string', 'max:5000'],
            'internal_notes' => ['nullable', 'string', 'max:2000'],
            'requires_confirmation' => ['nullable', 'boolean'],

            'meeting_url' => ['nullable', 'url', 'max:500'],
            'meeting_passcode' => ['nullable', 'string', 'max:64'],

            'location_name' => [Rule::requiredIf($mode === 'onsite'), 'nullable', 'string', 'max:200'],
            'location_address' => [Rule::requiredIf($mode === 'onsite'), 'nullable', 'string', 'max:500'],
            'location_map_url' => ['nullable', 'url', 'max:500'],

            'interviewer_ids' => ['nullable', 'array'],
            'interviewer_ids.*' => ['integer', 'exists:users,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'group_mode' => $this->boolean('group_mode'),
            'requires_confirmation' => $this->boolean('requires_confirmation', true),
            'gap_minutes' => (int) $this->input('gap_minutes', 5),
            'duration_minutes' => (int) $this->input('duration_minutes', 60),
        ]);
    }
}
