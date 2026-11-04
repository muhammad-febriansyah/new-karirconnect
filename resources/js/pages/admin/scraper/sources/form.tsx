import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Info, Save, ShieldAlert, Wand2 } from 'lucide-react';
import type { FormEvent } from 'react';
import JobSourceController from '@/actions/App/Http/Controllers/Admin/Scraper/JobSourceController';
import { ToneBadge } from '@/components/admin/scraper/scraper-ui';
import { FormField } from '@/components/form/form-field';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatDateTime } from '@/lib/format-date';
import type { Option } from '@/types/scraper';

type SelectorKey =
    | 'title'
    | 'description'
    | 'responsibilities'
    | 'requirements'
    | 'benefits'
    | 'location'
    | 'employment_type'
    | 'department'
    | 'apply_url'
    | 'posted_at';

type SourceConfig = {
    board_token?: string;
    company?: string;
    company_name?: string;
    company_website?: string;
    url_pattern?: string;
    job_link_selector?: string;
    next_page_selector?: string;
    selectors?: Partial<Record<SelectorKey, string>>;
};

const SELECTOR_FIELDS: Array<{
    key: SelectorKey;
    label: string;
    placeholder: string;
}> = [
    { key: 'title', label: 'Judul', placeholder: 'h1.job-title' },
    { key: 'description', label: 'Deskripsi', placeholder: '.job-description' },
    {
        key: 'requirements',
        label: 'Kualifikasi',
        placeholder: '.job-requirements',
    },
    {
        key: 'responsibilities',
        label: 'Tanggung jawab',
        placeholder: '.job-duties',
    },
    { key: 'benefits', label: 'Benefit', placeholder: '.job-benefits' },
    { key: 'location', label: 'Lokasi', placeholder: '.job-location' },
    {
        key: 'employment_type',
        label: 'Tipe pekerjaan',
        placeholder: '.job-type',
    },
    { key: 'department', label: 'Departemen', placeholder: '.job-department' },
    { key: 'apply_url', label: 'Link lamaran', placeholder: 'a.apply-button' },
    {
        key: 'posted_at',
        label: 'Tanggal tayang (ISO)',
        placeholder: 'time.posted',
    },
];

type ExistingSource = {
    id: number;
    name: string;
    slug: string;
    type: string;
    base_url: string;
    allowed_domains: string[];
    config: SourceConfig;
    status: string;
    permission_notes: string | null;
    robots_checked: boolean;
    robots_checked_at: string | null;
    schedule_minutes: number;
    rate_limit_per_minute: number;
    max_pages: number;
    expected_min_items: number;
    browser_allowed: boolean;
    circuit_state: string;
    circuit_label: string;
    consecutive_failures: number;
    cooldown_until: string | null;
};

type Props = {
    mode: 'create' | 'edit';
    source: ExistingSource | null;
    typeOptions: Array<Option & { runnable: boolean }>;
    statusOptions: Option[];
};

type FormData = {
    name: string;
    slug: string;
    type: string;
    base_url: string;
    allowed_domains: string;
    config: SourceConfig;
    status: string;
    permission_notes: string;
    robots_checked: boolean;
    schedule_minutes: string;
    rate_limit_per_minute: string;
    max_pages: string;
    expected_min_items: string;
    browser_allowed: boolean;
};

const SCHEDULE_OPTIONS: Option[] = [
    { value: '60', label: 'Tiap 1 jam' },
    { value: '180', label: 'Tiap 3 jam' },
    { value: '360', label: 'Tiap 6 jam' },
    { value: '720', label: 'Tiap 12 jam' },
    { value: '1440', label: 'Tiap hari' },
    { value: '10080', label: 'Tiap minggu' },
];

function hostOf(url: string | undefined): string | null {
    try {
        return url ? new URL(url).hostname.replace(/^www\./, '') : null;
    } catch {
        return null;
    }
}

