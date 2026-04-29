import { Head, Link, router } from '@inertiajs/react';
import { Eye, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { index as applicantsIndex } from '@/routes/employer/applicants';

type Option = { value: string; label: string };

type Applicant = {
    id: number;
    status: string | null;
    ai_match_score: number | null;
    expected_salary: number | null;
    applied_at: string | null;
    job: { id: number; title: string; slug: string };
    candidate: {
        id: number;
        name: string | null;
        email: string | null;
        city: string | null;
        avatar_url: string | null;
    };
    cv_url: string | null;
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    applicants: Pagination<Applicant>;
    filters: { job: number | null; status: string };
    jobOptions: Option[];
    statusOptions: Option[];
};

const statusTone = (status: string | null) => {
    switch (status) {
        case 'submitted':
            return 'info';
        case 'reviewed':
        case 'shortlisted':
        case 'interview':
            return 'primary';
        case 'offered':
            return 'warning';
        case 'hired':
            return 'success';
        case 'rejected':
        case 'withdrawn':
            return 'destructive';
        default:
            return 'muted';
    }
};

export default function ApplicantsIndex({ applicants, filters, jobOptions, statusOptions }: Props) {
    const apply = (next: Partial<Props['filters']>) => {
        router.get(applicantsIndex().url, { ...filters, ...next }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Pelamar" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Pelamar"
                    description="Tinjau lamaran yang masuk dan kelola statusnya."
                />

                <Section>
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Select
                            value={String(filters.job ?? '')}
                            onValueChange={(v) => apply({ job: v === 'all' ? null : Number(v) })}
                        >
                            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Semua lowongan" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua lowongan</SelectItem>
                                {jobOptions.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={filters.status}
                            onValueChange={(v) => apply({ status: v === 'all' ? '' : v })}
                        >
                            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Semua status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua status</SelectItem>
                                {statusOptions.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {applicants.data.length === 0 ? (
                        <EmptyState
                            title="Belum ada pelamar"
                            description="Sebarkan lowongan Anda agar mendapatkan kandidat berkualitas."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kandidat</TableHead>
                                    <TableHead>Lowongan</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Dikirim</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applicants.data.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>
                                            <div className="font-medium">{a.candidate.name}</div>
                                            <div className="text-xs text-muted-foreground">{a.candidate.email}</div>
                                            {a.candidate.city && (
                                                <div className="text-xs text-muted-foreground">{a.candidate.city}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Link href={`/jobs/${a.job.slug}`} className="text-sm font-medium hover:underline">
                                                {a.job.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {a.ai_match_score !== null ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Sparkles className="size-3.5 text-primary" />
                                                    <span className="font-semibold">{a.ai_match_score}</span>
                                                    <span className="text-xs text-muted-foreground">/100</span>
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge tone={statusTone(a.status) as never}>{a.status}</StatusBadge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {a.applied_at ? formatDateTime(a.applied_at) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="ghost">
                                                <Link href={`/employer/applicants/${a.id}`}>
                                                    <Eye className="size-4" /> Detail
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{applicants.from ?? 0}–{applicants.to ?? 0} dari {applicants.total}</span>
                        <div className="flex gap-1">
                            {applicants.links.map((l, i) => (
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
                </Section>
            </div>
        </>
    );
}
