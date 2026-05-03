import { Head, Link } from '@inertiajs/react';
import { Briefcase, Building2, ExternalLink, MapPin, Users } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { SafeHtml } from '@/components/shared/safe-html';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Props = {
    company: {
        id: number;
        name: string;
        slug: string;
        tagline: string | null;
        about: string | null;
        culture: string | null;
        benefits: string | null;
        website: string | null;
        industry: string | null;
        size: string | null;
        province: string | null;
        city: string | null;
        logo_url: string | null;
        cover_url: string | null;
        verification_status: string | null;
        offices: Array<{ id: number; label: string; address: string | null; is_headquarter: boolean; map_url: string | null }>;
        badges: Array<{ id: number; name: string; tone: string | null }>;
    };
    jobs: Array<{
        id: number;
        slug: string;
        title: string;
        category: string | null;
        city: string | null;
        employment_type: string | null;
        work_arrangement: string | null;
        salary_min: number | null;
        salary_max: number | null;
        is_salary_visible: boolean;
        is_featured: boolean;
        published_at: string | null;
    }>;
};

function formatRupiah(value: number | null): string {
    if (!value) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function PublicCompanyShow({ company, jobs }: Props) {
    return (
        <>
            <Head title={company.name} />

            <div className="space-y-6">
                {company.cover_url && (
                    <div className="h-48 w-full overflow-hidden rounded-xl border bg-muted">
                        <img src={company.cover_url} alt={company.name} className="size-full object-cover" />
                    </div>
                )}

                <PageHeader
                    title={company.name}
                    description={company.tagline ?? undefined}
                    actions={
                        <div className="flex gap-2">
                            {company.verification_status === 'verified' && (
                                <StatusBadge tone="success">Verified</StatusBadge>
                            )}
                            {company.website && (
                                <Button asChild variant="outline" size="sm">
                                    <a href={company.website} target="_blank" rel="noreferrer">
                                        <ExternalLink className="size-4" /> Website
                                    </a>
                                </Button>
                            )}
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        {company.about && (
                            <Section title="Tentang">
                                <SafeHtml html={company.about} className="prose-sm text-muted-foreground" />
                            </Section>
                        )}

                        {company.culture && (
                            <Section title="Budaya">
                                <SafeHtml html={company.culture} className="prose-sm text-muted-foreground" />
                            </Section>
                        )}

                        {company.benefits && (
                            <Section title="Benefit">
                                <SafeHtml html={company.benefits} className="prose-sm text-muted-foreground" />
                            </Section>
                        )}

                        <Section title={`Lowongan Aktif (${jobs.length})`}>
                            {jobs.length === 0 ? (
                                <EmptyState
                                    title="Belum ada lowongan aktif"
                                    description="Perusahaan ini belum mempublikasikan lowongan aktif saat ini."
                                />
                            ) : (
                                <div className="space-y-2">
                                    {jobs.map((job) => (
                                        <Card key={job.id} className="transition hover:shadow-sm">
                                            <CardContent className="flex items-center justify-between gap-3 p-3">
                                                <div className="space-y-1">
                                                    <Link href={`/jobs/${job.slug}`} className="font-medium hover:underline">
                                                        {job.title}
                                                    </Link>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                        {job.category && <span>{job.category}</span>}
                                                        {job.city && <span className="flex items-center gap-1"><MapPin className="size-3" /> {job.city}</span>}
                                                        {job.employment_type && (
                                                            <span className="flex items-center gap-1"><Briefcase className="size-3" /> {formatStatus(job.employment_type)}</span>
                                                        )}
                                                        {job.is_salary_visible && job.salary_min && (
                                                            <span className="font-medium text-foreground">
                                                                {formatRupiah(job.salary_min)}
                                                                {job.salary_max && job.salary_max !== job.salary_min ? ` – ${formatRupiah(job.salary_max)}` : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {job.is_featured && <Badge>Featured</Badge>}
                                                    <span className="text-xs text-muted-foreground">{job.published_at ? formatDate(job.published_at) : ''}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                        {company.logo_url ? (
                                            <img src={company.logo_url} alt={company.name} className="size-full object-cover" />
                                        ) : (
                                            <Building2 className="size-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{company.name}</h3>
                                        {company.industry && <p className="text-xs text-muted-foreground">{company.industry}</p>}
                                    </div>
                                </div>
                                <ul className="space-y-1.5 text-sm text-muted-foreground">
                                    {company.size && <li className="flex items-center gap-2"><Users className="size-4" /> {company.size}</li>}
                                    {(company.city || company.province) && (
                                        <li className="flex items-center gap-2"><MapPin className="size-4" /> {[company.city, company.province].filter(Boolean).join(', ')}</li>
                                    )}
                                </ul>
                                {company.badges.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 border-t pt-3">
                                        {company.badges.map((b) => (
                                            <Badge key={b.id} variant="secondary">{b.name}</Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {company.offices.length > 0 && (
                            <Card>
                                <CardContent className="space-y-2 p-4">
                                    <h3 className="text-sm font-semibold">Kantor</h3>
                                    <ul className="space-y-2 text-sm">
                                        {company.offices.map((o) => (
                                            <li key={o.id} className="space-y-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium">{o.label}</span>
                                                    {o.is_headquarter && <Badge variant="outline" className="text-xs">HQ</Badge>}
                                                </div>
                                                {o.address && <p className="text-xs text-muted-foreground">{o.address}</p>}
                                                {o.map_url && (
                                                    <a href={o.map_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                                                        Lihat di peta
                                                    </a>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
