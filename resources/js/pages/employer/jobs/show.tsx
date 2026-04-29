import { Form, Head, Link } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import JobScreeningQuestionController from '@/actions/App/Http/Controllers/Employer/JobScreeningQuestionController';
import { StatusBadge } from '@/components/feedback/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { InputField } from '@/components/form/input-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format-date';
import { formatSalaryRange } from '@/lib/format-rupiah';

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
        salary_min: number | null;
        salary_max: number | null;
        status: string | null;
        application_deadline: string | null;
        views_count: number;
        applications_count: number;
        category: { id: number; name: string } | null;
        city: { id: number; name: string } | null;
        skills: Array<{ id: number; name: string }>;
        screening_questions: Question[];
    };
    screeningTypeOptions: Array<{ value: string; label: string }>;
};

export default function EmployerJobShow({ job, screeningTypeOptions }: Props) {
    return (
        <>
            <Head title={job.title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={job.title}
                    description={`${job.category?.name ?? '-'} • ${job.city?.name ?? 'Lokasi fleksibel'}`}
                    actions={
                        <div className="flex gap-2">
                            <StatusBadge tone={job.status === 'published' ? 'success' : job.status === 'closed' ? 'warning' : 'secondary'}>
                                {job.status}
                            </StatusBadge>
                            <Button asChild variant="outline">
                                <Link href={JobController.edit(job.slug).url}>
                                    <Pencil className="size-4" />
                                    Ubah
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Ringkasan">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <dt className="text-muted-foreground">Tipe kerja</dt>
                            <dd>{job.employment_type ?? '-'}</dd>
                            <dt className="text-muted-foreground">Pengaturan kerja</dt>
                            <dd>{job.work_arrangement ?? '-'}</dd>
                            <dt className="text-muted-foreground">Level</dt>
                            <dd>{job.experience_level ?? '-'}</dd>
                            <dt className="text-muted-foreground">Gaji</dt>
                            <dd>{formatSalaryRange(job.salary_min, job.salary_max)}</dd>
                            <dt className="text-muted-foreground">Deadline</dt>
                            <dd>{formatDate(job.application_deadline) || '-'}</dd>
                            <dt className="text-muted-foreground">Views</dt>
                            <dd>{job.views_count}</dd>
                            <dt className="text-muted-foreground">Aplikasi</dt>
                            <dd>{job.applications_count}</dd>
                        </dl>
                    </Section>

                    <Section title="Skill">
                        {job.skills.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada skill terkait.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {job.skills.map((skill) => (
                                    <StatusBadge key={skill.id} tone="primary">
                                        {skill.name}
                                    </StatusBadge>
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                {job.description && (
                    <Section title="Deskripsi">
                        <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: job.description }} />
                    </Section>
                )}

                <Section
                    title="Pertanyaan Screening"
                    description="Pertanyaan ini akan tampil saat kandidat melamar."
                    actions={
                        <ScreeningQuestionDialog
                            jobSlug={job.slug}
                            screeningTypeOptions={screeningTypeOptions}
                            triggerLabel="Tambah Pertanyaan"
                        />
                    }
                >
                    {job.screening_questions.length === 0 ? (
                        <EmptyState title="Belum ada pertanyaan screening" description="Tambahkan pertanyaan singkat untuk membantu penyaringan awal." />
                    ) : (
                        <div className="space-y-3">
                            {job.screening_questions.map((question) => (
                                <div key={question.id} className="rounded-lg border p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-medium">{question.order_number}. {question.question}</div>
                                            <div className="mt-1 text-xs text-muted-foreground">
                                                {question.type} • {question.is_required ? 'Wajib' : 'Opsional'}
                                            </div>
                                            {question.options.length > 0 && (
                                                <div className="mt-2 text-sm text-muted-foreground">
                                                    Opsi: {question.options.join(', ')}
                                                </div>
                                            )}
                                            {question.knockout_value.length > 0 && (
                                                <div className="mt-1 text-sm text-muted-foreground">
                                                    Knockout: {question.knockout_value.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <ScreeningQuestionDialog
                                                jobSlug={job.slug}
                                                question={question}
                                                screeningTypeOptions={screeningTypeOptions}
                                                triggerLabel="Ubah"
                                            />
                                            <Form {...JobScreeningQuestionController.destroy.form([job.slug, question.id])}>
                                                {({ processing }) => (
                                                    <Button type="submit" variant="ghost" size="sm" disabled={processing}>
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
                </Section>
            </div>
        </>
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
                <Button variant={isEdit ? 'outline' : 'default'} size="sm">
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
                                <Button type="submit" disabled={processing}>
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
