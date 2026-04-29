import { Head, Link, router } from '@inertiajs/react';
import { Eye, Search } from 'lucide-react';
import { useState } from 'react';
import JobController from '@/actions/App/Http/Controllers/Admin/JobController';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type Props = {
    jobs: {
        data: Array<{
            id: number;
            title: string;
            slug: string;
            status: string;
            is_featured: boolean;
            company: { id: number; name: string } | null;
            category: { id: number; name: string } | null;
            posted_by: { id: number; name: string; email: string } | null;
        }>;
    };
    filters: { status: string; search: string };
    statusOptions: Array<{ value: string; label: string }>;
};

export default function AdminJobsIndex({ jobs, filters, statusOptions }: Props) {
    const [search, setSearch] = useState(filters.search);

    const applyFilters = (next: Partial<typeof filters>) => {
        router.get(JobController.index().url, { ...filters, ...next }, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <>
            <Head title="Lowongan Admin" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title="Lowongan" description="Monitor lowongan dari seluruh employer dan lakukan moderasi ringan bila dibutuhkan." />

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
                                placeholder="Cari lowongan"
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
                    </div>

                    {jobs.data.length === 0 ? (
                        <EmptyState title="Belum ada lowongan" description="Tidak ada lowongan yang cocok dengan filter saat ini." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lowongan</TableHead>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.data.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <div className="font-medium">{job.title}</div>
                                            <div className="text-xs text-muted-foreground">{job.category?.name ?? '-'}</div>
                                        </TableCell>
                                        <TableCell>{job.company?.name ?? '-'}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <StatusBadge tone={job.status === 'published' ? 'success' : job.status === 'closed' ? 'warning' : 'secondary'}>
                                                    {job.status}
                                                </StatusBadge>
                                                {job.is_featured && <StatusBadge tone="primary">Featured</StatusBadge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild size="sm" variant="ghost">
                                                <Link href={JobController.show(job.slug).url}>
                                                    <Eye className="size-4" />
                                                </Link>
                                            </Button>
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

AdminJobsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
    ],
};