export default function JobSourceForm({
    mode,
    source,
    typeOptions,
    statusOptions,
}: Props) {
    const form = useForm<FormData>({
        name: source?.name ?? '',
        slug: source?.slug ?? '',
        type: source?.type ?? 'greenhouse',
        base_url: source?.base_url ?? '',
        allowed_domains: (source?.allowed_domains ?? []).join('\n'),
        config: { ...(source?.config ?? {}) },
        status: source?.status ?? 'disabled',
        permission_notes: source?.permission_notes ?? '',
        robots_checked: source?.robots_checked ?? false,
        schedule_minutes: String(source?.schedule_minutes ?? 1440),
        rate_limit_per_minute: String(source?.rate_limit_per_minute ?? 30),
        max_pages: String(source?.max_pages ?? 20),
        expected_min_items: String(source?.expected_min_items ?? 0),
        browser_allowed: source?.browser_allowed ?? false,
    });

    const { data, setData, errors, processing } = form;
    const fieldErrors = errors as Record<string, string | undefined>;
    const selectedType = typeOptions.find(
        (option) => option.value === data.type,
    );
    const domainError = Object.entries(fieldErrors).find(([key]) =>
        key.startsWith('allowed_domains'),
    )?.[1];

    const setConfig = (
        key: Exclude<keyof SourceConfig, 'selectors'>,
        value: string,
    ) => setData('config', { ...data.config, [key]: value });

    const setSelector = (key: SelectorKey, value: string) =>
        setData('config', {
            ...data.config,
            selectors: { ...(data.config.selectors ?? {}), [key]: value },
        });

    const isHtmlSource =
        data.type === 'sitemap' || data.type === 'generic_html';

    /** Fill base URL and domains from the board token / company slug. */
    const autofill = () => {
        const websiteHost = hostOf(data.config.company_website);
        let baseUrl = data.base_url;
        let domains: string[] = [];

        if (data.type === 'greenhouse' && data.config.board_token) {
            baseUrl = `https://boards-api.greenhouse.io/v1/boards/${data.config.board_token}/jobs`;
            domains = ['boards-api.greenhouse.io', 'job-boards.greenhouse.io'];
        } else if (data.type === 'lever' && data.config.company) {
            baseUrl = `https://api.lever.co/v0/postings/${data.config.company}`;
            domains = ['api.lever.co', 'jobs.lever.co'];
        } else {
            const host = hostOf(data.base_url);
            domains = host ? [host] : [];
        }

        if (websiteHost) {
            domains.push(websiteHost);
        }

        form.setData((current) => ({
            ...current,
            base_url: baseUrl,
            allowed_domains: Array.from(new Set(domains)).join('\n'),
        }));
    };

    const canAutofill =
        (data.type === 'greenhouse' && !!data.config.board_token) ||
        (data.type === 'lever' && !!data.config.company) ||
        !!hostOf(data.base_url);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (mode === 'create') {
            form.post(JobSourceController.store().url, {
                preserveScroll: true,
            });
        } else if (source) {
            form.put(JobSourceController.update(source.id).url, {
                preserveScroll: true,
            });
        }
    };

    return (
        <>
            <Head
                title={
                    mode === 'create'
                        ? 'Tambah Sumber Lowongan'
                        : `Ubah ${source?.name}`
                }
            />

            <form onSubmit={submit} className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={
                        mode === 'create'
                            ? 'Tambah Sumber Lowongan'
                            : 'Ubah Sumber Lowongan'
                    }
                    description="Hanya tambahkan sumber yang mengizinkan pengambilan data: API publik resmi, feed, atau situs dengan izin tertulis."
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={JobSourceController.index().url}>
                                    <ArrowLeft className="size-4" /> Kembali
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Save className="size-4" />{' '}
                                {processing ? 'Menyimpan…' : 'Simpan'}
                            </Button>
                        </>
                    }
                />

                {source &&
                    (source.circuit_state !== 'closed' ||
                        source.cooldown_until) && (
                        <Alert variant="destructive">
                            <ShieldAlert className="size-4" />
                            <AlertTitle>
                                Sumber ini sedang bermasalah
                            </AlertTitle>
                            <AlertDescription>
                                {source.cooldown_until && (
                                    <>
                                        Crawl dijeda sampai{' '}
                                        {formatDateTime(source.cooldown_until)}
                                        .{' '}
                                    </>
                                )}
                                {source.circuit_state !== 'closed' && (
                                    <>
                                        Circuit breaker: {source.circuit_label}{' '}
                                        setelah {source.consecutive_failures}{' '}
                                        kegagalan beruntun.
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <Section title="Identitas sumber">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InputField
                                    id="name"
                                    label="Nama sumber"
                                    required
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                    error={errors.name}
                                    placeholder="mis. Contoh Teknologi (Greenhouse)"
                                />
                                <InputField
                                    id="slug"
                                    label="Slug"
                                    value={data.slug}
                                    onChange={(event) =>
                                        setData('slug', event.target.value)
                                    }
                                    error={errors.slug}
                                    description="Kosongkan untuk dibuat dari nama."
                                    placeholder="contoh-teknologi"
                                />
                                <SelectField
                                    id="type"
                                    label="Tipe sumber"
                                    required
                                    value={data.type}
                                    onValueChange={(value) =>
                                        setData('type', value)
                                    }
                                    options={typeOptions.map((option) => ({
                                        value: option.value,
                                        label: option.runnable
                                            ? option.label
                                            : `${option.label} (perlu kemitraan)`,
                                    }))}
                                    error={errors.type}
                                />
                            </div>
                            {selectedType && !selectedType.runnable && (
                                <p className="mt-3 flex items-start gap-2 text-sm text-amber-700">
                                    <Info className="mt-0.5 size-4 shrink-0" />
                                    {data.type === 'platform'
                                        ? 'Platform lowongan (Glints, JobStreet, LinkedIn, Indeed) hanya boleh diaktifkan lewat kemitraan atau API resmi.'
                                        : 'Worker belum mendukung tipe ini. Sumber bisa disimpan tetapi belum bisa diaktifkan.'}
                                </p>
                            )}
                        </Section>

                        <Section
                            title="Koneksi"
                            description="URL dan domain yang boleh diakses worker. Semua request dibatasi ke domain di daftar ini."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                {data.type === 'greenhouse' && (
                                    <InputField
                                        id="board_token"
                                        label="Board token Greenhouse"
                                        required
                                        value={data.config.board_token ?? ''}
                                        onChange={(event) =>
                                            setConfig(
                                                'board_token',
                                                event.target.value,
                                            )
                                        }
                                        error={
                                            fieldErrors['config.board_token']
                                        }
                                        description="Bagian terakhir dari job-boards.greenhouse.io/<token>."
                                        placeholder="contohtek"
                                    />
                                )}
                                {data.type === 'lever' && (
                                    <>
                                        <InputField
                                            id="company"
                                            label="Slug perusahaan Lever"
                                            required
                                            value={data.config.company ?? ''}
                                            onChange={(event) =>
                                                setConfig(
                                                    'company',
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors['config.company']
                                            }
                                            description="Bagian terakhir dari jobs.lever.co/<slug>."
                                            placeholder="contohtek"
                                        />
                                        <InputField
                                            id="company_name"
                                            label="Nama perusahaan"
                                            value={
                                                data.config.company_name ?? ''
                                            }
                                            onChange={(event) =>
                                                setConfig(
                                                    'company_name',
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors[
                                                    'config.company_name'
                                                ]
                                            }
                                            description="API Lever tidak menyediakan nama perusahaan."
                                            placeholder="PT Contoh Teknologi"
                                        />
                                    </>
                                )}
                                {isHtmlSource && (
                                    <>
                                        <InputField
                                            id="url_pattern"
                                            label="Pola URL lowongan"
                                            required={data.type === 'sitemap'}
                                            value={
                                                data.config.url_pattern ?? ''
                                            }
                                            onChange={(event) =>
                                                setConfig(
                                                    'url_pattern',
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors[
                                                    'config.url_pattern'
                                                ]
                                            }
                                            description="Regular expression untuk URL halaman lowongan, mis. /jobs/ atau /karier/\d+."
                                            placeholder="/jobs/"
                                        />
                                        <InputField
                                            id="company_name_html"
                                            label="Nama perusahaan"
                                            value={
                                                data.config.company_name ?? ''
                                            }
                                            onChange={(event) =>
                                                setConfig(
                                                    'company_name',
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors[
                                                    'config.company_name'
                                                ]
                                            }
                                            description="Dipakai bila halaman tidak menyebut nama perusahaan."
                                            placeholder="PT Contoh Teknologi"
                                        />
                                    </>
                                )}
                                {data.type === 'generic_html' && (
                                    <>
                                        <InputField
                                            id="job_link_selector"
                                            label="Selector link lowongan"
                                            value={
                                                data.config.job_link_selector ??
                                                ''
                                            }
                                            onChange={(event) =>
                                                setConfig(
                                                    'job_link_selector',
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors[
                                                    'config.job_link_selector'
                                                ]
                                            }
                                            description="CSS selector untuk link ke halaman detail lowongan di halaman daftar."
                                            placeholder="a.job-link"
                                        />
                                        <InputField
                                            id="next_page_selector"
                                            label="Selector halaman berikutnya"
                                            value={
                                                data.config
                                                    .next_page_selector ?? ''
                                            }
                                            onChange={(event) =>
                                                setConfig(
                                                    'next_page_selector',
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors[
                                                    'config.next_page_selector'
                                                ]
                                            }
                                            description='Opsional. Tanpa ini, worker memakai <link rel="next"> bila ada.'
                                            placeholder="a.pagination-next"
                                        />
                                    </>
                                )}
                                <InputField
                                    id="company_website"
                                    label="Website perusahaan"
                                    type="url"
                                    value={data.config.company_website ?? ''}
                                    onChange={(event) =>
                                        setConfig(
                                            'company_website',
                                            event.target.value,
                                        )
                                    }
                                    error={
                                        fieldErrors['config.company_website']
                                    }
                                    description="Opsional. Dipakai untuk melengkapi profil (alamat, telepon, tahun berdiri). Domainnya harus diizinkan."
                                    placeholder="https://www.contohtek.co.id/"
                                />
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <InputField
                                            id="base_url"
                                            label="URL dasar"
                                            required
                                            type="url"
                                            value={data.base_url}
                                            onChange={(event) =>
                                                setData(
                                                    'base_url',
                                                    event.target.value,
                                                )
                                            }
                                            error={errors.base_url}
                                            placeholder="https://boards-api.greenhouse.io/v1/boards/contohtek/jobs"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={autofill}
                                        disabled={!canAutofill}
                                        className="sm:mb-[1px]"
                                    >
                                        <Wand2 className="size-4" /> Isi
                                        otomatis
                                    </Button>
                                </div>
                                <TextareaField
                                    id="allowed_domains"
                                    label="Domain yang diizinkan"
                                    required
                                    rows={4}
                                    value={data.allowed_domains}
                                    onChange={(event) =>
                                        setData(
                                            'allowed_domains',
                                            event.target.value,
                                        )
                                    }
                                    error={domainError}
                                    description="Satu domain per baris, tanpa https://. Subdomain ikut diizinkan."
                                    placeholder={
                                        'boards-api.greenhouse.io\njob-boards.greenhouse.io'
                                    }
                                />
                            </div>
                        </Section>

                        {isHtmlSource && (
                            <Section
                                title="Selector CSS (opsional)"
                                description="Worker membaca data terstruktur JobPosting (schema.org) lebih dulu. Selector hanya dipakai untuk halaman yang tidak punya data itu."
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {SELECTOR_FIELDS.map((field) => (
                                        <InputField
                                            key={field.key}
                                            id={`selector_${field.key}`}
                                            label={field.label}
                                            value={
                                                data.config.selectors?.[
                                                    field.key
                                                ] ?? ''
                                            }
                                            onChange={(event) =>
                                                setSelector(
                                                    field.key,
                                                    event.target.value,
                                                )
                                            }
                                            error={
                                                fieldErrors[
                                                    `config.selectors.${field.key}`
                                                ]
                                            }
                                            placeholder={field.placeholder}
                                        />
                                    ))}
                                </div>
                            </Section>
                        )}

                        <Section
                            title="Batas crawl"
                            description="Batas yang sopan untuk server sumber."
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SelectField
                                    id="schedule_minutes"
                                    label="Jadwal"
                                    value={data.schedule_minutes}
                                    onValueChange={(value) =>
                                        setData('schedule_minutes', value)
                                    }
                                    options={SCHEDULE_OPTIONS}
                                    error={errors.schedule_minutes}
                                />
                                <InputField
                                    id="rate_limit_per_minute"
                                    label="Maks. request per menit"
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={data.rate_limit_per_minute}
                                    onChange={(event) =>
                                        setData(
                                            'rate_limit_per_minute',
                                            event.target.value,
                                        )
                                    }
                                    error={errors.rate_limit_per_minute}
                                    description="Crawl-delay di robots.txt tetap dipatuhi bila lebih lambat."
                                />
                                <InputField
                                    id="max_pages"
                                    label="Maks. halaman per crawl"
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={data.max_pages}
                                    onChange={(event) =>
                                        setData('max_pages', event.target.value)
                                    }
                                    error={errors.max_pages}
                                />
                                <InputField
                                    id="expected_min_items"
                                    label="Minimum lowongan yang diharapkan"
                                    type="number"
                                    min={0}
                                    value={data.expected_min_items}
                                    onChange={(event) =>
                                        setData(
                                            'expected_min_items',
                                            event.target.value,
                                        )
                                    }
                                    error={errors.expected_min_items}
                                    description="Di bawah angka ini, hasil ditandai 'Diduga Tidak Lengkap'. 0 = tidak dicek."
                                />
                            </div>
                            <div className="mt-4 flex items-start justify-between gap-4 rounded-lg border p-3">
                                <div>
                                    <Label htmlFor="browser_allowed">
                                        Izinkan browser headless
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Hanya untuk halaman karier berbasis
                                        JavaScript yang diizinkan. Tidak berlaku
                                        untuk API.
                                    </p>
                                </div>
                                <Switch
                                    id="browser_allowed"
                                    checked={data.browser_allowed}
                                    disabled={data.type !== 'generic_html'}
                                    onCheckedChange={(checked) =>
                                        setData('browser_allowed', checked)
                                    }
                                />
                            </div>
                        </Section>
                    </div>

                    <div className="space-y-6">
                        <Section
                            title="Izin & status"
                            description="Sumber hanya di-crawl bila berstatus Aktif."
                        >
                            <div className="space-y-4">
                                <SelectField
                                    id="status"
                                    label="Status"
                                    required
                                    value={data.status}
                                    onValueChange={(value) =>
                                        setData('status', value)
                                    }
                                    options={statusOptions}
                                    error={errors.status}
                                />
                                <TextareaField
                                    id="permission_notes"
                                    label="Dasar izin"
                                    rows={5}
                                    required={data.status === 'active'}
                                    value={data.permission_notes}
                                    onChange={(event) =>
                                        setData(
                                            'permission_notes',
                                            event.target.value,
                                        )
                                    }
                                    error={errors.permission_notes}
                                    placeholder="mis. Greenhouse Job Board API publik, dirancang untuk job board. Dicek 4 Nov 2026."
                                />
                                <FormField error={errors.robots_checked}>
                                    <label
                                        htmlFor="robots_checked"
                                        className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                                    >
                                        <Checkbox
                                            id="robots_checked"
                                            checked={data.robots_checked}
                                            onCheckedChange={(checked) =>
                                                setData(
                                                    'robots_checked',
                                                    checked === true,
                                                )
                                            }
                                        />
                                        <span>
                                            Saya sudah memeriksa robots.txt dan
                                            syarat layanan sumber ini, dan
                                            pengambilan datanya diizinkan.
                                            {source?.robots_checked_at && (
                                                <span className="mt-1 block text-xs text-muted-foreground">
                                                    Dicek{' '}
                                                    {formatDateTime(
                                                        source.robots_checked_at,
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    </label>
                                </FormField>
                            </div>
                        </Section>

                        <Section title="Aturan worker">
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex gap-2">
                                    <ToneBadge tone="destructive">
                                        Berhenti
                                    </ToneBadge>{' '}
                                    403, CAPTCHA, atau halaman login: tidak
                                    pernah dilewati.
                                </li>
                                <li className="flex gap-2">
                                    <ToneBadge tone="warning">Jeda</ToneBadge>{' '}
                                    429 mengikuti Retry-After.
                                </li>
                                <li className="flex gap-2">
                                    <ToneBadge tone="secondary">Aman</ToneBadge>{' '}
                                    Hanya https ke domain di daftar; IP privat
                                    diblokir.
                                </li>
                            </ul>
                        </Section>
                    </div>
                </div>
            </form>
        </>
    );
}

JobSourceForm.layout = {
    breadcrumbs: [
        { title: 'Sumber Lowongan', href: JobSourceController.index().url },
    ],
};
