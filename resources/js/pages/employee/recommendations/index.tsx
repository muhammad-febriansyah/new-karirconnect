import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Briefcase, Building2, MapPin, Sparkles, Tag, Wallet, X } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type Recommendation = {
    job: {
        id: number;
        title: string;
        slug: string;
        employment_type: string | null;
        work_arrangement: string | null;
        salary_min: number | null;
        salary_max: number | null;
        company_name: string | null;
        company_logo: string | null;
        category_name: string | null;
        city_name: string | null;
        published_at: string | null;
    };
    score: number;
    breakdown: Record<string, number>;
    explanation: string;
};

type Props = {
    recommendations: Recommendation[];
    profile_completion: number | null;
};

const idr = (v: number | null) =>
    v == null ? null : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const salaryRange = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `${idr(min)} – ${idr(max)}`;
    return idr(min ?? max);
};

type ScorePalette = {
    label: string;
    track: string;
    fill: string;
    badge: string;
    accent: string;
};

const scorePalette = (score: number): ScorePalette => {
    if (score >= 80) {
        return {
            label: 'Sangat cocok',
            track: 'bg-emerald-100 dark:bg-emerald-950/40',
            fill: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
            badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300',
            accent: 'from-emerald-500/[0.07] via-transparent to-transparent',
        };
    }
    if (score >= 60) {
        return {
            label: 'Cocok',
            track: 'bg-brand-blue/15',
            fill: 'bg-gradient-to-r from-brand-blue to-brand-cyan',
            badge: 'border-brand-blue/25 bg-brand-blue/10 text-brand-navy dark:text-brand-cyan',
            accent: 'from-brand-blue/[0.06] via-transparent to-transparent',
        };
    }
    if (score >= 40) {
        return {
            label: 'Cukup cocok',
            track: 'bg-amber-100 dark:bg-amber-950/40',
            fill: 'bg-gradient-to-r from-amber-500 to-amber-400',
            badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300',
            accent: 'from-amber-500/[0.06] via-transparent to-transparent',
        };
    }
    return {
        label: 'Kurang cocok',
        track: 'bg-slate-200 dark:bg-slate-800',
        fill: 'bg-gradient-to-r from-slate-500 to-slate-400',
        badge: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
        accent: 'from-slate-500/[0.05] via-transparent to-transparent',
    };
};

const getInitials = (name: string | null) => {
    if (!name) return 'PT';
    return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
};

const isRecent = (iso: string | null) => {
    if (!iso) return false;
    return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
};

