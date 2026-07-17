<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\CompanySize;
use App\Models\Faq;
use App\Models\Industry;
use App\Models\JobCategory;
use App\Models\LegalPage;
use App\Models\Skill;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * CRUD for the lookup tables an admin maintains: job categories, industries,
 * company sizes, skills, FAQs and legal pages.
 *
 * One controller keyed by resource name rather than six near-identical ones.
 * The web has a separate controller per table; those are all the same shape,
 * and the mobile surface does not need that spread.
 */
class TaxonomyController extends Controller
{
    /**
     * Resource name => [model class, validation rules].
     *
     * @return array<string, array{model: class-string<Model>, rules: array<string, mixed>}>
     */
    private function registry(?int $ignoreId = null): array
    {
        return [
            'job-categories' => [
                'model' => JobCategory::class,
                'rules' => [
                    'name' => ['required', 'string', 'max:120'],
                    'description' => ['nullable', 'string', 'max:1000'],
                    'is_active' => ['required', 'boolean'],
                    'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
                ],
            ],
            'industries' => [
                'model' => Industry::class,
                'rules' => [
                    'name' => ['required', 'string', 'max:120'],
                    'description' => ['nullable', 'string', 'max:1000'],
                    'is_active' => ['required', 'boolean'],
                    'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
                ],
            ],
            'company-sizes' => [
                'model' => CompanySize::class,
                'rules' => [
                    'name' => ['required', 'string', 'max:120'],
                    'employee_range' => ['required', 'string', 'max:64'],
                    'is_active' => ['required', 'boolean'],
                    'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
                ],
            ],
            'skills' => [
                'model' => Skill::class,
                'rules' => [
                    'name' => ['required', 'string', 'max:120'],
                    'type' => ['nullable', Rule::in(['soft', 'hard'])],
                    'category' => ['nullable', 'string', 'max:100'],
                    'description' => ['nullable', 'string', 'max:1000'],
                    'is_active' => ['required', 'boolean'],
                ],
            ],
            'faqs' => [
                'model' => Faq::class,
                'rules' => [
                    'question' => ['required', 'string', 'max:255'],
                    'answer' => ['required', 'string', 'max:5000'],
                    'category' => ['nullable', 'string', 'max:100'],
                    'order_number' => ['nullable', 'integer', 'min:0', 'max:999'],
                    'is_published' => ['required', 'boolean'],
                ],
            ],
            'legal-pages' => [
                'model' => LegalPage::class,
                'rules' => [
                    'title' => ['required', 'string', 'max:160'],
                    'body' => ['required', 'string'],
                ],
            ],
        ];
    }

    public function index(Request $request, string $resource): JsonResponse
    {
        $model = $this->modelFor($resource);

        $rows = $model::query()
            ->when(
                $request->filled('search') && $this->hasColumn($model, 'name'),
                fn ($query) => $query->where('name', 'like', '%'.$request->string('search')->toString().'%')
            )
            ->orderBy($this->hasColumn($model, 'sort_order') ? 'sort_order' : 'id')
            ->paginate(min($request->integer('per_page') ?: 50, 100));

        return response()->json([
            'data' => $rows->items(),
            'meta' => ['total' => $rows->total(), 'resource' => $resource],
        ]);
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        $model = $this->modelFor($resource);

        $data = $request->validate($this->registry()[$resource]['rules']);

        $row = $model::query()->create($this->withSlug($model, $data));

        return response()->json(['data' => $row], 201);
    }

    public function update(Request $request, string $resource, int $id): JsonResponse
    {
        $model = $this->modelFor($resource);
        $row = $model::query()->findOrFail($id);

        $data = $request->validate($this->registry($id)[$resource]['rules']);

        $row->update($data);

        return response()->json(['data' => $row->fresh()]);
    }

    public function destroy(string $resource, int $id): JsonResponse
    {
        $model = $this->modelFor($resource);

        $model::query()->findOrFail($id)->delete();

        return response()->json(['message' => 'Data dihapus.']);
    }

    /**
     * @return class-string<Model>
     */
    private function modelFor(string $resource): string
    {
        $entry = $this->registry()[$resource] ?? null;

        // An unknown resource name is a 404, not a 500 on a null class.
        abort_if($entry === null, 404, 'Resource tidak dikenal.');

        return $entry['model'];
    }

    /**
     * These tables all carry a unique slug that the web controllers derive from
     * the name/title; nothing in the request supplies it.
     *
     * @param  class-string<Model>  $model
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withSlug(string $model, array $data): array
    {
        if (! $this->hasColumn($model, 'slug')) {
            return $data;
        }

        $source = $data['name'] ?? $data['title'] ?? null;

        if ($source === null) {
            return $data;
        }

        $base = Str::slug($source);
        $slug = $base;
        $i = 1;

        while ($model::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.++$i;
        }

        return [...$data, 'slug' => $slug];
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function hasColumn(string $model, string $column): bool
    {
        return in_array($column, (new $model)->getConnection()
            ->getSchemaBuilder()
            ->getColumnListing((new $model)->getTable()), true);
    }
}
