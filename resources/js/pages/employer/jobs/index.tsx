import { Head, Link, router } from '@inertiajs/react';
import { Eye, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
    company: { id: number; name: string };
    jobs: {
        data: Array<{
            id: number;
            title: string;
            slug: string;
            status: string;
            applications_count: number;
            views_count: number;
            published_at: string | null;
            category: { id: number; name: string } | null;
            city: { id: number; name: string } | null;
            skills: Array<{ id: number; name: string }>;
            screening_questions_count: number;
        }>;
        total: number;
    };
    filters: { status: string; search: string };
    statusOptions: Array<{ value: string; label: string }>;
};

export default function EmployerJobsIndex({ company, jobs, filters, statusOptions }: Props) {
    const [search, setSearch] = useState(filters.search);

    const applyFilters = (next: Partial<typeof filters>) => {
        router.get(JobController.index().url, { ...filters, ...next }, { preserveScroll: true, preserveState: true, replace: true });
    };

    return (
        <>
            <Head title="Lowongan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Lowongan"
                    description={`Kelola lowongan aktif untuk ${company.name}.`}
                    actions={
                        <Button asChild>
                            <Link href={JobController.create().url}>
                                <Plus className="size-4" />
                                Buat Lowongan
                            </Link>
                        </Button>
                    }
                />

                <Section>
                    <div className="mb-4 flex flex-wrap gap-2">
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                className="pl-8"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        applyFilters({ search });
                                    }
                                }}
                                placeholder="Cari judul lowongan"
                            />
                        </div>
                        <select
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            value={filters.status}
                            onChange={(event) => applyFilters({ status: event.target.value })}
                        >
                            <option value="">Semua Status</option>
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <Button variant="outline" onClick={() => applyFilters({ search })}>
                            Cari
                        </Button>
                    </div>

                    {jobs.data.length === 0 ? (
                        <EmptyState title="Belum ada lowongan" description="Mulai dengan membuat lowongan pertama Anda." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lowongan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Statistik</TableHead>
                                    <TableHead>Screening</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.data.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <div className="font-medium">{job.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {job.category?.name ?? '-'} • {job.city?.name ?? 'Lokasi fleksibel'}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge tone={(job.status === 'published' ? 'success' : job.status === 'closed' ? 'warning' : 'secondary')}>
                                                {job.status}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {job.views_count} views • {job.applications_count} aplikasi
                                        </TableCell>
                                        <TableCell>{job.screening_questions_count}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={JobController.edit(job.slug).url}>Ubah</Link>
                                                </Button>
                                                <Button asChild size="sm" variant="ghost">
                                                    <Link href={JobController.show(job.slug).url}>
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Section>
            </div>
        </>
    );
}

EmployerJobsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
    ],
};
