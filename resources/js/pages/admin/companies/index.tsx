import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Briefcase,
    Building2,
    CheckCircle2,
    Eye,
    MapPin,
    Plus,
    Search,
    ShieldOff,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatStatus } from '@/lib/format-status';
import {
    approve as companyApprove,
    create as companyCreate,
    destroy as companyDestroy,
    index as adminCompaniesIndex,
    show as companyShow,
    suspend as companySuspend,
} from '@/routes/admin/companies';

type Option = { value: string; label: string };
type Owner = { id: number; name: string; email: string };

type Company = {
    id: number;
    name: string;
    slug: string;
    tagline: string | null;
    status: string;
    verification_status: string;
    logo_url: string | null;
    industry: string | null;
    city: string | null;
    members_count: number;
    jobs_count: number;
    created_at: string | null;
    owner: Owner | null;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    companies: Paginator<Company>;
    filters: { status: string; verification: string; search: string };
    statusOptions: Option[];
    verificationOptions: Option[];
};

function statusTone(status: string): 'success' | 'destructive' | 'warning' {
    if (status === 'approved') {
        return 'success';
    }

    return status === 'suspended' ? 'destructive' : 'warning';
}

function verificationTone(status: string): 'success' | 'destructive' | 'muted' {
    if (status === 'verified') {
        return 'success';
    }

    return status === 'rejected' ? 'destructive' : 'muted';
}

function initials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}

