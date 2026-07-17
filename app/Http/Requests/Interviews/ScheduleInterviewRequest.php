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
    private ?Company $actingCompany = null;

    private bool $companyResolved = false;

    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Employer;
    }

    /**
     * The company the caller owns. Memoised because both the interviewer_ids
     * rule and the ai_template_id check need it, and rules() runs before
     * withValidator on every request.
     */
    private function actingCompany(): ?Company
    {
        if (! $this->companyResolved) {
            $this->actingCompany = Company::query()->where('owner_id', $this->user()?->id)->first();
            $this->companyResolved = true;
        }

        return $this->actingCompany;
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
            /*
             * Must be scoped to the acting company, not merely to a real user.
             * The scheduler looks for conflicts across every interview these ids
             * take part in, so a bare exists:users,id turns 422 "Slot bentrok"
             * into an oracle: probe any user id against a moving time window and
             * their whole calendar falls out. A successful call also writes them
             * in as a participant, which then poisons their own conflict checks.
             * The UI dropdown is already company-scoped (InterviewController::
             * teamOptions), but that is presentation -- this is the enforcement.
             */
            'interviewer_ids.*' => [
                'integer',
                Rule::exists('company_members', 'user_id')
                    ->where('company_id', $this->actingCompany()?->id ?? 0),
            ],

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

            $company = $this->actingCompany();
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
