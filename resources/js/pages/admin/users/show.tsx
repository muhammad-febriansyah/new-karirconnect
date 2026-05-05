import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowLeft,
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    ClipboardList,
    Clock,
    ExternalLink,
    Github,
    Globe,
    KeyRound,
    Languages,
    Linkedin,
    Mail,
    MapPin,
    Phone,
    PowerOff,
    PowerSquare,
    Send,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserCog,
    XCircle,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';
import { index as adminUsersIndex, passwordReset, suspend, activate, destroy } from '@/routes/admin/users';
import type { SharedPageProps } from '@/types';
import { EditUserDialog } from './edit-user-dialog';

type Option = { value: string; label: string };

type Company = {
    id: number;
    name: string;
    slug: string;
    status: string | null;
    verification_status: string | null;
    logo_url: string | null;
};

type Membership = {
    id: number;
    role: string;
    company: { id: number; name: string; slug: string; logo_url: string | null } | null;
};

type Application = {
    id: number;
    status: string;
    created_at: string | null;
    job: {
        id: number;
        title: string;
        slug: string;
        company: { id: number; name: string; logo_url: string | null } | null;
    } | null;
};

type PostedJob = {
    id: number;
    title: string;
    slug: string;
    status: string;
    created_at: string | null;
    company: { id: number; name: string; logo_url: string | null } | null;
};

type AuditLog = {
    id: number;
    action: string;
    ip_address: string | null;
    subject_type: string | null;
    subject_id: number | null;
    created_at: string | null;
};

type UserDetail = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    role_label: string | null;
    avatar_url: string | null;
    phone: string | null;
    address: string | null;
    locale: string;
    is_active: boolean;
    email_verified_at: string | null;
    onboarding_completed_at: string | null;
    two_factor_enabled: boolean;
    created_at: string | null;
    updated_at: string | null;
    employee_profile: {
        id: number;
        headline: string | null;
        current_position: string | null;
        experience_level: string | null;
        is_open_to_work: boolean;
        profile_completion: number;
        expected_salary_min: number | null;
        expected_salary_max: number | null;
        city: string | null;
        province: string | null;
        portfolio_url: string | null;
        linkedin_url: string | null;
        github_url: string | null;
    } | null;
    owned_companies: Company[];
    memberships: Membership[];
};

type Props = {
    user: UserDetail;
    stats: {
        application_count: number;
        posted_jobs_count: number;
        owned_companies_count: number;
        memberships_count: number;
    };
    applications: Application[];
    postedJobs: PostedJob[];
    auditLogs: AuditLog[];
    roleOptions: Option[];
};

const ROLE_GRADIENT: Record<string, string> = {
    admin: 'from-violet-500 via-fuchsia-500 to-pink-500',
    employer: 'from-sky-500 via-cyan-500 to-blue-500',
    employee: 'from-emerald-500 via-teal-500 to-cyan-500',
};

const ROLE_RING: Record<string, string> = {
    admin: 'ring-violet-200 dark:ring-violet-900/60',
    employer: 'ring-sky-200 dark:ring-sky-900/60',
    employee: 'ring-emerald-200 dark:ring-emerald-900/60',
};

function initialsOf(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('') || 'U';
}

