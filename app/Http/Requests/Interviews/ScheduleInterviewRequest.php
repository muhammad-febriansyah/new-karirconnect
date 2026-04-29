<?php

namespace App\Http\Requests\Interviews;

use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ScheduleInterviewRequest extends FormRequest
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
            'application_id' => ['required', 'integer', 'exists:applications,id'],
            'stage' => ['required', Rule::in(InterviewStage::values())],
            'mode' => ['required', Rule::in(InterviewMode::values())],
            'title' => ['required', 'string', 'max:200'],
            'scheduled_at' => ['required', 'date', 'after:now'],
            'duration_minutes' => ['nullable', 'integer', 'between:15,480'],
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
}
