import { Head, Link, useForm } from '@inertiajs/react';
import { Briefcase, MapPin, Search, TrendingUp } from 'lucide-react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatStatus } from '@/lib/format-status';

type Aggregate = {
    sample_size: number;
    posting_count: number;
    submission_count: number;
    p25: number | null;
    p50: number | null;
    p75: number | null;
    min: number | null;
    max: number | null;
    average: number | null;
    by_experience: Record<string, { count: number; p50: number | null }>;
};

type TopCompany = { company_name: string; slug: string; count: number; p50: number | null };
type Submission = {
    job_title: string;
    salary_idr: number;
    bonus_idr: number;
    experience_level: string | null;
    experience_years: number;
    employment_type: string;
    city: string | null;
    category: string | null;
    is_anonymous: boolean;
    created_at: string | null;
};
type Category = { id: number; name: string; slug: string; count: number };
type CuratedInsight = {
    id: number;
    job_title: string;
    role_category: string;
    city: string | null;
    experience_level: string | null;
    min_salary: number;
    median_salary: number;
    max_salary: number;
    sample_size: number;
    source: string;
    last_updated_at: string | null;
};

type Props = {
    filters: {
        job_category_id?: number;
        city_id?: number;
        experience_level?: string;
        employment_type?: string;
    };
    aggregate: Aggregate;
    topCompanies: TopCompany[];
    recentSubmissions: Submission[];
    popularCategories: Category[];
    curatedInsights: CuratedInsight[];
    options: {
        categories: Array<{ id: number; name: string; slug: string }>;
        cities: Array<{ id: number; name: string }>;
        experience_levels: Array<{ value: string; label: string }>;
    };
};

const idr = (v: number | null) => (v == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v));

export default function SalaryInsightPage({ filters, aggregate, topCompanies, recentSubmissions, popularCategories, curatedInsights, options }: Props) {
    const { data, setData, get, processing } = useForm({
        job_category_id: filters.job_category_id ?? '',
        city_id: filters.city_id ?? '',
        experience_level: filters.experience_level ?? '',
        employment_type: filters.employment_type ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/salary-insight', { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title="Salary Insight - KarirConnect" />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Salary Insight Indonesia</h1>
                    <p className="mt-1 text-muted-foreground">Data gaji riil dari ribuan lowongan + laporan kandidat.</p>
                </div>

                <Card>
                    <CardContent className="p-4">
                        <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
                            <Select value={String(data.job_category_id)} onValueChange={(v) => setData('job_category_id', Number(v) || '')}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Kategori pekerjaan" /></SelectTrigger>
                                <SelectContent>
                                    {options.categories.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={String(data.city_id)} onValueChange={(v) => setData('city_id', Number(v) || '')}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Kota" /></SelectTrigger>
                                <SelectContent>
                                    {options.cities.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={data.experience_level} onValueChange={(v) => setData('experience_level', v)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Level pengalaman" /></SelectTrigger>
                                <SelectContent>
                                    {options.experience_levels.map((l) => (
                                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={data.employment_type} onValueChange={(v) => setData('employment_type', v)}>
                                <SelectTrigger className="w-full"><SelectValue placeholder="Tipe kerja" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full_time">Full-time</SelectItem>
                                    <SelectItem value="part_time">Part-time</SelectItem>
                                    <SelectItem value="contract">Kontrak</SelectItem>
                                    <SelectItem value="freelance">Freelance</SelectItem>
                                    <SelectItem value="internship">Magang</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button type="submit" disabled={processing}><Search className="size-4" /> Lihat</Button>
                        </form>
                    </CardContent>
                </Card>

                {aggregate.sample_size === 0 ? (
                    <Card>
                        <CardContent className="p-6">
                            <EmptyState
                                title="Data belum cukup"
                                description="Coba perluas filter untuk melihat insight gaji yang tersedia."
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-3">
                            <Card><CardContent className="space-y-1 p-4">
                                <div className="text-sm text-muted-foreground">Median (P50)</div>
                                <div className="text-3xl font-bold">{idr(aggregate.p50)}</div>
                            </CardContent></Card>
                            <Card><CardContent className="space-y-1 p-4">
                                <div className="text-sm text-muted-foreground">Rentang Tengah (P25-P75)</div>
                                <div className="text-xl font-semibold">{idr(aggregate.p25)} - {idr(aggregate.p75)}</div>
                            </CardContent></Card>
                            <Card><CardContent className="space-y-1 p-4">
                                <div className="text-sm text-muted-foreground">Jumlah Sample</div>
                                <div className="text-3xl font-bold">{aggregate.sample_size}</div>
                                <div className="text-xs text-muted-foreground">{aggregate.posting_count} dari lowongan · {aggregate.submission_count} dari kandidat</div>
                            </CardContent></Card>
                        </div>

                        <Card>
                            <CardContent className="p-4">
                                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="size-4" /> Median per Level</div>
                                <div className="grid gap-2 md:grid-cols-6">
                                    {Object.entries(aggregate.by_experience).map(([level, stat]) => (
                                        <div key={level} className="rounded border p-2 text-center">
                                            <div className="text-xs uppercase text-muted-foreground">{formatStatus(level)}</div>
                                            <div className="text-sm font-semibold">{idr(stat.p50)}</div>
                                            <div className="text-[10px] text-muted-foreground">{stat.count} sample</div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {topCompanies.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Briefcase className="size-4" /> Perusahaan Aktif</div>
                            <div className="grid gap-2 md:grid-cols-2">
                                {topCompanies.map((c, i) => (
                                    <Link key={i} href={`/companies/${c.slug}`} className="flex items-center justify-between rounded border p-2 hover:bg-muted/40">
                                        <div className="font-medium">{c.company_name}</div>
                                        <div className="text-right">
                                            <div className="text-xs text-muted-foreground">{c.count} lowongan</div>
                                            <div className="text-sm font-semibold">{idr(c.p50)}</div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {popularCategories.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="mb-2 text-sm font-semibold">Kategori Populer</div>
                            <div className="flex flex-wrap gap-1">
                                {popularCategories.map((c) => (
                                    <Link key={c.id} href={`/salary-insight?job_category_id=${c.id}`}>
                                        <Badge variant="outline">{c.name} <span className="ml-1 text-xs text-muted-foreground">({c.count})</span></Badge>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {curatedInsights.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="mb-2 text-sm font-semibold">Salary Benchmark Kurasi Admin</div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {curatedInsights.map((item) => (
                                    <div key={item.id} className="rounded border p-3">
                                        <div className="font-medium">{item.job_title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.role_category}
                                                {item.city && <> · <MapPin className="inline size-3" /> {item.city}</>}
                                                {item.experience_level && <> · {formatStatus(item.experience_level)}</>}
                                            </div>
                                        <div className="mt-2 text-sm font-semibold">
                                            {idr(item.min_salary)} - {idr(item.max_salary)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Median {idr(item.median_salary)} · {item.sample_size} sample · {item.source}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {recentSubmissions.length > 0 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="mb-2 text-sm font-semibold">Laporan Terbaru dari Kandidat</div>
                            <div className="space-y-2">
                                {recentSubmissions.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between rounded border p-2">
                                        <div>
                                            <div className="font-medium">{s.job_title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatStatus(s.experience_level)} · {s.experience_years} thn · {formatStatus(s.employment_type)}
                                                {s.city && <> · <MapPin className="inline size-3" /> {s.city}</>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-semibold">{idr(s.salary_idr)}</div>
                                            {s.bonus_idr > 0 && <div className="text-xs text-muted-foreground">+ Bonus {idr(s.bonus_idr)}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
