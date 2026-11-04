<?php

namespace App\Http\Requests\Admin;

use App\Enums\JobSourceStatus;
use App\Enums\JobSourceType;
use App\Exceptions\Crawler\UnsafeUrlException;
use App\Models\JobSource;
use App\Services\Crawler\UrlSafetyGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class JobSourceRequest extends FormRequest
{
    private const DOMAIN_PATTERN = '/^(?=.{1,191}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/';

    /**
     * Types the worker can crawl. Platforms need an official partnership
     * (or API) first, so they can be recorded but never activated.
     *
     * @var list<JobSourceType>
     */
    public const RUNNABLE_TYPES = [JobSourceType::Greenhouse, JobSourceType::Lever, JobSourceType::Sitemap, JobSourceType::GenericHtml, JobSourceType::JobFeed];

    /**
     * Config keys set by the catalog, never by this form; kept on update.
     *
     * @var list<string>
     */
    public const CATALOG_CONFIG_KEYS = ['feed', 'params', 'location_keywords', 'rules'];

    /** @var list<string> */
    public const SELECTOR_FIELDS = ['title', 'description', 'responsibilities', 'requirements', 'benefits', 'location', 'employment_type', 'department', 'apply_url', 'posted_at'];

    public function authorize(): bool
    {
        $source = $this->route('jobSource');

        return $source instanceof JobSource
            ? $this->user()?->can('update', $source) ?? false
            : $this->user()?->can('create', JobSource::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $source = $this->route('jobSource');

        return [
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:160', 'alpha_dash', Rule::unique('job_sources', 'slug')->ignore($source)],
            'type' => ['required', Rule::enum(JobSourceType::class)],
            'base_url' => ['required', 'string', 'max:2048', 'url:https'],
            'allowed_domains' => ['required', 'array', 'min:1', 'max:20'],
            'allowed_domains.*' => ['required', 'string', 'distinct', 'regex:'.self::DOMAIN_PATTERN],
            'status' => ['required', Rule::enum(JobSourceStatus::class)],
            'permission_notes' => ['nullable', 'string', 'max:5000', 'required_if:status,'.JobSourceStatus::Active->value],
            'robots_checked' => ['boolean', 'accepted_if:status,'.JobSourceStatus::Active->value],
            'schedule_minutes' => ['required', 'integer', 'min:60', 'max:10080'],
            'rate_limit_per_minute' => ['required', 'integer', 'min:1', 'max:120'],
            'max_pages' => ['required', 'integer', 'min:1', 'max:200'],
            'expected_min_items' => ['required', 'integer', 'min:0', 'max:10000'],
            'browser_allowed' => ['boolean'],
            // Known keys only: robots_override_permission in particular can
            // never be set from a form, only directly in the database.
            'config' => ['array:board_token,company,company_name,company_website,url_pattern,job_link_selector,next_page_selector,selectors'],
            'config.board_token' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_-]+$/', 'required_if:type,'.JobSourceType::Greenhouse->value],
            'config.company' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z0-9_.-]+$/', 'required_if:type,'.JobSourceType::Lever->value],
            'config.company_name' => ['nullable', 'string', 'max:191'],
            'config.company_website' => ['nullable', 'string', 'max:2048', 'url:https'],
            'config.url_pattern' => ['nullable', 'string', 'max:200', 'required_if:type,'.JobSourceType::Sitemap->value],
            'config.job_link_selector' => ['nullable', 'string', 'max:200'],
            'config.next_page_selector' => ['nullable', 'string', 'max:200'],
            'config.selectors' => ['nullable', 'array:'.implode(',', self::SELECTOR_FIELDS)],
            'config.selectors.*' => ['nullable', 'string', 'max:200'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama sumber',
            'type' => 'tipe sumber',
            'base_url' => 'URL dasar',
            'allowed_domains' => 'domain yang diizinkan',
            'allowed_domains.*' => 'domain',
            'permission_notes' => 'catatan izin',
            'robots_checked' => 'pemeriksaan robots.txt & syarat layanan',
            'schedule_minutes' => 'interval jadwal',
            'rate_limit_per_minute' => 'batas request per menit',
            'max_pages' => 'maksimum halaman',
            'expected_min_items' => 'minimum lowongan yang diharapkan',
            'config.board_token' => 'board token Greenhouse',
            'config.company' => 'slug perusahaan Lever',
            'config.company_name' => 'nama perusahaan',
            'config.company_website' => 'website perusahaan',
            'config.url_pattern' => 'pola URL lowongan',
            'config.job_link_selector' => 'selector link lowongan',
            'config.next_page_selector' => 'selector halaman berikutnya',
            'config.selectors.*' => 'selector',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'permission_notes.required_if' => 'Catat dasar izin crawling (API publik, izin tertulis, dll.) sebelum mengaktifkan sumber.',
            'robots_checked.accepted_if' => 'Pastikan robots.txt dan syarat layanan sumber sudah diperiksa sebelum mengaktifkannya.',
            'allowed_domains.*.regex' => 'Domain ":input" tidak valid. Tulis nama domain saja, tanpa https:// atau path.',
            'base_url.url' => 'URL dasar harus berupa URL https yang valid.',
            'config.url_pattern.required_if' => 'Sitemap biasanya berisi semua halaman situs. Isi pola URL agar hanya halaman lowongan yang dibaca, mis. /jobs/.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $domains = $this->input('allowed_domains');
        if (is_string($domains)) {
            $domains = preg_split('/[\s,]+/', $domains) ?: [];
        }

        $config = $this->input('config');
        $config = is_array($config) ? array_map(fn ($value) => is_string($value) ? trim($value) : $value, $config) : [];
        if (is_array($config['selectors'] ?? null)) {
            $config['selectors'] = array_filter(
                array_map(fn ($value) => is_string($value) ? trim($value) : $value, $config['selectors']),
                fn ($value) => $value !== null && $value !== '',
            );
        }

        $this->merge([
            'slug' => $this->filled('slug') ? str($this->input('slug'))->slug()->value() : null,
            'allowed_domains' => collect(is_array($domains) ? $domains : [])
                ->map(fn ($domain) => strtolower(trim((string) $domain)))
                ->filter()
                ->unique()
                ->values()
                ->all(),
            'config' => array_filter($config, fn ($value) => $value !== null && $value !== '' && $value !== []),
            'robots_checked' => $this->boolean('robots_checked'),
            'browser_allowed' => $this->boolean('browser_allowed'),
        ]);
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $type = JobSourceType::from($this->input('type'));
                $active = $this->input('status') === JobSourceStatus::Active->value;

                if ($active && ! in_array($type, self::RUNNABLE_TYPES, true)) {
                    $validator->errors()->add('status', 'Platform lowongan hanya bisa diaktifkan lewat kemitraan atau API resmi.');
                }

                if ($this->boolean('browser_allowed') && $type !== JobSourceType::GenericHtml) {
                    $validator->errors()->add('browser_allowed', 'Browser headless hanya untuk tipe Halaman Karier (HTML).');
                }

                $pattern = $this->input('config.url_pattern');
                // The worker runs this with Python's re; PCRE accepts the same
                // everyday syntax, so a pattern PCRE rejects is rejected here.
                if (is_string($pattern) && $pattern !== '' && @preg_match('~'.str_replace('~', '\\~', $pattern).'~', '') === false) {
                    $validator->errors()->add('config.url_pattern', 'Pola URL bukan regular expression yang valid.');
                }

                if ($type === JobSourceType::GenericHtml && blank($this->input('config.job_link_selector')) && blank($pattern)) {
                    $validator->errors()->add('config.job_link_selector', 'Isi selector link lowongan atau pola URL agar worker tahu halaman mana yang merupakan lowongan.');
                }

                $domains = $this->input('allowed_domains');
                $guard = app(UrlSafetyGuard::class);

                try {
                    $guard->check($this->input('base_url'), $domains);
                } catch (UnsafeUrlException $exception) {
                    $validator->errors()->add('base_url', $exception->getMessage());
                }

                $website = $this->input('config.company_website');
                if (is_string($website) && $website !== '') {
                    try {
                        $guard->check($website, $domains);
                    } catch (UnsafeUrlException $exception) {
                        $validator->errors()->add('config.company_website', $exception->getMessage().' Tambahkan domainnya ke daftar domain yang diizinkan.');
                    }
                }
            },
        ];
    }

    /**
     * Validated data shaped for the model.
     *
     * @return array<string, mixed>
     */
    public function sourceAttributes(?JobSource $existing = null): array
    {
        $data = $this->safe()->except(['robots_checked']);
        $data['slug'] ??= str($data['name'])->slug()->value();

        if ($this->boolean('robots_checked')) {
            $data['robots_checked_at'] = $existing?->robots_checked_at ?? now();
        } else {
            $data['robots_checked_at'] = null;
        }

        if ($existing !== null) {
            $data['config'] = [
                ...($data['config'] ?? []),
                ...array_intersect_key($existing->config ?? [], array_flip(self::CATALOG_CONFIG_KEYS)),
            ];
        }

        return $data;
    }
}
