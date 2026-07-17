<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\EmployeeProfile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shared CRUD for the repeating sections of a candidate profile: educations,
 * work experiences and certifications.
 *
 * The web has three copy-pasted controllers for these (identical down to the
 * private helpers). One implementation here instead, parameterised by relation
 * name and ordering.
 *
 * It also does something the web ones do not: recompute profile_completion
 * after a write. Educations and work experiences are worth 15 points each in
 * EmployeeProfileService, and applying is gated at 60 -- so adding a degree on
 * the web currently leaves the score stale until some other screen happens to
 * resave the profile.
 */
trait ManagesProfileRecords
{
    /** Relation name on EmployeeProfile, e.g. 'educations'. */
    abstract protected function relation(): string;

    /**
     * Ordering applied to the listing, as [column, direction] pairs.
     *
     * @return array<int, array{0: string, 1: string}>
     */
    abstract protected function ordering(): array;

    /**
     * @return array<string, mixed>
     */
    abstract protected function present(Model $record): array;

    protected function listRecords(Request $request): JsonResponse
    {
        $query = $this->profileFor($request)->{$this->relation()}();

        foreach ($this->ordering() as [$column, $direction]) {
            $query->orderBy($column, $direction);
        }

        return response()->json([
            'data' => $query->get()->map(fn (Model $record) => $this->present($record))->values(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function createRecord(Request $request, array $attributes): JsonResponse
    {
        $profile = $this->profileFor($request);

        // Created through the relation, so it cannot be attached to someone
        // else's profile no matter what the payload says.
        $record = $profile->{$this->relation()}()->create($attributes);

        $this->recompute($profile);

        return response()->json(['data' => $this->present($record)], 201);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    protected function updateRecord(Request $request, Model $record, array $attributes): JsonResponse
    {
        $profile = $this->profileFor($request);

        $this->ensureOwnership($profile, $record);

        $record->update($attributes);

        $this->recompute($profile);

        return response()->json(['data' => $this->present($record->fresh())]);
    }

    protected function deleteRecord(Request $request, Model $record): JsonResponse
    {
        $profile = $this->profileFor($request);

        $this->ensureOwnership($profile, $record);

        $record->delete();

        $this->recompute($profile);

        return response()->json(['message' => 'Data dihapus.']);
    }

    /**
     * 404 rather than 403, matching the web profile CRUD: whether a given row
     * id exists at all is not the caller's business.
     */
    protected function ensureOwnership(EmployeeProfile $profile, Model $record): void
    {
        abort_unless($record->getAttribute('employee_profile_id') === $profile->id, 404);
    }

    protected function profileFor(Request $request): EmployeeProfile
    {
        return $this->profiles->ensureProfile($request->user());
    }

    protected function recompute(EmployeeProfile $profile): void
    {
        $this->profiles->recomputeCompletion($profile->fresh());
    }
}
