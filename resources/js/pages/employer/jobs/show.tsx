import { Form, Head, Link } from '@inertiajs/react';
import {
    Award,
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    Clock,
    Eye,
    Globe2,
    GraduationCap,
    Hash,
    HelpCircle,
    MapPin,
    Pencil,
    Plus,
    Sparkles,
    Target,
    Trash2,
    TrendingUp,
    Users,
    Wand2,
} from 'lucide-react';
import JobBoostController from '@/actions/App/Http/Controllers/Employer/JobBoostController';
import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import JobScreeningQuestionController from '@/actions/App/Http/Controllers/Employer/JobScreeningQuestionController';
import { EmptyState } from '@/components/feedback/empty-state';
import { InputField } from '@/components/form/input-field';
import { SafeHtml } from '@/components/shared/safe-html';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format-date';
import { formatSalaryRange } from '@/lib/format-rupiah';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type Question = {
    id: number;
    question: string;
    type: string | null;
    options: string[];
    knockout_value: string[];
    is_required: boolean;
    order_number: number;
};

type Props = {
    job: {
        id: number;
        title: string;
        slug: string;
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
        status: string | null;
        application_deadline: string | null;
        is_featured?: boolean;
        featured_until?: string | null;
        views_count: number;
        applications_count: number;
        ai_match_threshold: number | null;
        auto_invite_ai_interview: boolean;
        published_at: string | null;
        closed_at: string | null;
        category: { id: number; name: string } | null;
        city: { id: number; name: string } | null;
        skills: Array<{ id: number; name: string }>;
        screening_questions: Question[];
    };
    screeningTypeOptions: Array<{ value: string; label: string }>;
};

