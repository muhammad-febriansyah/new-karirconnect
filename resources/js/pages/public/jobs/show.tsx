import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bookmark, BookmarkCheck, Briefcase, Building2, Calendar, Eye, MapPin, Sparkles, Star } from 'lucide-react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/format-date';
import { destroy as savedJobDestroy, store as savedJobStore } from '@/routes/employee/saved-jobs';
import type { Auth } from '@/types';

type Job = {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    min_education: string | null;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    is_featured: boolean;
    is_anonymous: boolean;
    published_at: string | null;
    application_deadline: string | null;
    company: {
        id?: number;
        slug?: string;
        name: string;
        logo_url: string | null;
        verification_status: string | null;
    };
    company_about: string | null;
    province: string | null;
    city: string | null;
    skills: string[];
    screening_questions: { id: number; question: string; type: string | null; is_required: boolean }[];
    views_count: number;
    applications_count: number;
};

type Props = {
    job: Job;
    matchScore: number | null;
    isSaved: boolean;
    similar: Array<{ id: number; slug: string; title: string; company: { name: string; logo_url: string | null }; city: string | null }>;
};

function formatRupiah(value: number | null): string {
    if (!value) return '';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
}

export default function PublicJobShow({ job, matchScore, isSaved, similar }: Props) {
    const auth = (usePage().props as unknown as { auth?: Auth }).auth;
    const isEmployee = auth?.user?.role === 'employee';

    const toggleSave = () => {
        if (!auth?.user) {
            router.visit('/login');
            return;
        }
        if (isSaved) {
            router.delete(savedJobDestroy(job.id).url, { preserveScroll: true });
        } else {
            router.post(savedJobStore(job.id).url, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title={job.title} />

            <div className="space-y-6">
                <PageHeader
                    title={job.title}
                    description={job.is_anonymous ? 'Confidential Employer' : job.company.name}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {isEmployee && (
                                <Button variant={isSaved ? 'default' : 'outline'} onClick={toggleSave}>
                                    {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                                    {isSaved ? 'Tersimpan' : 'Simpan'}
                                </Button>
                            )}
                            <Button asChild>
                                <Link href={`/jobs/${job.slug}/apply`}>Lamar Sekarang</Link>
                            </Button>
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-6">
                        <Section>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {job.city ?? '-'}{job.province ? `, ${job.province}` : ''}</span>
                                <span className="flex items-center gap-1.5"><Briefcase className="size-4" /> {job.employment_type ?? '-'}</span>
                                {job.work_arrangement && <span>{job.work_arrangement}</span>}
                                {job.experience_level && <Badge variant="secondary">{job.experience_level}</Badge>}
                                {job.is_featured && <Badge className="gap-1"><Star className="size-3" /> Featured</Badge>}
                                {job.application_deadline && (
                                    <span className="flex items-center gap-1.5"><Calendar className="size-4" /> Tenggat {formatDate(job.application_deadline)}</span>
                                )}
                            </div>
                            {job.is_salary_visible && job.salary_min && (
                                <p className="mt-3 text-lg font-semibold">
                                    {formatRupiah(job.salary_min)}
                                    {job.salary_max && job.salary_max !== job.salary_min ? ` – ${formatRupiah(job.salary_max)}` : ''}
                                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ bulan</span>
                                </p>
                            )}
                            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1"><Eye className="size-4" /> {job.views_count} dilihat</span>
                                <span>{job.applications_count} pelamar</span>
                            </div>
                        </Section>

                        {job.skills.length > 0 && (
                            <Section title="Skill yang Dicari">
                                <div className="flex flex-wrap gap-1.5">
                                    {job.skills.map((skill) => (
                                        <Badge key={skill} variant="secondary">{skill}</Badge>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {job.description && (
                            <Section title="Deskripsi">
                                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: job.description }} />
                            </Section>
                        )}
                        {job.responsibilities && (
                            <Section title="Tanggung Jawab">
                                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: job.responsibilities }} />
                            </Section>
                        )}
                        {job.requirements && (
                            <Section title="Kualifikasi">
                                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: job.requirements }} />
                            </Section>
                        )}
                        {job.benefits && (
                            <Section title="Benefit">
                                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: job.benefits }} />
                            </Section>
                        )}
                    </div>

                    <aside className="space-y-4">
                        {matchScore !== null && (
                            <Card>
                                <CardContent className="space-y-3 p-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="size-4 text-primary" />
                                        <h3 className="text-sm font-semibold">Match Score</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-3xl font-bold">{matchScore}</span>
                                        <span className="text-xs text-muted-foreground">/ 100</span>
                                    </div>
                                    <Progress value={matchScore} />
                                    <p className="text-xs text-muted-foreground">
                                        Berdasarkan skill, pengalaman, lokasi, dan ekspektasi gaji Anda.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                                        {job.company.logo_url ? (
                                            <img src={job.company.logo_url} alt={job.company.name} className="size-full object-cover" />
                                        ) : (
                                            <Building2 className="size-6 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{job.company.name}</h3>
                                        {job.company.verification_status === 'verified' && (
                                            <StatusBadge tone="success">Verified</StatusBadge>
                                        )}
                                    </div>
                                </div>
                                {job.company_about && (
                                    <p className="line-clamp-4 text-sm text-muted-foreground">{job.company_about}</p>
                                )}
                                {!job.is_anonymous && job.company.slug && (
                                    <Button asChild size="sm" variant="outline" className="w-full">
                                        <Link href={`/companies/${job.company.slug}`}>Lihat Profil Perusahaan</Link>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {similar.length > 0 && (
                            <Card>
                                <CardContent className="space-y-3 p-4">
                                    <h3 className="text-sm font-semibold">Lowongan Serupa</h3>
                                    <ul className="space-y-3">
                                        {similar.map((s) => (
                                            <li key={s.id}>
                                                <Link href={`/jobs/${s.slug}`} className="block text-sm font-medium hover:underline">
                                                    {s.title}
                                                </Link>
                                                <span className="text-xs text-muted-foreground">{s.company.name}{s.city ? ` · ${s.city}` : ''}</span>
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
