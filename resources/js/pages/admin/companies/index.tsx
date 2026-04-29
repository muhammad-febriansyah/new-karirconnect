import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, Eye, Search, ShieldOff } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { approve as companyApprove, index as adminCompaniesIndex, show as companyShow, suspend as companySuspend } from '@/routes/admin/companies';

type Owner = { id: number; name: string; email: string };
type Company = {
    id: number;
    name: string;
    slug: string;
    status: string;
    verification_status: string;
    owner: Owner | null;
    members_count: number;
    created_at: string;
};

type Pagination = {
    data: Company[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number;
    to: number;
};

type Props = {
    companies: Pagination;
    filters: { status: string; search: string };
    statusOptions: { value: string; label: string }[];
};

export default function AdminCompaniesIndex({ companies, filters, statusOptions }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [pendingAction, setPendingAction] = useState<{ type: 'approve' | 'suspend'; company: Company } | null>(null);

    const applyFilters = (next: Partial<{ status: string; search: string }>) => {
        router.get(
            adminCompaniesIndex().url,
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const handleConfirm = () => {
        if (!pendingAction) {
            return;
        }

        const url = pendingAction.type === 'approve'
            ? companyApprove(pendingAction.company.id).url
            : companySuspend(pendingAction.company.id).url;
        router.post(url, {}, {
            preserveScroll: true,
            onFinish: () => setPendingAction(null),
        });
    };

    return (
        <>
            <Head title="Manajemen Perusahaan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Perusahaan"
                    description="Setujui, lihat detail, dan nonaktifkan akun perusahaan di platform."
                />

                <Section>
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 md:max-w-xs">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari nama perusahaan…"
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search })}
                            />
                        </div>
                        <select
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            value={filters.status}
                            onChange={(e) => applyFilters({ status: e.target.value })}
                        >
                            <option value="">Semua Status</option>
                            {statusOptions.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <Button variant="outline" onClick={() => applyFilters({ search, status: filters.status })}>
                            <Search className="size-4" /> Cari
                        </Button>
                    </div>

                    {companies.data.length === 0 ? (
                        <EmptyState
                            title="Belum ada perusahaan"
                            description="Tidak ada perusahaan yang cocok dengan filter."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Verifikasi</TableHead>
                                    <TableHead>Tim</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {companies.data.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{c.owner?.name}</div>
                                            <div className="text-xs text-muted-foreground">{c.owner?.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge tone={c.status === 'approved' ? 'success' : c.status === 'suspended' ? 'destructive' : 'warning'}>
                                                {c.status}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge tone={c.verification_status === 'verified' ? 'success' : 'muted'}>
                                                {c.verification_status}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell>{c.members_count}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button asChild size="sm" variant="ghost">
                                                    <Link href={companyShow(c.id).url}>
                                                        <Eye className="size-4" />
                                                    </Link>
                                                </Button>
                                                {c.status !== 'approved' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setPendingAction({ type: 'approve', company: c })}
                                                    >
                                                        <CheckCircle2 className="size-4" /> Setujui
                                                    </Button>
                                                )}
                                                {c.status !== 'suspended' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setPendingAction({ type: 'suspend', company: c })}
                                                    >
                                                        <ShieldOff className="size-4" /> Suspend
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>{companies.from ?? 0}–{companies.to ?? 0} dari {companies.total}</span>
                        <div className="flex gap-1">
                            {companies.links.map((l, i) => (
                                <Button
                                    key={i}
                                    variant={l.active ? 'default' : 'outline'}
                                    size="sm"
                                    disabled={!l.url}
                                    onClick={() => l.url && router.get(l.url)}
                                    dangerouslySetInnerHTML={{ __html: l.label }}
                                />
                            ))}
                        </div>
                    </div>
                </Section>
            </div>

            <ConfirmDialog
                open={pendingAction !== null}
                onOpenChange={(open) => !open && setPendingAction(null)}
                title={pendingAction?.type === 'approve' ? 'Setujui perusahaan?' : 'Nonaktifkan perusahaan?'}
                description={
                    pendingAction
                        ? `${pendingAction.company.name} akan ${pendingAction.type === 'approve' ? 'dapat' : 'tidak dapat'} memposting lowongan.`
                        : ''
                }
                confirmLabel={pendingAction?.type === 'approve' ? 'Setujui' : 'Nonaktifkan'}
                variant={pendingAction?.type === 'suspend' ? 'destructive' : 'default'}
                confirmIcon={pendingAction?.type === 'approve' ? CheckCircle2 : ShieldOff}
                onConfirm={handleConfirm}
            />
        </>
    );
}
