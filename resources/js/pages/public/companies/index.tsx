import { Head, Link, router } from '@inertiajs/react';
import { Building2, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { index as companiesIndex } from '@/routes/public/companies';

type Option = { value: string; label: string };

type CompanyRow = {
    id: number;
    name: string;
    slug: string;
    tagline: string | null;
    industry: string | null;
    city: string | null;
    size: string | null;
    logo_url: string | null;
    verification_status: string | null;
    open_jobs_count: number;
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    companies: Pagination<CompanyRow>;
    filters: {
        search: string;
        industry_id: number | null;
        province_id: number | null;
        verified_only: boolean;
    };
    options: {
        industries: Option[];
        provinces: Option[];
    };
};

export default function PublicCompaniesIndex({ companies, filters, options }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (next: Partial<Props['filters']>) => {
        router.get(companiesIndex().url, { ...filters, ...next }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        apply({ search });
    };

    return (
        <>
            <Head title="Direktori Perusahaan" />

            <div className="space-y-6">
                <PageHeader
                    title="Direktori Perusahaan"
                    description="Jelajahi perusahaan terverifikasi yang sedang merekrut di KarirConnect."
                />

                <Section>
                    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-center">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama perusahaan…"
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={String(filters.industry_id ?? '')}
                            onValueChange={(v) => apply({ industry_id: v === 'all' ? null : Number(v) })}
                        >
                            <SelectTrigger><SelectValue placeholder="Semua industri" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua industri</SelectItem>
                                {options.industries.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(filters.province_id ?? '')}
                            onValueChange={(v) => apply({ province_id: v === 'all' ? null : Number(v) })}
                        >
                            <SelectTrigger><SelectValue placeholder="Semua provinsi" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua provinsi</SelectItem>
                                {options.provinces.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={filters.verified_only ? 'default' : 'outline'}
                                onClick={() => apply({ verified_only: !filters.verified_only })}
                            >
                                Verified
                            </Button>
                            <Button type="submit"><Search className="size-4" /></Button>
                        </div>
                    </form>
                </Section>

                {companies.data.length === 0 ? (
                    <EmptyState title="Belum ada perusahaan" description="Coba ubah filter pencarian." />
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {companies.data.map((c) => (
                            <Card key={c.id} className="transition hover:shadow-md">
                                <CardContent className="space-y-3 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                            {c.logo_url ? (
                                                <img src={c.logo_url} alt={c.name} className="size-full object-cover" />
                                            ) : (
                                                <Building2 className="size-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Link href={`/companies/${c.slug}`} className="font-semibold hover:underline">
                                                {c.name}
                                            </Link>
                                            {c.verification_status === 'verified' && (
                                                <StatusBadge tone="success">Verified</StatusBadge>
                                            )}
                                            {c.tagline && <p className="text-xs text-muted-foreground">{c.tagline}</p>}
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs text-muted-foreground">
                                        {c.industry && <div>{c.industry}</div>}
                                        {c.city && <div>{c.city}</div>}
                                    </div>
                                    <div className="flex items-center justify-between border-t pt-3 text-sm">
                                        <span className="font-medium">{c.open_jobs_count} lowongan aktif</span>
                                        <Button asChild size="sm" variant="ghost">
                                            <Link href={`/companies/${c.slug}`}>Lihat</Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{companies.from ?? 0}–{companies.to ?? 0} dari {companies.total}</span>
                    <div className="flex gap-1">
                        {companies.links.map((l, i) => (
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