export default function AdminCompaniesIndex({
    companies,
    filters,
    statusOptions,
    verificationOptions,
}: Props) {
    const [pendingAction, setPendingAction] = useState<{
        type: 'approve' | 'suspend' | 'delete';
        company: Company;
    } | null>(null);

    const { data, setData, get, processing } = useForm({
        search: filters.search,
        status: filters.status,
        verification: filters.verification,
    });

    const hasActiveFilter =
        filters.search !== '' ||
        filters.status !== '' ||
        filters.verification !== '';

    const submit = (event: FormEvent) => {
        event.preventDefault();

        // preserveState keeps what is typed in the box; the page number is
        // dropped on purpose so a new search always lands on page 1.
        get(adminCompaniesIndex().url, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const resetFilters = () => {
        router.get(
            adminCompaniesIndex().url,
            {},
            { preserveScroll: true, replace: true },
        );
    };

    const handleConfirm = () => {
        if (!pendingAction) {
            return;
        }

        if (pendingAction.type === 'delete') {
            router.delete(companyDestroy(pendingAction.company.id).url, {
                preserveScroll: true,
                onFinish: () => setPendingAction(null),
            });

            return;
        }

        const url =
            pendingAction.type === 'approve'
                ? companyApprove(pendingAction.company.id).url
                : companySuspend(pendingAction.company.id).url;

        router.post(
            url,
            {},
            { preserveScroll: true, onFinish: () => setPendingAction(null) },
        );
    };

    const confirmCopy = {
        approve: {
            title: 'Setujui perusahaan?',
            description: pendingAction
                ? `${pendingAction.company.name} akan dapat memposting lowongan.`
                : '',
            confirmLabel: 'Setujui',
            variant: 'default' as const,
            icon: CheckCircle2,
        },
        suspend: {
            title: 'Nonaktifkan perusahaan?',
            description: pendingAction
                ? `${pendingAction.company.name} tidak dapat memposting lowongan.`
                : '',
            confirmLabel: 'Nonaktifkan',
            variant: 'destructive' as const,
            icon: ShieldOff,
        },
        delete: {
            title: 'Hapus perusahaan?',
            description: pendingAction
                ? `${pendingAction.company.name} beserta lowongan dan tim-nya tidak lagi tampil di platform. Data disimpan sebagai arsip dan hanya bisa dipulihkan lewat database.`
                : '',
            confirmLabel: 'Hapus perusahaan',
            variant: 'destructive' as const,
            icon: Trash2,
        },
    };

    const activeCopy = pendingAction ? confirmCopy[pendingAction.type] : null;

    return (
        <>
            <Head title="Manajemen Perusahaan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Perusahaan"
                    description="Setujui, lihat detail, dan nonaktifkan akun perusahaan di platform."
                    actions={
                        <Button asChild>
                            <Link href={companyCreate().url}>
                                <Plus className="size-4" /> Tambah Perusahaan
                            </Link>
                        </Button>
                    }
                />

                <Section>
                    <form
                        onSubmit={submit}
                        className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]"
                    >
                        <Input
                            value={data.search}
                            onChange={(event) =>
                                setData('search', event.target.value)
                            }
                            placeholder="Cari nama perusahaan, email, atau owner..."
                            aria-label="Cari perusahaan"
                        />
                        <Select
                            value={data.status || 'all'}
                            onValueChange={(value) =>
                                setData('status', value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger aria-label="Status">
                                <SelectValue placeholder="Semua status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua status
                                </SelectItem>
                                {statusOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={data.verification || 'all'}
                            onValueChange={(value) =>
                                setData(
                                    'verification',
                                    value === 'all' ? '' : value,
                                )
                            }
                        >
                            <SelectTrigger aria-label="Verifikasi">
                                <SelectValue placeholder="Semua verifikasi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Semua verifikasi
                                </SelectItem>
                                {verificationOptions.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={processing}>
                                <Search className="size-4" /> Cari
                            </Button>
                            {hasActiveFilter && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={resetFilters}
                                >
                                    <X className="size-4" /> Reset
                                </Button>
                            )}
                        </div>
                    </form>
                </Section>

                <Section
                    title={
                        companies.total === 0
                            ? 'Tidak ada perusahaan'
                            : `${companies.from ?? 0}–${companies.to ?? 0} dari ${companies.total} perusahaan`
                    }
                >
                    {companies.data.length === 0 ? (
                        <EmptyState
                            bare
                            icon={Building2}
                            title="Tidak ada perusahaan yang cocok"
                            description={
                                hasActiveFilter
                                    ? 'Coba ubah kata kunci atau kosongkan filternya.'
                                    : 'Belum ada perusahaan terdaftar di platform.'
                            }
                            actions={
                                hasActiveFilter ? (
                                    <Button
                                        variant="outline"
                                        onClick={resetFilters}
                                    >
                                        <X className="size-4" /> Reset filter
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                {companies.data.map((company) => (
                                    <article
                                        key={company.id}
                                        className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
                                    >
                                        <div className="flex items-start gap-3">
                                            {company.logo_url ? (
                                                <img
                                                    src={company.logo_url}
                                                    alt=""
                                                    className="size-12 shrink-0 rounded-lg border object-contain"
                                                />
                                            ) : (
                                                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-sm font-semibold text-muted-foreground">
                                                    {initials(company.name)}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={
                                                        companyShow(company.id)
                                                            .url
                                                    }
                                                    className="block truncate font-semibold hover:underline"
                                                >
                                                    {company.name}
                                                </Link>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {company.tagline ??
                                                        company.industry ??
                                                        '—'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            <StatusBadge
                                                tone={statusTone(
                                                    company.status,
                                                )}
                                            >
                                                {formatStatus(company.status)}
                                            </StatusBadge>
                                            <StatusBadge
                                                tone={verificationTone(
                                                    company.verification_status,
                                                )}
                                            >
                                                {formatStatus(
                                                    company.verification_status,
                                                )}
                                            </StatusBadge>
                                        </div>

                                        <dl className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Users className="size-3.5 shrink-0" />
                                                <span>
                                                    {company.members_count}{' '}
                                                    anggota tim
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                <Briefcase className="size-3.5 shrink-0" />
                                                <span>
                                                    {company.jobs_count}{' '}
                                                    lowongan
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                                                <MapPin className="size-3.5 shrink-0" />
                                                <span className="truncate">
                                                    {company.city ??
                                                        'Lokasi belum diisi'}
                                                </span>
                                            </div>
                                        </dl>

                                        <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
                                            <p className="text-muted-foreground">
                                                Owner
                                            </p>
                                            <p className="truncate font-medium">
                                                {company.owner?.name ?? '-'}
                                            </p>
                                            <p className="truncate text-muted-foreground">
                                                {company.owner?.email ?? '-'}
                                            </p>
                                        </div>

                                        <ActionGroup className="mt-auto">
                                            <ActionButton asChild intent="view">
                                                <Link
                                                    href={
                                                        companyShow(company.id)
                                                            .url
                                                    }
                                                >
                                                    <Eye className="size-4" />{' '}
                                                    Lihat
                                                </Link>
                                            </ActionButton>
                                            {company.status !== 'approved' && (
                                                <ActionButton
                                                    intent="approve"
                                                    onClick={() =>
                                                        setPendingAction({
                                                            type: 'approve',
                                                            company,
                                                        })
                                                    }
                                                >
                                                    <CheckCircle2 className="size-4" />{' '}
                                                    Setujui
                                                </ActionButton>
                                            )}
                                            {company.status !== 'suspended' && (
                                                <ActionButton
                                                    intent="suspend"
                                                    onClick={() =>
                                                        setPendingAction({
                                                            type: 'suspend',
                                                            company,
                                                        })
                                                    }
                                                >
                                                    <ShieldOff className="size-4" />{' '}
                                                    Suspend
                                                </ActionButton>
                                            )}
                                            <ActionButton
                                                intent="delete"
                                                onClick={() =>
                                                    setPendingAction({
                                                        type: 'delete',
                                                        company,
                                                    })
                                                }
                                            >
                                                <Trash2 className="size-4" />{' '}
                                                Hapus
                                            </ActionButton>
                                        </ActionGroup>
                                    </article>
                                ))}
                            </div>

                            {companies.last_page > 1 && (
                                <div className="flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                                    <span>
                                        Halaman {companies.current_page} dari{' '}
                                        {companies.last_page}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {companies.links.map((link) => (
                                            <Button
                                                key={link.label}
                                                size="sm"
                                                variant={
                                                    link.active
                                                        ? 'default'
                                                        : 'ghost'
                                                }
                                                disabled={!link.url}
                                                onClick={() =>
                                                    link.url &&
                                                    router.visit(link.url, {
                                                        preserveScroll: true,
                                                        preserveState: true,
                                                    })
                                                }
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={pendingAction !== null}
                onOpenChange={(open) => !open && setPendingAction(null)}
                title={activeCopy?.title ?? ''}
                description={activeCopy?.description ?? ''}
                confirmLabel={activeCopy?.confirmLabel}
                variant={activeCopy?.variant ?? 'default'}
                confirmIcon={activeCopy?.icon}
                onConfirm={handleConfirm}
            />
        </>
    );
}

AdminCompaniesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Perusahaan',
            href: adminCompaniesIndex().url,
        },
    ],
};
