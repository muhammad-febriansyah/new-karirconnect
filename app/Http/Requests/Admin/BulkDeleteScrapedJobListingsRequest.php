<?php

namespace App\Http\Requests\Admin;

use App\Models\JobSource;
use Illuminate\Foundation\Http\FormRequest;

class BulkDeleteScrapedJobListingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', JobSource::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Either the checked rows ...
            'listing_ids' => ['required_without:all_matching', 'array', 'max:1000'],
            'listing_ids.*' => ['integer', 'distinct'],
            // ... or everything the current filters match.
            'all_matching' => ['boolean'],
            'filters' => ['array'],
            'filters.status' => ['nullable', 'string'],
            'filters.source' => ['nullable', 'integer'],
            'filters.category' => ['nullable', 'integer'],
            'filters.search' => ['nullable', 'string', 'max:200'],
            'filters.published' => ['nullable', 'string', 'in:yes,no'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['listing_ids.required_without' => 'Pilih minimal satu lowongan untuk dihapus.'];
    }
}
