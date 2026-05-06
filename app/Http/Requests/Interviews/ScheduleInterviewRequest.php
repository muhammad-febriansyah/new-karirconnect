<?php

namespace App\Http\Requests\Interviews;

use App\Enums\InterviewMode;
use App\Enums\InterviewStage;
use App\Enums\UserRole;
use App\Models\AiInterviewTemplate;
use App\Models\Company;
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

            'ai_template_id' => [
                Rule::requiredIf($mode === 'ai'),
                'nullable',
                'integer',
                'exists:ai_interview_templates,id',
            ],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if ($this->input('mode') !== 'ai') {
                return;
            }

            $templateId = $this->input('ai_template_id');
            if (! $templateId) {
                return; // already covered by required rule
            }

            $company = Company::query()->where('owner_id', $this->user()->id)->first();
            $template = AiInterviewTemplate::query()
                ->withCount('questions')
                ->where('id', $templateId)
                ->first();

            if (! $template || ! $company || $template->company_id !== $company->id) {
                $validator->errors()->add('ai_template_id', 'Template AI tidak ditemukan untuk perusahaan ini.');

                return;
            }

            if ((int) $template->questions_count === 0) {
                $validator->errors()->add(
                    'ai_template_id',
                    'Template AI belum punya pertanyaan. Tambahkan minimal 1 pertanyaan di Template AI Interview sebelum menjadwalkan.',
                );
            }
        });
    }
}
