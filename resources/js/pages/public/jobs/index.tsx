import { Head, Link, router } from '@inertiajs/react';
import { Briefcase, Building2, MapPin, Search, Sparkles, Star } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/format-date';
import { index as jobBrowseIndex } from '@/routes/public/jobs';

type Option = { value: string; label: string };

type JobRow = {
    id: number;
    slug: string;
    title: string;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    is_featured: boolean;
    is_anonymous: boolean;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    published_at: string | null;
    application_deadline: string | null;
    company: {
        id?: number;
        name: string;
        slug?: string;
        logo_url: string | null;
        verification_status: string | null;
    };
    category: string | null;
    city: string | null;
    skills: string[];
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    search: string | null;
    category_id: number | null;
    province_id: number | null;
    city_id: number | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    salary_min: number | null;
    skill_ids: number[];
    featured_only: boolean | null;
    sort: string | null;
};

type Props = {
    jobs: Pagination<JobRow>;
    filters: Filters;
    options: {
        categories: Option[];
        provinces: Option[];
        cities: Option[];
        skills: Option[];
        employment_types: Option[];
        work_arrangements: Option[];
        experience_levels: Option[];
    };
};

function formatRupiah(value: number | null): string {
    if (!value) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function PublicJobsIndex({ jobs, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (next: Partial<Filters>) => {
        router.get(jobBrowseIndex().url, { ...filters, ...next }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        apply({ search });
    };

    return (
        <>
            <Head title="Cari Lowongan" />

            <div className="space-y-6">
                <PageHeader
                    title="Lowongan Kerja"
                    description="Telusuri lowongan dari perusahaan terverifikasi di seluruh Indonesia."
                />

                <Section>
                    <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari posisi atau perusahaan…"
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={String(filters.category_id ?? '')}
                            onValueChange={(v) => apply({ category_id: v ? Number(v) : null })}
                        >
                            <SelectTrigger><SelectValue placeholder="Semua kategori" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua kategori</SelectItem>
                                {options.categories.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.work_arrangement ?? ''}
                            onValueChange={(v) => apply({ work_arrangement: v === 'all' ? null : v })}
                        >
                            <SelectTrigger><SelectValue placeholder="Tipe kerja" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua tipe kerja</SelectItem>
                                {options.work_arrangements.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="submit"><Search className="size-4" /> Cari</Button>
                    </form>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Filter cepat:</span>
                        {options.employment_types.slice(0, 4).map((c) => (
                            <Button
                                key={c.value}
                                size="sm"
                                variant={filters.employment_type === c.value ? 'default' : 'outline'}
                                onClick={() => apply({ employment_type: filters.employment_type === c.value ? null : c.value })}
                            >
                                {c.label}
                            </Button>
                        ))}
                        <Button
                            size="sm"
                            variant={filters.featured_only ? 'default' : 'outline'}
                            onClick={() => apply({ featured_only: !filters.featured_only })}
                        >
                            <Sparkles className="size-3.5" /> Featured
                        </Button>
                    </div>
                </Section>

                {jobs.data.length === 0 ? (
                    <EmptyState
                        title="Belum ada lowongan"
                        description="Coba longgarkan filter atau periksa kembali nanti."
                    />
                ) : (
                    <div className="grid gap-3">
                        {jobs.data.map((job) => (
                            <Card key={job.id} className="transition hover:shadow-md">
                                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                        {job.company.logo_url ? (
                                            <img src={job.company.logo_url} alt={job.company.name} className="size-full object-cover" />
                                        ) : (
                                            <Building2 className="size-6 text-muted-foreground" />
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <Link
                                                    href={`/jobs/${job.slug}`}
                                                    className="text-base font-semibold hover:underline"
                                                >
                                                    {job.title}
                                                </Link>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>{job.company.name}</span>
                                                    {job.company.verification_status === 'verified' && (
                                                        <StatusBadge tone="success">Verified</StatusBadge>
                                                    )}
                                                </div>
                                            </div>
                                            {job.is_featured && (
                                                <Badge variant="default" className="gap-1">
                                                    <Star className="size-3" /> Featured
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                            {job.city && (
                                                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {job.city}</span>
                                            )}
                                            {job.employment_type && (
                                                <span className="flex items-center gap-1"><Briefcase className="size-3.5" /> {job.employment_type}</span>
                                            )}
                                            {job.work_arrangement && <span>{job.work_arrangement}</span>}
                                            {job.is_salary_visible && job.salary_min && (
                                                <span className="font-medium text-foreground">
                                                    {formatRupiah(job.salary_min)}
                                                    {job.salary_max && job.salary_max !== job.salary_min ? ` – ${formatRupiah(job.salary_max)}` : ''}
                                                </span>
                                            )}
                                        </div>

                                        {job.skills.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {job.skills.map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{job.published_at ? `Dipublikasi ${formatDate(job.published_at)}` : ''}</span>
                                            {job.application_deadline && (
                                                <span>Tenggat: {formatDate(job.application_deadline)}</span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{jobs.from ?? 0}–{jobs.to ?? 0} dari {jobs.total}</span>
                    <div className="flex gap-1">
                        {jobs.links.map((l, i) => (
                            <Button
                                key={i}
                                variant={l.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!l.url}
                                onClick={() => l.url && router.get(l.url, undefined, { preserveScroll: true })}
                                dangerouslySetInnerHTML={{ __html: l.label }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