const statusMeta = (status: string | null): { label: string; className: string } => {
    switch (status) {
        case 'published':
            return { label: 'Aktif', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' };
        case 'draft':
            return { label: 'Draft', className: 'border-slate-500/30 bg-slate-500/10 text-slate-700' };
        case 'closed':
            return { label: 'Ditutup', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700' };
        case 'expired':
            return { label: 'Kadaluarsa', className: 'border-rose-500/30 bg-rose-500/10 text-rose-700' };
        default:
            return { label: formatStatus(status) ?? '-', className: 'border-slate-500/30 bg-slate-500/10 text-slate-700' };
    }
};

const daysUntil = (iso: string | null): number | null => {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    if (ms < 0) return -1;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
};

export default function EmployerJobShow({ job, screeningTypeOptions }: Props) {
    const status = statusMeta(job.status);
    const deadlineDays = daysUntil(job.application_deadline);
    const salaryLabel = job.is_salary_visible ? formatSalaryRange(job.salary_min, job.salary_max) : 'Tidak ditampilkan';

    const stats = [
        {
            label: 'Tayangan',
            value: job.views_count.toLocaleString('id-ID'),
            icon: Eye,
            tone: 'from-brand-blue to-brand-cyan',
        },
        {
            label: 'Pelamar',
            value: job.applications_count.toLocaleString('id-ID'),
            icon: Users,
            tone: 'from-brand-cyan to-emerald-500',
        },
        {
            label: deadlineDays === null ? 'Deadline' : deadlineDays < 0 ? 'Lewat' : 'Sisa hari',
            value: deadlineDays === null ? '–' : deadlineDays < 0 ? `${Math.abs(deadlineDays)} hari` : `${deadlineDays} hari`,
            icon: Calendar,
            tone: deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7 ? 'from-amber-500 to-rose-500' : 'from-brand-navy to-brand-blue',
        },
        {
            label: 'Match Threshold',
            value: job.ai_match_threshold !== null ? `${job.ai_match_threshold}%` : '–',
            icon: Target,
            tone: 'from-violet-500 to-brand-blue',
        },
    ];

    return (
        <>
            <Head title={job.title} />

            <div className="space-y-5 p-4 sm:p-6">
                {/* ===== Hero ===== */}
                <Card className="relative overflow-hidden border-brand-blue/15">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-brand-blue/12 via-brand-cyan/10 to-transparent"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-cyan/15 blur-3xl"
                    />
                    <CardContent className="relative space-y-5 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className={cn('border', status.className)} variant="outline">
                                        <span className="mr-1 inline-block size-1.5 rounded-full bg-current" />
                                        {status.label}
                                    </Badge>
                                    {job.is_featured && (
                                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700" variant="outline">
                                            <Sparkles className="size-3" /> Featured
                                            {job.featured_until && (
                                                <span className="ml-1 opacity-70">s/d {formatDate(job.featured_until)}</span>
                                            )}
                                        </Badge>
                                    )}
                                    {job.category && (
                                        <Badge variant="outline" className="font-medium">
                                            <Hash className="size-3" /> {job.category.name}
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                    {job.title}
                                </h1>
                                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                                    {job.city && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <MapPin className="size-4 text-brand-blue" /> {job.city.name}
                                        </span>
                                    )}
                                    {job.employment_type && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Briefcase className="size-4 text-brand-blue" /> {formatStatus(job.employment_type)}
                                        </span>
                                    )}
                                    {job.work_arrangement && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Globe2 className="size-4 text-brand-blue" /> {formatStatus(job.work_arrangement)}
                                        </span>
                                    )}
                                    {job.experience_level && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Award className="size-4 text-brand-blue" /> {formatStatus(job.experience_level)}
                                        </span>
                                    )}
                                </div>
                                <div className="rounded-xl border border-brand-blue/15 bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 p-3.5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">
                                                Range Gaji
                                            </div>
                                            <div className="mt-0.5 text-lg font-bold text-brand-navy">
                                                {salaryLabel}
                                            </div>
                                        </div>
                                        <Sparkles className="size-7 text-brand-cyan" />
                                    </div>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
                                <Button
                                    asChild
                                    className="bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                                >
                                    <Link href={`/employer/applicants?job=${job.id}`}>
                                        <Users className="size-4" />
                                        Lihat {job.applications_count} Pelamar
                                    </Link>
                                </Button>
                                <Form
                                    {...JobBoostController.store.form(job.slug)}
                                    onBefore={() =>
                                        confirm('Boost lowongan ini selama 30 hari (Rp 199.000)? Akan diarahkan ke pembayaran Duitku.')
                                    }
                                >
                                    {({ processing }) => (
                                        <Button type="submit" variant="outline" disabled={processing}>
                                            <Sparkles className="size-4" />
                                            {job.is_featured ? 'Perpanjang Boost' : 'Boost Lowongan'}
                                        </Button>
                                    )}
                                </Form>
                                <Button asChild variant="outline">
                                    <Link href={JobController.edit(job.slug).url}>
                                        <Pencil className="size-4" /> Ubah
                                    </Link>
                                </Button>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={`/jobs/${job.slug}`} target="_blank">
                                        <Eye className="size-3.5" /> Lihat versi publik
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* Stats grid */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {stats.map((s) => (
                                <div
                                    key={s.label}
                                    className="relative overflow-hidden rounded-xl border border-border/60 bg-background p-3.5"
                                >
                                    <div
                                        aria-hidden
                                        className={cn(
                                            'pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-gradient-to-br opacity-15 blur-xl',
                                            s.tone,
                                        )}
                                    />
                                    <div className="relative flex items-center gap-3">
                                        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm', s.tone)}>
                                            <s.icon className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                {s.label}
                                            </div>
                                            <div className="truncate text-lg font-bold text-brand-navy">{s.value}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* ===== Body grid ===== */}
                <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                        {/* Content blocks */}
                        {job.description && (
                            <ContentCard title="Deskripsi" icon={Briefcase} html={job.description} />
                        )}
                        {job.responsibilities && (
                            <ContentCard title="Tanggung Jawab" icon={BadgeCheck} html={job.responsibilities} />
                        )}
                        {job.requirements && (
                            <ContentCard title="Persyaratan" icon={Target} html={job.requirements} />
                        )}
                        {job.benefits && (
                            <ContentCard title="Benefit" icon={Sparkles} html={job.benefits} />
                        )}

                        {/* Screening questions */}
                        <Card>
                            <CardContent className="space-y-3 p-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                            <HelpCircle className="size-3.5" /> Pertanyaan Screening
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Pertanyaan ini tampil saat kandidat melamar untuk membantu penyaringan awal.
                                        </p>
                                    </div>
                                    <ScreeningQuestionDialog
                                        jobSlug={job.slug}
                                        screeningTypeOptions={screeningTypeOptions}
                                        triggerLabel="Tambah Pertanyaan"
                                    />
                                </div>

                                {job.screening_questions.length === 0 ? (
                                    <EmptyState
                                        bare
                                        icon={HelpCircle}
                                        title="Belum ada pertanyaan screening"
                                        description="Tambahkan pertanyaan singkat untuk membantu penyaringan awal kandidat."
                                    />
                                ) : (
                                    <div className="space-y-2.5">
                                        {job.screening_questions.map((question) => (
                                            <div
                                                key={question.id}
                                                className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-brand-blue/30"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start gap-2.5">
                                                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-xs font-bold text-brand-blue">
                                                                {question.order_number}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-brand-navy">{question.question}</div>
                                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                                                    <Badge variant="outline" className="font-medium">
                                                                        {formatStatus(question.type ?? '')}
                                                                    </Badge>
                                                                    {question.is_required ? (
                                                                        <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-700" variant="outline">
                                                                            Wajib
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-muted-foreground">
                                                                            Opsional
                                                                        </Badge>
                                                                    )}
                                                                    {question.knockout_value.length > 0 && (
                                                                        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700" variant="outline">
                                                                            Knockout
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {question.options.length > 0 && (
                                                                    <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                                                                        {question.options.map((opt) => (
                                                                            <span
                                                                                key={opt}
                                                                                className={cn(
                                                                                    'rounded-md px-2 py-0.5',
                                                                                    question.knockout_value.includes(opt)
                                                                                        ? 'bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20'
                                                                                        : 'bg-muted',
                                                                                )}
                                                                            >
                                                                                {opt}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 gap-1">
                                                        <ScreeningQuestionDialog
                                                            jobSlug={job.slug}
                                                            question={question}
                                                            screeningTypeOptions={screeningTypeOptions}
                                                            triggerLabel="Ubah"
                                                        />
                                                        <Form {...JobScreeningQuestionController.destroy.form([job.slug, question.id])}>
                                                            {({ processing }) => (
                                                                <Button
                                                                    type="submit"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={processing}
                                                                    className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                                                                >
                                                                    <Trash2 className="size-4" />
                                                                </Button>
                                                            )}
                                                        </Form>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ===== Sidebar ===== */}
                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        {/* Skills */}
                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <Sparkles className="size-3.5" /> Skill Diperlukan
                                    </h3>
                                    <span className="text-xs text-muted-foreground">{job.skills.length}</span>
                                </div>
                                {job.skills.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        Belum ada skill terkait. Tambahkan via tombol Ubah agar match score lebih akurat.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {job.skills.map((skill) => (
                                            <Badge
                                                key={skill.id}
                                                className="border-brand-blue/15 bg-brand-blue/8 font-medium text-brand-blue"
                                                variant="outline"
                                            >
                                                {skill.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detail */}
                        <Card>
                            <CardContent className="space-y-2.5 p-4 text-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    Detail Lowongan
                                </h3>
                                <DetailRow icon={GraduationCap} label="Pendidikan min." value={formatStatus(job.min_education ?? '') || 'Tidak ditentukan'} />
                                <DetailRow icon={Calendar} label="Deadline" value={formatDate(job.application_deadline) || 'Tidak ada'} />
                                <DetailRow
                                    icon={Clock}
                                    label="Dipublikasikan"
                                    value={job.published_at ? formatDate(job.published_at) : '–'}
                                />
                                {job.closed_at && (
                                    <DetailRow icon={Clock} label="Ditutup" value={formatDate(job.closed_at)} />
                                )}
                            </CardContent>
                        </Card>

                        {/* AI Settings */}
                        <Card className="border-brand-blue/15 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
                            <CardContent className="space-y-2.5 p-4 text-sm">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <Wand2 className="size-3.5" /> Otomatisasi AI
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Match Threshold</span>
                                    <strong className="text-brand-navy">
                                        {job.ai_match_threshold !== null ? `${job.ai_match_threshold}%` : 'Tidak diset'}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Auto-invite AI Interview</span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'font-medium',
                                            job.auto_invite_ai_interview
                                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {job.auto_invite_ai_interview ? 'Aktif' : 'Nonaktif'}
                                    </Badge>
                                </div>
                                <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                                    Kandidat dengan match ≥ threshold akan otomatis diundang AI Interview untuk percepat seleksi.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Performance hint */}
                        <Card>
                            <CardContent className="space-y-2.5 p-4 text-sm">
                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <TrendingUp className="size-3.5" /> Konversi
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Apply rate</span>
                                    <strong className="text-brand-navy">
                                        {job.views_count > 0
                                            ? `${((job.applications_count / job.views_count) * 100).toFixed(1)}%`
                                            : '–'}
                                    </strong>
                                </div>
                                <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                                    Rasio view → apply membantu memantau efektivitas iklan lowongan.
                                </p>
                            </CardContent>
                        </Card>
                    </aside>
                </div>
            </div>
        </>
    );
}

function ContentCard({ title, icon: Icon, html }: { title: string; icon: typeof Briefcase; html: string }) {
    return (
        <Card>
            <CardContent className="space-y-3 p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                    <Icon className="size-3.5" /> {title}
                </h3>
                <SafeHtml html={html} className="prose-sm text-foreground" />
            </CardContent>
        </Card>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Briefcase; label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" /> {label}
            </span>
            <span className="text-right font-medium text-brand-navy">{value}</span>
        </div>
    );
}

function ScreeningQuestionDialog({
    jobSlug,
    question,
    screeningTypeOptions,
    triggerLabel,
}: {
    jobSlug: string;
    question?: Question;
    screeningTypeOptions: Array<{ value: string; label: string }>;
    triggerLabel: string;
}) {
    const isEdit = Boolean(question);

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={isEdit ? 'outline' : 'default'} size="sm" className={!isEdit ? 'bg-gradient-to-r from-brand-blue to-brand-cyan' : undefined}>
                    {!isEdit && <Plus className="size-4" />}
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Ubah Pertanyaan' : 'Tambah Pertanyaan'}</DialogTitle>
                    <DialogDescription>Gunakan baris baru atau koma untuk opsi dan knockout value.</DialogDescription>
                </DialogHeader>

                <Form
                    {...(isEdit
                        ? JobScreeningQuestionController.update.form([jobSlug, question!.id])
                        : JobScreeningQuestionController.store.form(jobSlug))}
                    className="space-y-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <input type="hidden" name="is_required" value="0" />
                            <InputField name="question" label="Pertanyaan" defaultValue={question?.question} required error={errors.question} />
                            <div>
                                <label className="mb-2 block text-sm font-medium">Tipe</label>
                                <select name="type" defaultValue={question?.type ?? 'text'} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                                    {screeningTypeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <InputField
                                name="options_text"
                                label="Opsi"
                                defaultValue={question?.options.join(', ')}
                                error={errors.options}
                            />
                            <InputField
                                name="knockout_value_text"
                                label="Knockout Value"
                                defaultValue={question?.knockout_value.join(', ')}
                                error={errors.knockout_value}
                            />
                            <InputField
                                name="order_number"
                                label="Urutan"
                                type="number"
                                defaultValue={String(question?.order_number ?? 0)}
                                error={errors.order_number}
                            />
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    name="is_required"
                                    value="1"
                                    defaultChecked={question?.is_required ?? true}
                                    className="size-4 rounded border-input"
                                />
                                Wajib diisi
                            </label>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing} className="bg-gradient-to-r from-brand-blue to-brand-cyan">
                                    Simpan
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

EmployerJobShow.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
    ],
};
