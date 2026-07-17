<?php

namespace App\Http\Resources\Api\V1;

use App\Models\Application;
use Illuminate\Http\Request;

/**
 * @mixin Application
 */
class ApplicationDetailResource extends ApplicationResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'cover_letter' => $this->cover_letter,
            'expected_salary' => $this->expected_salary,
            'screening_score' => $this->screening_score,
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),

            'cv' => $this->whenLoaded('candidateCv', fn () => $this->candidateCv === null ? null : [
                'id' => $this->candidateCv->id,
                'label' => $this->candidateCv->label,
                'url' => $this->candidateCv->file_path
                    ? asset('storage/'.$this->candidateCv->file_path)
                    : null,
            ]),

            'status_logs' => $this->whenLoaded('statusLogs', fn () => $this->statusLogs
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'from_status' => $log->from_status,
                    'to_status' => $log->to_status,
                    'note' => $log->note,
                    'changed_by' => $log->changedBy?->name,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->values()->all()
            ),

            'screening_answers' => $this->whenLoaded('screeningAnswers', fn () => $this->screeningAnswers
                ->map(fn ($answer) => [
                    'id' => $answer->id,
                    'question_id' => $answer->job_screening_question_id,
                    'answer' => $answer->answer,
                ])->values()->all()
            ),
        ];
    }
}
