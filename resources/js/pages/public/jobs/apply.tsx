import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { type FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { store as applyStore } from '@/routes/public/jobs/apply';

type Question = {
    id: number;
    question: string;
    type: string | null;
    options: string[];
    is_required: boolean;
};

type Props = {
    job: {
        id: number;
        slug: string;
        title: string;
        company: { id: number | null; name: string | null };
        screening_questions: Question[];
    };
    profile: {
        id: number;
        expected_salary: number | null;
        cvs: { id: number; label: string; source: string }[];
        primary_cv_id: number | null;
    };
    alreadyApplied: boolean;
};

export default function ApplyForm({ job, profile, alreadyApplied }: Props) {
    const form = useForm({
        cover_letter: '',
        expected_salary: profile.expected_salary ?? '',
        candidate_cv_id: profile.primary_cv_id ?? (profile.cvs[0]?.id ?? null),
        answers: job.screening_questions.map((q) => ({ question_id: q.id, answer: '' })),
    });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(applyStore({ job: job.slug }).url, { preserveScroll: true });
    };

    if (alreadyApplied) {
        return (
            <>
                <Head title={`Lamar - ${job.title}`} />
                <div className="space-y-6">
                    <PageHeader title={job.title} description={job.company.name ?? undefined} />
                    <EmptyState
                        title="Anda sudah melamar"
                        description="Lamaran Anda untuk lowongan ini sedang ditinjau oleh recruiter."
                    />
                    <div className="flex justify-center">
                        <Button asChild>
                            <Link href="/employee/applications">Lihat Status Lamaran</Link>
                        </Button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title={`Lamar - ${job.title}`} />

            <div className="space-y-6">
                <PageHeader title={`Lamar: ${job.title}`} description={job.company.name ?? undefined} />

                <form onSubmit={onSubmit} className="space-y-6">
                    <Section title="CV yang Digunakan">
                        {profile.cvs.length === 0 ? (
                            <EmptyState
                                title="Belum ada CV"
                                description="Buat CV Anda di CV Builder atau unggah CV terlebih dahulu."
                            />
                        ) : (
                            <RadioGroup
                                value={String(form.data.candidate_cv_id ?? '')}
                                onValueChange={(v) => form.setData('candidate_cv_id', Number(v))}
                                className="space-y-2"
                            >
                                {profile.cvs.map((cv) => (
                                    <Card key={cv.id} className="cursor-pointer">
                                        <CardContent className="flex items-center gap-3 p-3">
                                            <RadioGroupItem value={String(cv.id)} id={`cv-${cv.id}`} />
                                            <Label htmlFor={`cv-${cv.id}`} className="flex-1 cursor-pointer">
                                                <div className="font-medium">{cv.label}</div>
                                                <div className="text-xs text-muted-foreground capitalize">{cv.source}</div>
                                            </Label>
                                        </CardContent>
                                    </Card>
                                ))}
                            </RadioGroup>
                        )}
                    </Section>

                    <Section title="Cover Letter (opsional)">
                        <TextareaField
                            label="Pesan untuk recruiter"
                            rows={6}
                            placeholder="Ceritakan kenapa Anda cocok untuk posisi ini…"
                            value={form.data.cover_letter}
                            onChange={(e) => form.setData('cover_letter', e.target.value)}
                            error={form.errors.cover_letter}
                        />
                    </Section>

                    <Section title="Ekspektasi Gaji">
                        <Input
                            type="number"
                            placeholder="Contoh: 12000000"
                            value={form.data.expected_salary}
                            onChange={(e) => form.setData('expected_salary', e.target.value)}
                        />
                        {form.errors.expected_salary && (
                            <p className="mt-1 text-xs text-destructive">{form.errors.expected_salary}</p>
                        )}
                    </Section>

                    {job.screening_questions.length > 0 && (
                        <Section title="Pertanyaan Screening">
                            <div className="space-y-4">
                                {job.screening_questions.map((q, idx) => (
                                    <div key={q.id} className="space-y-2">
                                        <Label className="font-medium">
                                            {q.question}
                                            {q.is_required && <span className="ml-1 text-destructive">*</span>}
                                        </Label>
                                        {q.type === 'yes_no' ? (
                                            <RadioGroup
                                                value={String(form.data.answers[idx]?.answer ?? '')}
                                                onValueChange={(v) => {
                                                    const next = [...form.data.answers];
                                                    next[idx] = { question_id: q.id, answer: v };
                                                    form.setData('answers', next);
                                                }}
                                            >
                                                <div className="flex gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="yes" id={`q-${q.id}-yes`} />
                                                        <Label htmlFor={`q-${q.id}-yes`}>Ya</Label>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value="no" id={`q-${q.id}-no`} />
                                                        <Label htmlFor={`q-${q.id}-no`}>Tidak</Label>
                                                    </div>
                                                </div>
                                            </RadioGroup>
                                        ) : q.type === 'number' ? (
                                            <Input
                                                type="number"
                                                value={String(form.data.answers[idx]?.answer ?? '')}
                                                onChange={(e) => {
                                                    const next = [...form.data.answers];
                                                    next[idx] = { question_id: q.id, answer: e.target.value };
                                                    form.setData('answers', next);
                                                }}
                                            />
                                        ) : (
                                            <Input
                                                value={String(form.data.answers[idx]?.answer ?? '')}
                                                onChange={(e) => {
                                                    const next = [...form.data.answers];
                                                    next[idx] = { question_id: q.id, answer: e.target.value };
                                                    form.setData('answers', next);
                                                }}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/jobs/${job.slug}`}>Kembali</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing || profile.cvs.length === 0}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            Kirim Lamaran
                        </Button>
                    </div>
                </form>

                <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                    <CheckCircle2 className="mr-2 inline size-4 text-primary" />
                    Lamaran akan dikirim langsung ke recruiter. Pastikan informasi profil dan CV Anda sudah up-to-date.
                </div>
            </div>
        </>
    );
}
