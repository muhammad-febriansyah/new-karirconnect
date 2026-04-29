import { Form, Head } from '@inertiajs/react';
import JobController from '@/actions/App/Http/Controllers/Admin/JobController';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format-date';
import { formatSalaryRange } from '@/lib/format-rupiah';

type Props = {
    job: {
        id: number;
        title: string;
        slug: string;
        status: string | null;
        employment_type: string | null;
        work_arrangement: string | null;
        experience_level: string | null;
        salary_min: number | null;
        salary_max: number | null;
        is_salary_visible: boolean;
        is_anonymous: boolean;
        is_featured: boolean;
        application_deadline: string | null;
        views_count: number;
        applications_count: number;
        company: { id: number; name: string } | null;
        posted_by: { id: number; name: string; email: string } | null;
        category: { id: number; name: string } | null;
        city: { id: number; name: string } | null;
        skills: Array<{ id: number; name: string }>;
        description: string | null;
        responsibilities: string | null;
        requirements: string | null;
        benefits: string | null;
        screening_questions: Array<{ id: number; question: string; type: string | null; is_required: boolean; order_number: number }>;
    };
    statusOptions: Array<{ value: string; label: string }>;
};

export default function AdminJobShow({ job, statusOptions }: Props) {
    return (
        <>
            <Head title={job.title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={job.title}
                    description={`${job.company?.name ?? '-'} • ${job.category?.name ?? '-'}`}
                    actions={
                        <div className="flex gap-2">
                            <StatusBadge tone={job.status === 'published' ? 'success' : job.status === 'closed' ? 'warning' : 'secondary'}>
                                {job.status}
                            </StatusBadge>
                            {job.is_featured && <StatusBadge tone="primary">Featured</StatusBadge>}
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Ringkasan">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <dt className="text-muted-foreground">Perusahaan</dt>
                            <dd>{job.company?.name ?? '-'}</dd>
                            <dt className="text-muted-foreground">Diposting oleh</dt>
                            <dd>{job.posted_by?.name ?? '-'}</dd>
                            <dt className="text-muted-foreground">Tipe kerja</dt>
                            <dd>{job.employment_type ?? '-'}</dd>
                            <dt className="text-muted-foreground">Pengaturan kerja</dt>
                            <dd>{job.work_arrangement ?? '-'}</dd>
                            <dt className="text-muted-foreground">Level</dt>
                            <dd>{job.experience_level ?? '-'}</dd>
                            <dt className="text-muted-foreground">Lokasi</dt>
                            <dd>{job.city?.name ?? '-'}</dd>
                            <dt className="text-muted-foreground">Deadline</dt>
                            <dd>{formatDate(job.application_deadline) || '-'}</dd>
                            <dt className="text-muted-foreground">Gaji</dt>
                            <dd>{formatSalaryRange(job.salary_min, job.salary_max)}</dd>
                            <dt className="text-muted-foreground">Views</dt>
                            <dd>{job.views_count}</dd>
                            <dt className="text-muted-foreground">Aplikasi</dt>
                            <dd>{job.applications_count}</dd>
                        </dl>
                    </Section>

                    <Section title="Moderasi">
                        <Form {...JobController.update.form(job.slug)} className="space-y-4">
                            {({ processing, errors }) => (
                                <>
                                    <input type="hidden" name="is_featured" value="0" />
                                    <div>
                                        <label className="mb-2 block text-sm font-medium">Status</label>
                                        <select name="status" defaultValue={job.status ?? 'draft'} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                                            {statusOptions.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.status && <p className="mt-1 text-sm text-destructive">{errors.status}</p>}
                                    </div>
                                    <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                        <input type="checkbox" name="is_featured" value="1" defaultChecked={job.is_featured} className="size-4 rounded border-input" />
                                        Featured 30 hari
                                    </label>
                                    <Button type="submit" disabled={processing}>Simpan Moderasi</Button>
                                </>
                            )}
                        </Form>
                    </Section>
                </div>

                {job.skills.length > 0 && (
                    <Section title="Skill">
                        <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill) => (
                                <StatusBadge key={skill.id} tone="primary">{skill.name}</StatusBadge>
                            ))}
                        </div>
                    </Section>
                )}

                <Section title="Pertanyaan Screening">
                    {job.screening_questions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada pertanyaan screening.</p>
                    ) : (
                        <div className="space-y-3">
                            {job.screening_questions.map((question) => (
                                <div key={question.id} className="rounded-md border p-3">
                                    <div className="font-medium">{question.order_number}. {question.question}</div>
                                    <div className="text-xs text-muted-foreground">{question.type} • {question.is_required ? 'Wajib' : 'Opsional'}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

AdminJobShow.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
    ],
};
