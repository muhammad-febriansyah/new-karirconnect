import { Head, Link, router } from '@inertiajs/react';
import { Building2, Eye, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Application = {
    id: number;
    status: string | null;
    ai_match_score: number | null;
    applied_at: string | null;
    job: { id: number; title: string; slug: string };
    company: { name: string | null; slug: string | null; logo_url: string | null };
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    applications: Pagination<Application>;
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

export default function ApplicationsIndex({ applications }: Props) {
    return (
        <>
            <Head title="Lamaran Saya" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Lamaran Saya"
                    description="Pantau status lamaran yang sudah Anda kirim."
                />

                <Section>
                    {applications.data.length === 0 ? (
                        <EmptyState
                            title="Belum ada lamaran"
                            description="Telusuri lowongan dan kirim lamaran pertama Anda."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lowongan</TableHead>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Dikirim</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.data.map((a) => (
                                    <TableRow key={a.id}>
                                        <TableCell>
                                            <Link href={`/jobs/${a.job.slug}`} className="font-medium hover:underline">
                                                {a.job.title}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="flex size-8 items-center justify-center overflow-hidden rounded border bg-muted">
                                                    {a.company.logo_url ? (
                                                        <img src={a.company.logo_url} alt={a.company.name ?? ''} className="size-full object-cover" />
                                                    ) : (
                                                        <Building2 className="size-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <span className="text-sm">{a.company.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {a.ai_match_score !== null ? (
                                                <div className="flex items-center gap-1">
                                                    <Sparkles className="size-3.5 text-primary" />
                                                    <span className="font-semibold">{a.ai_match_score}</span>
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
                                                <Link href={`/employee/applications/${a.id}`}>
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
                        <span>{applications.from ?? 0}–{applications.to ?? 0} dari {applications.total}</span>
                        <div className="flex gap-1">
                            {applications.links.map((l, i) => (
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