export default function EmployeeRecommendationsIndex({ recommendations, profile_completion }: Props) {
    const dismiss = (slug: string) => {
        router.post(`/employee/recommendations/${slug}/dismiss`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Rekomendasi Lowongan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Rekomendasi untuk Anda"
                    description="Lowongan yang dipilih berdasarkan skill, lokasi, dan riwayat lamaran Anda."
                    actions={
                        recommendations.length > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3 py-1 text-sm text-brand-navy">
                                <Sparkles className="size-3.5" />
                                {recommendations.length} lowongan
                            </span>
                        ) : undefined
                    }
                />

                {profile_completion !== null && profile_completion < 60 && (
                    <Card className="overflow-hidden border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50 to-amber-100/40 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-amber-950/20 dark:to-amber-950/30">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    <Sparkles className="size-5" />
                                </div>
                                <div className="space-y-0.5 text-sm">
                                    <div className="font-semibold text-amber-900 dark:text-amber-200">
                                        Lengkapi profil untuk rekomendasi yang lebih akurat
                                    </div>
                                    <div className="text-amber-800/90 dark:text-amber-200/80">
                                        Profil Anda baru {profile_completion}% lengkap. Tambahkan skill dan pengalaman untuk meningkatkan kecocokan.
                                    </div>
                                </div>
                            </div>
                            <Button asChild variant="outline" className="border-amber-300 bg-white/60 text-amber-800 hover:bg-amber-100 sm:self-center dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                                <Link href="/employee/profile">Lengkapi profil</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <Section className="p-0 sm:p-0">
                    {recommendations.length === 0 ? (
                        <div className="p-4 sm:p-6">
                            <EmptyState
                                icon={Sparkles}
                                title="Belum ada rekomendasi"
                                description="Tambahkan skill dan lengkapi profil agar kami dapat menemukan lowongan yang cocok dengan Anda."
                                bare
                            />
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {recommendations.map((rec) => {
                                const palette = scorePalette(rec.score);
                                const salary = salaryRange(rec.job.salary_min, rec.job.salary_max);
                                const recent = isRecent(rec.job.published_at);

                                return (
                                    <li key={rec.job.id} className="group relative">
                                        <div
                                            aria-hidden
                                            className={cn(
                                                'pointer-events-none absolute inset-0 bg-gradient-to-r opacity-0 transition-opacity group-hover:opacity-100',
                                                palette.accent,
                                            )}
                                        />
                                        <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                                            {/* Left: job info */}
                                            <div className="min-w-0 space-y-4">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="size-12 shrink-0 rounded-xl border bg-background ring-1 ring-border">
                                                        {rec.job.company_logo && (
                                                            <AvatarImage
                                                                src={rec.job.company_logo}
                                                                alt={rec.job.company_name ?? 'Logo perusahaan'}
                                                                className="object-contain p-1"
                                                            />
                                                        )}
                                                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-sm font-semibold text-white">
                                                            {getInitials(rec.job.company_name)}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Link
                                                                href={`/jobs/${rec.job.slug}`}
                                                                className="text-base font-semibold tracking-tight hover:text-brand-blue hover:underline sm:text-lg"
                                                            >
                                                                {rec.job.title}
                                                            </Link>
                                                            {recent && (
                                                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                    Baru
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1.5">
                                                                <Building2 className="size-3.5" />
                                                                {rec.job.company_name ?? 'Perusahaan'}
                                                            </span>
                                                            {rec.job.city_name && (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <MapPin className="size-3.5" />
                                                                    {rec.job.city_name}
                                                                </span>
                                                            )}
                                                            {salary && (
                                                                <span className="inline-flex items-center gap-1.5 font-medium text-foreground/80">
                                                                    <Wallet className="size-3.5" />
                                                                    {salary}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() => dismiss(rec.job.slug)}
                                                        aria-label={`Sembunyikan rekomendasi ${rec.job.title}`}
                                                        className="size-11 shrink-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    >
                                                        <X className="size-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5">
                                                    {rec.job.employment_type && (
                                                        <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground/80">
                                                            <Briefcase className="size-3" />
                                                            {formatStatus(rec.job.employment_type)}
                                                        </span>
                                                    )}
                                                    {rec.job.work_arrangement && (
                                                        <span className="inline-flex items-center rounded-md border border-brand-blue/20 bg-brand-blue/5 px-2 py-0.5 text-xs font-medium text-brand-navy dark:text-brand-cyan">
                                                            {formatStatus(rec.job.work_arrangement)}
                                                        </span>
                                                    )}
                                                    {rec.job.category_name && (
                                                        <span className="inline-flex items-center gap-1 rounded-md border border-dashed bg-background px-2 py-0.5 text-xs text-muted-foreground">
                                                            <Tag className="size-3" />
                                                            {rec.job.category_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right: match score panel */}
                                            <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card/50 p-4 lg:bg-muted/20">
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="space-y-0.5">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                                <Sparkles className="size-3.5" />
                                                                Match Score
                                                            </div>
                                                            <span
                                                                className={cn(
                                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                                                    palette.badge,
                                                                )}
                                                            >
                                                                {palette.label}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-bold leading-none tracking-tight">
                                                                {rec.score}
                                                                <span className="text-sm font-medium text-muted-foreground">/100</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className={cn('relative h-2 w-full overflow-hidden rounded-full', palette.track)}>
                                                        <div
                                                            className={cn('h-full rounded-full transition-all', palette.fill)}
                                                            style={{ width: `${Math.max(0, Math.min(100, rec.score))}%` }}
                                                        />
                                                    </div>

                                                    <p className="text-xs leading-relaxed text-muted-foreground">
                                                        {rec.explanation}
                                                    </p>
                                                </div>

                                                <Button asChild size="sm" className="w-full">
                                                    <Link href={`/jobs/${rec.job.slug}`}>
                                                        Lihat Detail <ArrowRight className="size-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Section>
            </div>
        </>
    );
}
