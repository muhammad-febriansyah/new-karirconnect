import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    BadgeCheck,
    Briefcase,
    Building2,
    CheckCircle2,
    Eye,
    Filter,
    KeyRound,
    Mail,
    MoreHorizontal,
    PowerOff,
    PowerSquare,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserCog,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import {
    activate as activateRoute,
    destroy as destroyRoute,
    index as adminUsersIndex,
    passwordReset as resetRoute,
    show as showRoute,
    suspend as suspendRoute,
} from '@/routes/admin/users';

type Option = { value: string; label: string };

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    role_label: string | null;
    avatar_url: string | null;
    phone: string | null;
    is_active: boolean;
    email_verified_at: string | null;
    onboarding_completed_at: string | null;
    two_factor_enabled: boolean;
    owned_companies_count: number;
    posted_jobs_count: number;
    created_at: string | null;
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
    users: Paginator<UserRow>;
    filters: { search: string; role: string; status: string; verified: string };
    roleOptions: Option[];
    totals: {
        total: number;
        admin: number;
        employer: number;
        employee: number;
        suspended: number;
        unverified: number;
        new_this_month: number;
    };
};

const ROLE_TONE: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900/60',
    employer: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:ring-sky-900/60',
    employee: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/60',
};

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || 'U';
}