const idr = (v: number | null) =>
    v === null
        ? '—'
        : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function AdminUserShow({ user, stats, applications, postedJobs, auditLogs, roleOptions }: Props) {
    const { props } = usePage<SharedPageProps>();
    const isSelf = props.auth?.user?.id === user.id;

    const [editOpen, setEditOpen] = useState(false);
    const [pending, setPending] = useState<'suspend' | 'activate' | 'reset' | 'delete' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const role = user.role ?? 'employee';
    const heroGradient = ROLE_GRADIENT[role] ?? ROLE_GRADIENT.employee;
    const heroRing = ROLE_RING[role] ?? ROLE_RING.employee;

    const performAction = () => {
        if (!pending) return;
        const map = {
            suspend: { url: suspend(user.id).url, method: 'post' as const },
            activate: { url: activate(user.id).url, method: 'post' as const },
            reset: { url: passwordReset(user.id).url, method: 'post' as const },
            delete: { url: destroy(user.id).url, method: 'delete' as const },
        };
        const { url, method } = map[pending];
        setActionLoading(true);
        router[method](
            url,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setActionLoading(false);
                    setPending(null);
                },
            },
        );
    };

    const dialog = (() => {
        if (!pending) return null;
        if (pending === 'suspend') {
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
        if (pending === 'activate') {
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
        if (pending === 'reset') {
            return {
                title: 'Kirim tautan reset password?',
                description: (
                    <span>
                        Tautan reset akan dikirim ke <strong>{user.email}</strong>.
                    </span>
                ),
                confirmLabel: 'Kirim tautan',
                variant: 'default' as const,
                icon: Send,
            };
        }
        return {
            title: 'Hapus akun pengguna?',
            description: (
                <span>
                    Akun <strong>{user.name}</strong> akan dihapus permanen. Aksi ini tidak dapat dibatalkan.
                </span>
            ),
            confirmLabel: 'Hapus permanen',
            variant: 'destructive' as const,
            icon: Trash2,
        };
    })();

    return (
        <>
            <Head title={user.name} />

            <div className="space-y-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                        <Link href={adminUsersIndex().url}>
                            <ArrowLeft className="size-4" /> Kembali ke daftar
                        </Link>
                    </Button>
                </div>

                {/* Hero */}
                <div className={cn('relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6', heroRing, 'ring-1')}>
                    <div className={cn('absolute inset-x-0 top-0 h-32 bg-gradient-to-r', heroGradient, 'opacity-90')} />
                    <div
                        aria-hidden
                        className="absolute inset-0 opacity-20"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.5) 0px, transparent 200px), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.4) 0px, transparent 250px)',
                        }}
                    />
                    <div className="relative">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6">
                            <Avatar className="size-24 shrink-0 ring-4 ring-background shadow-xl sm:size-28">
                                <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} />
                                <AvatarFallback className={cn('bg-gradient-to-br text-2xl font-semibold text-white sm:text-3xl', heroGradient)}>
                                    {initialsOf(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2 pt-12 sm:pt-0">
                                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h1>
                                    {user.is_active ? (
                                        <Badge className="bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900/60">
                                            <span className="mr-1 size-1.5 rounded-full bg-emerald-500" /> Aktif
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900/60">
                                            <span className="mr-1 size-1.5 rounded-full bg-rose-500" /> Suspended
                                        </Badge>
                                    )}
                                    {user.two_factor_enabled && (
                                        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200">
                                            <Shield className="mr-1 size-3" /> 2FA aktif
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5">
                                        <UserCog className="size-3.5" />
                                        {user.role_label ?? user.role}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Mail className="size-3.5" />
                                        {user.email}
                                    </span>
                                    {user.phone && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Phone className="size-3.5" />
                                            {user.phone}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1.5">
                                        <Calendar className="size-3.5" />
                                        Bergabung {user.created_at ? formatDate(user.created_at) : '-'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={() => setEditOpen(true)}>
                                    <UserCog className="size-4" /> Ubah profil
                                </Button>
                                {user.is_active ? (
                                    <Button variant="outline" onClick={() => setPending('suspend')} disabled={isSelf}>
                                        <PowerOff className="size-4" /> Nonaktifkan
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={() => setPending('activate')}>
                                        <PowerSquare className="size-4" /> Aktifkan
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <MiniStat icon={Briefcase} label="Lamaran" value={stats.application_count} tone="emerald" />
                    <MiniStat icon={ClipboardList} label="Lowongan diposting" value={stats.posted_jobs_count} tone="sky" />
                    <MiniStat icon={Building2} label="Perusahaan dimiliki" value={stats.owned_companies_count} tone="violet" />
                    <MiniStat icon={Sparkles} label="Tim perusahaan" value={stats.memberships_count} tone="amber" />
                </div>

                {/* Two-column layout */}
                <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                        <Tabs defaultValue="overview" className="space-y-4">
                            <TabsList className="w-full sm:w-auto">
                                <TabsTrigger value="overview">
                                    <Activity className="size-4" /> Ringkasan
                                </TabsTrigger>
                                {user.role === 'employer' && (
                                    <TabsTrigger value="jobs">
                                        <ClipboardList className="size-4" /> Lowongan
                                    </TabsTrigger>
                                )}
                                {user.role === 'employee' && (
                                    <TabsTrigger value="applications">
                                        <Briefcase className="size-4" /> Lamaran
                                    </TabsTrigger>
                                )}
                                <TabsTrigger value="audit">
                                    <Shield className="size-4" /> Audit
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-6">
                                <Section title="Informasi profil">
                                    <dl className="grid gap-4 sm:grid-cols-2">
                                        <Field icon={UserCog} label="Role" value={user.role_label ?? user.role ?? '-'} />
                                        <Field
                                            icon={Mail}
                                            label="Email"
                                            value={
                                                <span className="inline-flex items-center gap-1.5">
                                                    {user.email}
                                                    {user.email_verified_at ? (
                                                        <BadgeCheck className="size-4 text-emerald-600" />
                                                    ) : (
                                                        <ShieldAlert className="size-4 text-amber-600" />
                                                    )}
                                                </span>
                                            }
                                        />
                                        <Field icon={Phone} label="Telepon" value={user.phone || '-'} />
                                        <Field icon={Languages} label="Bahasa" value={(user.locale ?? 'id').toUpperCase()} />
                                        <Field
                                            icon={Calendar}
                                            label="Onboarding"
                                            value={
                                                user.onboarding_completed_at
                                                    ? `Selesai ${formatDate(user.onboarding_completed_at)}`
                                                    : 'Belum selesai'
                                            }
                                        />
                                        <Field
                                            icon={Clock}
                                            label="Terakhir diperbarui"
                                            value={user.updated_at ? formatDateTime(user.updated_at) : '-'}
                                        />
                                        {user.address && (
                                            <Field icon={MapPin} label="Alamat" value={user.address} className="sm:col-span-2" />
                                        )}
                                    </dl>
                                </Section>

                                {user.role === 'employee' && user.employee_profile && (
                                    <Section
                                        title="Profil pencari kerja"
                                        description="Data diisi oleh kandidat di halaman profil mereka."
                                    >
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <Field
                                                icon={Briefcase}
                                                label="Posisi saat ini"
                                                value={user.employee_profile.current_position || '-'}
                                            />
                                            <Field
                                                icon={Sparkles}
                                                label="Headline"
                                                value={user.employee_profile.headline || '-'}
                                            />
                                            <Field
                                                icon={UserCog}
                                                label="Level"
                                                value={
                                                    user.employee_profile.experience_level
                                                        ? formatStatus(user.employee_profile.experience_level)
                                                        : '-'
                                                }
                                            />
                                            <Field
                                                icon={MapPin}
                                                label="Lokasi"
                                                value={
                                                    [user.employee_profile.city, user.employee_profile.province]
                                                        .filter(Boolean)
                                                        .join(', ') || '-'
                                                }
                                            />
                                            <Field
                                                icon={Sparkles}
                                                label="Ekspektasi gaji"
                                                value={
                                                    user.employee_profile.expected_salary_min ||
                                                    user.employee_profile.expected_salary_max
                                                        ? `${idr(user.employee_profile.expected_salary_min)} – ${idr(user.employee_profile.expected_salary_max)}`
                                                        : '-'
                                                }
                                            />
                                            <Field
                                                icon={CheckCircle2}
                                                label="Open to work"
                                                value={user.employee_profile.is_open_to_work ? 'Ya' : 'Tidak'}
                                            />
                                            <div className="sm:col-span-2">
                                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                                    <span className="font-medium text-muted-foreground">Kelengkapan profil</span>
                                                    <span className="font-semibold tabular-nums">
                                                        {user.employee_profile.profile_completion}%
                                                    </span>
                                                </div>
                                                <Progress value={user.employee_profile.profile_completion} className="h-2" />
                                            </div>
                                            {(user.employee_profile.portfolio_url ||
                                                user.employee_profile.linkedin_url ||
                                                user.employee_profile.github_url) && (
                                                <div className="flex flex-wrap gap-2 sm:col-span-2">
                                                    {user.employee_profile.portfolio_url && (
                                                        <SocialLink
                                                            href={user.employee_profile.portfolio_url}
                                                            icon={Globe}
                                                            label="Portfolio"
                                                        />
                                                    )}
                                                    {user.employee_profile.linkedin_url && (
                                                        <SocialLink
                                                            href={user.employee_profile.linkedin_url}
                                                            icon={Linkedin}
                                                            label="LinkedIn"
                                                        />
                                                    )}
                                                    {user.employee_profile.github_url && (
                                                        <SocialLink
                                                            href={user.employee_profile.github_url}
                                                            icon={Github}
                                                            label="GitHub"
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </Section>
                                )}

                                {user.role === 'employer' && (user.owned_companies.length > 0 || user.memberships.length > 0) && (
                                    <Section title="Perusahaan terkait">
                                        <div className="space-y-2">
                                            {user.owned_companies.map((c) => (
                                                <CompanyRow key={c.id} company={c} role="Owner" />
                                            ))}
                                            {user.memberships
                                                .filter((m) => m.company && !user.owned_companies.some((c) => c.id === m.company!.id))
                                                .map((m) => (
                                                    <CompanyRow
                                                        key={m.id}
                                                        company={{
                                                            id: m.company!.id,
                                                            name: m.company!.name,
                                                            slug: m.company!.slug,
                                                            status: null,
                                                            verification_status: null,
                                                            logo_url: m.company!.logo_url,
                                                        }}
                                                        role={formatStatus(m.role)}
                                                    />
                                                ))}
                                        </div>
                                    </Section>
                                )}
                            </TabsContent>

                            {user.role === 'employer' && (
                                <TabsContent value="jobs">
                                    <Section
                                        title="Lowongan diposting"
                                        description={`Total ${stats.posted_jobs_count} lowongan, menampilkan 10 terbaru.`}
                                    >
                                        {postedJobs.length === 0 ? (
                                            <EmptyState
                                                icon={ClipboardList}
                                                title="Belum ada lowongan"
                                                description="Lowongan yang diposting oleh pengguna ini akan tampil di sini."
                                            />
                                        ) : (
                                            <ul className="divide-y rounded-lg border">
                                                {postedJobs.map((job) => (
                                                    <li key={job.id} className="flex items-center justify-between gap-3 p-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <Avatar className="size-9 rounded-md">
                                                                <AvatarImage src={job.company?.logo_url ?? undefined} />
                                                                <AvatarFallback className="rounded-md bg-muted">
                                                                    <Building2 className="size-4 text-muted-foreground" />
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-medium">{job.title}</div>
                                                                <div className="truncate text-xs text-muted-foreground">
                                                                    {job.company?.name ?? '-'} ·{' '}
                                                                    {job.created_at ? formatDate(job.created_at) : '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="shrink-0">
                                                            {formatStatus(job.status)}
                                                        </Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Section>
                                </TabsContent>
                            )}

                            {user.role === 'employee' && (
                                <TabsContent value="applications">
                                    <Section
                                        title="Riwayat lamaran"
                                        description={`Total ${stats.application_count} lamaran, menampilkan 10 terbaru.`}
                                    >
                                        {applications.length === 0 ? (
                                            <EmptyState
                                                icon={Briefcase}
                                                title="Belum ada lamaran"
                                                description="Lamaran kerja yang dikirim oleh pengguna ini akan tampil di sini."
                                            />
                                        ) : (
                                            <ul className="divide-y rounded-lg border">
                                                {applications.map((app) => (
                                                    <li key={app.id} className="flex items-center justify-between gap-3 p-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <Avatar className="size-9 rounded-md">
                                                                <AvatarImage src={app.job?.company?.logo_url ?? undefined} />
                                                                <AvatarFallback className="rounded-md bg-muted">
                                                                    <Briefcase className="size-4 text-muted-foreground" />
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-medium">
                                                                    {app.job?.title ?? '(lowongan dihapus)'}
                                                                </div>
                                                                <div className="truncate text-xs text-muted-foreground">
                                                                    {app.job?.company?.name ?? '-'} ·{' '}
                                                                    {app.created_at ? formatDate(app.created_at) : '-'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="shrink-0">
                                                            {formatStatus(app.status)}
                                                        </Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </Section>
                                </TabsContent>
                            )}

                            <TabsContent value="audit">
                                <Section
                                    title="Audit & aktivitas"
                                    description="Tindakan administratif yang melibatkan pengguna ini, dari yang terbaru."
                                >
                                    {auditLogs.length === 0 ? (
                                        <EmptyState
                                            icon={Shield}
                                            title="Belum ada aktivitas tercatat"
                                            description="Catatan audit pengguna akan tampil di sini."
                                        />
                                    ) : (
                                        <ol className="relative space-y-4 border-l border-dashed pl-5">
                                            {auditLogs.map((log) => (
                                                <li key={log.id} className="relative">
                                                    <span className="absolute -left-[26px] top-1.5 flex size-3.5 items-center justify-center rounded-full bg-background ring-2 ring-primary">
                                                        <span className="size-1.5 rounded-full bg-primary" />
                                                    </span>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="flex items-center gap-2 text-sm font-medium">
                                                            {log.action}
                                                            <Badge variant="outline" className="text-[10px] uppercase">
                                                                {log.action.split('.')[0] ?? '—'}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                            {log.created_at && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="size-3" />
                                                                    {formatDateTime(log.created_at)}
                                                                </span>
                                                            )}
                                                            {log.ip_address && (
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Globe className="size-3" />
                                                                    {log.ip_address}
                                                                </span>
                                                            )}
                                                            {log.subject_type && (
                                                                <span className="font-mono">
                                                                    {log.subject_type.split('\\').pop()}#{log.subject_id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </Section>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-4">
                        <Section title="Aksi cepat">
                            <div className="flex flex-col gap-2">
                                <Button onClick={() => setEditOpen(true)} className="justify-start">
                                    <UserCog className="size-4" /> Ubah data pengguna
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPending('reset')}
                                    className="justify-start"
                                >
                                    <KeyRound className="size-4" /> Kirim reset password
                                </Button>
                                {user.is_active ? (
                                    <ActionButton
                                        intent="suspend"
                                        onClick={() => setPending('suspend')}
                                        disabled={isSelf}
                                        className="w-full justify-start"
                                    >
                                        <PowerOff className="size-4" /> Nonaktifkan akun
                                    </ActionButton>
                                ) : (
                                    <ActionButton
                                        intent="approve"
                                        onClick={() => setPending('activate')}
                                        className="w-full justify-start"
                                    >
                                        <PowerSquare className="size-4" /> Aktifkan akun
                                    </ActionButton>
                                )}
                                {user.role !== 'admin' && !isSelf && (
                                    <ActionButton
                                        intent="delete"
                                        onClick={() => setPending('delete')}
                                        className="w-full justify-start"
                                    >
                                        <Trash2 className="size-4" /> Hapus akun
                                    </ActionButton>
                                )}
                            </div>
                        </Section>

                        <Section title="Status keamanan">
                            <ul className="space-y-2.5 text-sm">
                                <SecurityRow
                                    label="Email terverifikasi"
                                    ok={Boolean(user.email_verified_at)}
                                    okText={user.email_verified_at ? formatDate(user.email_verified_at) : ''}
                                />
                                <SecurityRow label="Onboarding selesai" ok={Boolean(user.onboarding_completed_at)} />
                                <SecurityRow label="Two-factor authentication" ok={user.two_factor_enabled} />
                                <SecurityRow label="Akun aktif" ok={user.is_active} />
                            </ul>
                        </Section>

                        {isSelf && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                                <div className="font-medium">Ini akun Anda sendiri</div>
                                <p className="mt-1">
                                    Beberapa aksi dinonaktifkan untuk mencegah Anda mengunci diri sendiri (mengubah role,
                                    menonaktifkan, atau menghapus akun ini).
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>

            <EditUserDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                user={user}
                roleOptions={roleOptions}
                isSelf={isSelf}
            />

            {dialog && (
                <ConfirmDialog
                    open={pending !== null}
                    onOpenChange={(open) => !open && setPending(null)}
                    title={dialog.title}
                    description={dialog.description}
                    confirmLabel={dialog.confirmLabel}
                    variant={dialog.variant}
                    confirmIcon={dialog.icon}
                    loading={actionLoading}
                    onConfirm={performAction}
                />
            )}
        </>
    );
}

function MiniStat({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Activity;
    label: string;
    value: number;
    tone: 'emerald' | 'sky' | 'violet' | 'amber';
}) {
    const TONE = {
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/50',
        sky: 'bg-sky-50 text-sky-700 ring-sky-200/70 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-900/50',
        violet: 'bg-violet-50 text-violet-700 ring-violet-200/70 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/50',
        amber: 'bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/50',
    }[tone];

    return (
        <Card className="overflow-hidden shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
                <div className={cn('flex size-10 items-center justify-center rounded-xl ring-1 ring-inset', TONE)}>
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                    <div className="text-xl font-semibold tabular-nums">{value.toLocaleString('id-ID')}</div>
                </div>
            </CardContent>
        </Card>
    );
}

function Field({
    icon: Icon,
    label,
    value,
    className,
}: {
    icon: typeof Activity;
    label: string;
    value: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex items-start gap-3', className)}>
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 break-words text-sm">{value}</dd>
            </div>
        </div>
    );
}

function SecurityRow({ label, ok, okText }: { label: string; ok: boolean; okText?: string }) {
    return (
        <li className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
                {ok ? (
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />
                )}
                <div>
                    <div className="font-medium">{label}</div>
                    {ok && okText && <div className="text-xs text-muted-foreground">{okText}</div>}
                </div>
            </div>
            <span
                className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700',
                )}
            >
                {ok ? 'OK' : 'Tidak'}
            </span>
        </li>
    );
}

function CompanyRow({ company, role }: { company: Company; role: string }) {
    return (
        <Link
            href={`/admin/companies/${company.id}`}
            className="group flex items-center justify-between gap-3 rounded-md border bg-background p-3 transition hover:border-foreground/20 hover:shadow-sm"
        >
            <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10 rounded-md">
                    <AvatarImage src={company.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-md bg-muted">
                        <Building2 className="size-4 text-muted-foreground" />
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <div className="truncate font-medium">{company.name}</div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                            {role}
                        </span>
                        {company.status && <span>· {formatStatus(company.status)}</span>}
                        {company.verification_status && <span>· {formatStatus(company.verification_status)}</span>}
                    </div>
                </div>
            </div>
            <ExternalLink className="size-4 text-muted-foreground transition group-hover:text-foreground" />
        </Link>
    );
}

function SocialLink({ href, icon: Icon, label }: { href: string; icon: typeof Activity; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
            <Icon className="size-3.5" /> {label}
        </a>
    );
}

AdminUserShow.layout = {
    breadcrumbs: [
        {
            title: 'Manajemen Pengguna',
            href: adminUsersIndex().url,
        },
    ],
};