export default function AdminUsersIndex({ users, filters, roleOptions, totals }: Props) {
    const { data, setData, processing } = useForm({
        search: filters.search ?? '',
        role: filters.role ?? '',
        status: filters.status ?? '',
        verified: filters.verified ?? '',
    });

    const [pendingAction, setPendingAction] = useState<
        | { type: 'suspend' | 'activate' | 'reset' | 'delete'; user: UserRow }
        | null
    >(null);
    const [actionLoading, setActionLoading] = useState(false);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        router.get(adminUsersIndex().url, data, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const reset = () => {
        setData({ search: '', role: '', status: '', verified: '' });
        router.get(adminUsersIndex().url, {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hasFilter =
        Boolean(data.search) || Boolean(data.role) || Boolean(data.status) || Boolean(data.verified);

    const confirmAction = () => {
        if (!pendingAction) return;
        const { type, user } = pendingAction;
        const url =
            type === 'suspend'
                ? suspendRoute(user.id).url
                : type === 'activate'
                  ? activateRoute(user.id).url
                  : type === 'reset'
                    ? resetRoute(user.id).url
                    : destroyRoute(user.id).url;
        const method = type === 'delete' ? 'delete' : 'post';

        setActionLoading(true);
        router[method](
            url,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setActionLoading(false);
                    setPendingAction(null);
                },
            },
        );
    };

    const dialog = (() => {
        if (!pendingAction) return null;
        const { type, user } = pendingAction;
        if (type === 'suspend') {
            return {
                title: 'Nonaktifkan akun pengguna?',
                description: (
                    <span>
                        <strong>{user.name}</strong> tidak akan dapat login hingga diaktifkan kembali.
                    </span>
                ),
                confirmLabel: 'Nonaktifkan',
                variant: 'destructive' as const,
                icon: PowerOff,
            };
        }
        if (type === 'activate') {
            return {
                title: 'Aktifkan akun pengguna?',
                description: (
                    <span>
                        <strong>{user.name}</strong> akan dapat kembali login dan menggunakan platform.
                    </span>
                ),
                confirmLabel: 'Aktifkan',
                variant: 'default' as const,
                icon: PowerSquare,
            };
        }
        if (type === 'reset') {
            return {
                title: 'Kirim tautan reset password?',
                description: (
                    <span>
                        Tautan untuk mengatur ulang password akan dikirim ke <strong>{user.email}</strong>.
                    </span>
                ),
                confirmLabel: 'Kirim tautan',
                variant: 'default' as const,
                icon: Mail,
            };
        }
        return {
            title: 'Hapus akun pengguna?',
            description: (
                <span>
                    Akun <strong>{user.name}</strong> dan data terkait akan dihapus permanen. Aksi ini tidak dapat
                    dibatalkan.
                </span>
            ),
            confirmLabel: 'Hapus permanen',
            variant: 'destructive' as const,
            icon: Trash2,
        };
    })();

    return (
        <>
            <Head title="Manajemen Pengguna" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Manajemen Pengguna"
                    description="Kelola akun pengguna, role, status aktivasi, dan lihat aktivitas masing-masing."
                />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <StatCard label="Total Pengguna" value={totals.total} icon={Users} tone="default" />
                    <StatCard label="Administrator" value={totals.admin} icon={ShieldCheck} tone="violet" />
                    <StatCard label="Perusahaan" value={totals.employer} icon={Building2} tone="sky" />
                    <StatCard label="Pencari Kerja" value={totals.employee} icon={Briefcase} tone="emerald" />
                    <StatCard label="Dinonaktifkan" value={totals.suspended} icon={ShieldAlert} tone="rose" />
                    <StatCard label="Baru Bulan Ini" value={totals.new_this_month} icon={UserPlus} tone="amber" />
                </div>

                {/* Filters */}
                <Section
                    title="Filter & Pencarian"
                    description="Persempit daftar pengguna berdasarkan role, status aktivasi, atau verifikasi email."
                >
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-12">
                        <div className="relative md:col-span-5">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                placeholder="Cari nama, email, atau nomor telepon..."
                                value={data.search}
                                onChange={(e) => setData('search', e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Select value={data.role || 'all'} onValueChange={(v) => setData('role', v === 'all' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua role</SelectItem>
                                    {roleOptions.map((r) => (
                                        <SelectItem key={r.value} value={r.value}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Select value={data.status || 'all'} onValueChange={(v) => setData('status', v === 'all' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Semua status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua status</SelectItem>
                                    <SelectItem value="active">Aktif</SelectItem>
                                    <SelectItem value="suspended">Dinonaktifkan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Select value={data.verified || 'all'} onValueChange={(v) => setData('verified', v === 'all' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Verifikasi email" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Semua verifikasi</SelectItem>
                                    <SelectItem value="verified">Terverifikasi</SelectItem>
                                    <SelectItem value="unverified">Belum verifikasi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 md:col-span-1">
                            <Button type="submit" disabled={processing} className="w-full">
                                <Filter className="size-4" />
                                <span className="hidden sm:inline">Filter</span>
                            </Button>
                        </div>
                        {hasFilter && (
                            <div className="md:col-span-12">
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-3" /> Reset filter
                                </button>
                            </div>
                        )}
                    </form>
                </Section>

                {/* Table */}
                <Section
                    title={
                        users.total > 0
                            ? `Menampilkan ${users.from ?? 0}–${users.to ?? 0} dari ${users.total.toLocaleString('id-ID')} pengguna`
                            : 'Tidak ada pengguna'
                    }
                >
                    {users.data.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="Tidak ada pengguna ditemukan"
                            description={
                                hasFilter
                                    ? 'Coba ubah filter atau kata kunci pencarian Anda.'
                                    : 'Pengguna yang mendaftar akan tampil di sini.'
                            }
                            actions={
                                hasFilter ? (
                                    <Button variant="outline" onClick={reset}>
                                        <X className="size-4" /> Hapus semua filter
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className="overflow-hidden rounded-lg border">
                            <div className="overflow-x-auto">
                                <Table className="min-w-[1100px]">
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="w-[280px]">Pengguna</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Verifikasi</TableHead>
                                            <TableHead className="text-right">Perusahaan</TableHead>
                                            <TableHead className="text-right">Lowongan</TableHead>
                                            <TableHead>Bergabung</TableHead>
                                            <TableHead className="w-[120px] text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.data.map((u) => (
                                            <TableRow key={u.id} className="group">
                                                <TableCell>
                                                    <Link
                                                        href={showRoute(u.id).url}
                                                        className="flex items-center gap-3 transition group-hover:opacity-95"
                                                    >
                                                        <Avatar className="size-10 ring-2 ring-background shadow-xs">
                                                            <AvatarImage src={u.avatar_url ?? undefined} alt={u.name} />
                                                            <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-semibold text-white">
                                                                {initialsOf(u.name)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 truncate font-medium">
                                                                {u.name}
                                                                {u.two_factor_enabled && (
                                                                    <BadgeCheck className="size-3.5 text-violet-600" />
                                                                )}
                                                            </div>
                                                            <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                            ROLE_TONE[u.role ?? 'employee'],
                                                        )}
                                                    >
                                                        {u.role_label ?? u.role}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {u.is_active ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                                                            <span className="size-1.5 rounded-full bg-emerald-500" /> Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60">
                                                            <span className="size-1.5 rounded-full bg-rose-500" /> Suspended
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {u.email_verified_at ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                            <CheckCircle2 className="size-3.5" /> Terverifikasi
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                            <ShieldAlert className="size-3.5" /> Belum
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {u.owned_companies_count > 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs">
                                                            <Building2 className="size-3" /> {u.owned_companies_count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right tabular-nums">
                                                    {u.posted_jobs_count > 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs">
                                                            <Briefcase className="size-3" /> {u.posted_jobs_count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{u.created_at ? formatDate(u.created_at) : '-'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {u.created_at ? formatDateTime(u.created_at).split(', ')[1] : ''}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <ActionGroup className="justify-end">
                                                        <ActionButton asChild intent="view">
                                                            <Link href={showRoute(u.id).url}>
                                                                <Eye className="size-3.5" />
                                                                <span className="hidden lg:inline">Detail</span>
                                                            </Link>
                                                        </ActionButton>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="size-8">
                                                                    <MoreHorizontal className="size-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-52">
                                                                {u.is_active ? (
                                                                    <DropdownMenuItem
                                                                        onSelect={() => setPendingAction({ type: 'suspend', user: u })}
                                                                        className="text-orange-700 focus:text-orange-800"
                                                                    >
                                                                        <PowerOff className="size-4" /> Nonaktifkan
                                                                    </DropdownMenuItem>
                                                                ) : (
                                                                    <DropdownMenuItem
                                                                        onSelect={() => setPendingAction({ type: 'activate', user: u })}
                                                                        className="text-emerald-700 focus:text-emerald-800"
                                                                    >
                                                                        <PowerSquare className="size-4" /> Aktifkan
                                                                    </DropdownMenuItem>
                                                                )}
                                                                <DropdownMenuItem
                                                                    onSelect={() => setPendingAction({ type: 'reset', user: u })}
                                                                >
                                                                    <KeyRound className="size-4" /> Kirim reset password
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem asChild>
                                                                    <Link href={showRoute(u.id).url}>
                                                                        <UserCog className="size-4" /> Ubah profil
                                                                    </Link>
                                                                </DropdownMenuItem>
                                                                {u.role !== 'admin' && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem
                                                                            onSelect={() => setPendingAction({ type: 'delete', user: u })}
                                                                            className="text-destructive focus:text-destructive"
                                                                        >
                                                                            <Trash2 className="size-4" /> Hapus akun
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </ActionGroup>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {users.last_page > 1 && (
                                <div className="flex flex-col items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground sm:flex-row">
                                    <span>
                                        Halaman <strong>{users.current_page}</strong> dari {users.last_page}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1">
                                        {users.links
                                            .filter((l) => l.url || l.active)
                                            .map((link, i) => (
                                                <Button
                                                    key={`${link.label}-${i}`}
                                                    size="sm"
                                                    variant={link.active ? 'default' : 'ghost'}
                                                    disabled={!link.url}
                                                    onClick={() =>
                                                        link.url &&
                                                        router.visit(link.url, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        })
                                                    }
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </div>

            {dialog && (
                <ConfirmDialog
                    open={pendingAction !== null}
                    onOpenChange={(open) => !open && setPendingAction(null)}
                    title={dialog.title}
                    description={dialog.description}
                    confirmLabel={dialog.confirmLabel}
                    variant={dialog.variant}
                    confirmIcon={dialog.icon}
                    loading={actionLoading}
                    onConfirm={confirmAction}
                />
            )}
        </>
    );
}

function StatCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: typeof Users;
    tone: 'default' | 'violet' | 'sky' | 'emerald' | 'rose' | 'amber';
}) {
    const TONE: Record<string, { bg: string; ring: string; icon: string; accent: string }> = {
        default: {
            bg: 'from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/10',
            ring: 'ring-slate-200/60 dark:ring-slate-800/60',
            icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
            accent: 'bg-slate-500/10',
        },
        violet: {
            bg: 'from-violet-50 to-white dark:from-violet-950/40 dark:to-slate-900/10',
            ring: 'ring-violet-200/70 dark:ring-violet-900/40',
            icon: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200',
            accent: 'bg-violet-500/10',
        },
        sky: {
            bg: 'from-sky-50 to-white dark:from-sky-950/40 dark:to-slate-900/10',
            ring: 'ring-sky-200/70 dark:ring-sky-900/40',
            icon: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
            accent: 'bg-sky-500/10',
        },
        emerald: {
            bg: 'from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900/10',
            ring: 'ring-emerald-200/70 dark:ring-emerald-900/40',
            icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
            accent: 'bg-emerald-500/10',
        },
        rose: {
            bg: 'from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900/10',
            ring: 'ring-rose-200/70 dark:ring-rose-900/40',
            icon: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
            accent: 'bg-rose-500/10',
        },
        amber: {
            bg: 'from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900/10',
            ring: 'ring-amber-200/70 dark:ring-amber-900/40',
            icon: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
            accent: 'bg-amber-500/10',
        },
    }[tone];

    return (
        <Card className={cn('relative overflow-hidden bg-gradient-to-br shadow-xs ring-1', TONE.bg, TONE.ring)}>
            <span aria-hidden className={cn('absolute -right-6 -top-6 size-20 rounded-full blur-2xl', TONE.accent)} />
            <CardContent className="relative flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString('id-ID')}</div>
                </div>
                <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE.icon)}>
                    <Icon className="size-5" strokeWidth={1.75} />
                </div>
            </CardContent>
        </Card>
    );
}

AdminUsersIndex.layout = {
    breadcrumbs: [
        {
            title: 'Manajemen Pengguna',
            href: adminUsersIndex().url,
        },
    ],
};
