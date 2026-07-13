import { Head } from '@inertiajs/react';
import {
    Building2,
    Calendar,
    CreditCard,
    Globe,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    Ticket,
    UserRound,
    Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { SafeHtml } from '@/components/shared/safe-html';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Props = {
    company: {
        id: number;
        name: string;
        slug: string;
        tagline: string | null;
        about: string | null;
        website: string | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        founded_year: number | null;
        status: string;
        verification_status: string;
        approved_at: string | null;
        verified_at: string | null;
        owner: { id: number; name: string; email: string } | null;
        industry: { name: string } | null;
        size: { name: string; employee_range: string } | null;
        city: { name: string; province: { name: string } | null } | null;
        offices: Array<{
            id: number;
            label: string;
            address: string | null;
            contact_phone: string | null;
            city: { name: string; province: { name: string } | null } | null;
        }>;
        badges: Array<{
            id: number;
            name: string;
            description: string | null;
            tone: string;
            is_active: boolean;
        }>;
        members: Array<{ id: number; role: string; user: { id: number; name: string; email: string } | null }>;
        verifications: Array<{
            id: number;
            document_type: string;
            status: string;
            review_note: string | null;
            created_at: string;
        }>;
    };
    logoUrl: string | null;
    subscription: {
        plan_name: string | null;
        plan_slug: string | null;
        status: string;
        starts_at: string | null;
        ends_at: string | null;
        jobs_posted_count: number;
        job_post_quota: number | null;
    } | null;
};

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
            </div>
        </div>
    );
}

const EMPTY = <span className="font-normal text-muted-foreground">—</span>;

export default function AdminCompanyShow({ company, logoUrl, subscription }: Props) {
    const location = company.city ? `${company.city.name}, ${company.city.province?.name ?? '-'}` : null;
    const quota = subscription?.job_post_quota ?? 0;
    const usedPct = quota > 0 ? Math.min(100, Math.round(((subscription?.jobs_posted_count ?? 0) / quota) * 100)) : 0;

    return (
        <>
            <Head title={company.name} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Detail Perusahaan"
                    description="Ringkasan profil, akun owner, dan status langganan perusahaan."
                />

                {/* Hero */}
                <Section className="!p-0">
                    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted text-lg font-semibold text-muted-foreground">
                            {logoUrl ? (
                                <img src={logoUrl} alt={company.name} className="size-full object-cover" />
                            ) : (
                                initials(company.name)
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-xl font-semibold tracking-tight">{company.name}</h2>
                            {company.tagline && <p className="mt-1 text-sm text-muted-foreground">{company.tagline}</p>}
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <StatusBadge tone={company.status === 'approved' ? 'success' : 'warning'}>
                                    {formatStatus(company.status)}
                                </StatusBadge>
                                <StatusBadge tone={company.verification_status === 'verified' ? 'info' : 'muted'}>
                                    {company.verification_status === 'verified' && <ShieldCheck className="size-3.5" />}
                                    {formatStatus(company.verification_status)}
                                </StatusBadge>
                                {company.industry && <StatusBadge tone="secondary">{company.industry.name}</StatusBadge>}
                            </div>
                        </div>
                    </div>
                </Section>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main column */}
                    <div className="space-y-6 lg:col-span-2">
                        <Section title="Profil & Kontak">
                            <dl className="grid gap-x-8 sm:grid-cols-2 sm:divide-x-0 [&>*]:border-b [&>*]:border-border/60">
                                <InfoRow icon={Globe} label="Website">
                                    {company.website ? (
                                        <a
                                            href={company.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary underline-offset-4 hover:underline"
                                        >
                                            {company.website.replace(/^https?:\/\//i, '')}
                                        </a>
                                    ) : (
                                        EMPTY
                                    )}
                                </InfoRow>
                                <InfoRow icon={Mail} label="Email perusahaan">
                                    {company.email ? (
                                        <a href={`mailto:${company.email}`} className="text-primary underline-offset-4 hover:underline">
                                            {company.email}
                                        </a>
                                    ) : (
                                        EMPTY
                                    )}
                                </InfoRow>
                                <InfoRow icon={Phone} label="Telepon">
                                    {company.phone ? (
                                        <a href={`tel:${company.phone}`} className="text-primary underline-offset-4 hover:underline">
                                            {company.phone}
                                        </a>
                                    ) : (
                                        EMPTY
                                    )}
                                </InfoRow>
                                <InfoRow icon={Users} label="Ukuran">
                                    {company.size ? `${company.size.name} (${company.size.employee_range})` : EMPTY}
                                </InfoRow>
                                <InfoRow icon={Building2} label="Industri">
                                    {company.industry?.name ?? EMPTY}
                                </InfoRow>
                                <InfoRow icon={Calendar} label="Tahun berdiri">
                                    {company.founded_year ?? EMPTY}
                                </InfoRow>
                                <InfoRow icon={MapPin} label="Lokasi">
                                    {location ?? EMPTY}
                                </InfoRow>
                                <InfoRow icon={MapPin} label="Alamat">
                                    {company.address ?? EMPTY}
                                </InfoRow>
                            </dl>
                        </Section>

                        {company.about && (
                            <Section title="Tentang">
                                <SafeHtml html={company.about} className="prose-sm max-w-none text-muted-foreground" />
                            </Section>
                        )}

                        <Section title="Tim">
                            {company.members.length === 0 ? (
                                <EmptyState title="Belum ada anggota" description="Anggota tim perusahaan akan muncul di sini." />
                            ) : (
                                <ul className="divide-y">
                                    {company.members.map((m) => (
                                        <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                                    {initials(m.user?.name ?? '?')}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">{m.user?.name}</div>
                                                    <div className="truncate text-xs text-muted-foreground">{m.user?.email}</div>
                                                </div>
                                            </div>
                                            <StatusBadge tone={m.role === 'owner' ? 'primary' : 'secondary'}>{m.role}</StatusBadge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        <Section title="Lokasi Kantor">
                            {company.offices.length === 0 ? (
                                <EmptyState title="Belum ada lokasi kantor" description="Data kantor cabang dan headquarter akan tampil di sini." />
                            ) : (
                                <ul className="grid gap-3 sm:grid-cols-2">
                                    {company.offices.map((office) => (
                                        <li key={office.id} className="rounded-lg border p-4">
                                            <div className="flex items-center gap-2 font-medium">
                                                <MapPin className="size-4 shrink-0 text-muted-foreground" />
                                                {office.label}
                                            </div>
                                            <div className="mt-1.5 text-sm text-muted-foreground">
                                                {office.city ? `${office.city.name}, ${office.city.province?.name ?? '-'}` : '-'}
                                            </div>
                                            {office.address && <div className="mt-1 text-sm text-muted-foreground">{office.address}</div>}
                                            {office.contact_phone && (
                                                <div className="mt-1 text-xs text-muted-foreground">{office.contact_phone}</div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        <Section title="Dokumen Verifikasi">
                            {company.verifications.length === 0 ? (
                                <EmptyState title="Belum ada dokumen" description="Dokumen verifikasi perusahaan akan muncul di sini." />
                            ) : (
                                <ul className="space-y-2">
                                    {company.verifications.map((v) => (
                                        <li key={v.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                            <div className="min-w-0">
                                                <div className="font-medium uppercase">{v.document_type}</div>
                                                <div className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</div>
                                                {v.review_note && (
                                                    <div className="mt-1 text-xs text-muted-foreground">Catatan: {v.review_note}</div>
                                                )}
                                            </div>
                                            <StatusBadge
                                                tone={v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'destructive' : 'warning'}
                                            >
                                                {formatStatus(v.status)}
                                            </StatusBadge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Section title="Akun Owner">
                            {company.owner ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                        {initials(company.owner.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate font-medium">{company.owner.name}</div>
                                        <a
                                            href={`mailto:${company.owner.email}`}
                                            className="truncate text-xs text-primary underline-offset-4 hover:underline"
                                        >
                                            {company.owner.email}
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">Owner tidak ditemukan.</p>
                            )}
                        </Section>

                        <Section title="Langganan">
                            {subscription ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="size-4 text-muted-foreground" />
                                            <span className="font-medium">{subscription.plan_name ?? 'Paket'}</span>
                                        </div>
                                        <StatusBadge tone={subscription.status === 'active' ? 'success' : 'muted'}>
                                            {formatStatus(subscription.status)}
                                        </StatusBadge>
                                    </div>
                                    <div>
                                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Kuota lowongan</span>
                                            <span>
                                                {subscription.jobs_posted_count}
                                                {quota > 0 ? ` / ${quota}` : ' · tanpa batas'}
                                            </span>
                                        </div>
                                        {quota > 0 && (
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div className="h-full rounded-full bg-primary" style={{ width: `${usedPct}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    {subscription.ends_at && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="size-3.5" />
                                            Berakhir {formatDateTime(subscription.ends_at)}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                                    <Ticket className="mt-0.5 size-4 shrink-0" />
                                    <span>Belum ada langganan aktif. Perusahaan tidak bisa memasang lowongan sampai berlangganan.</span>
                                </div>
                            )}
                        </Section>

                        <Section title="Status Akun">
                            <dl className="[&>*]:border-b [&>*]:border-border/60 [&>*:last-child]:border-0">
                                <InfoRow icon={ShieldCheck} label="Disetujui">
                                    {company.approved_at ? formatDateTime(company.approved_at) : EMPTY}
                                </InfoRow>
                                <InfoRow icon={ShieldCheck} label="Diverifikasi">
                                    {company.verified_at ? formatDateTime(company.verified_at) : EMPTY}
                                </InfoRow>
                                <InfoRow icon={UserRound} label="Slug">
                                    <span className="font-mono text-xs">{company.slug}</span>
                                </InfoRow>
                            </dl>
                        </Section>

                        <Section title="Badge Aktif">
                            {company.badges.filter((badge) => badge.is_active).length === 0 ? (
                                <EmptyState title="Belum ada badge aktif" description="Badge perusahaan yang aktif akan tampil di sini." />
                            ) : (
                                <ul className="space-y-3">
                                    {company.badges
                                        .filter((badge) => badge.is_active)
                                        .map((badge) => (
                                            <li key={badge.id} className="rounded-lg border p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="font-medium">{badge.name}</div>
                                                        {badge.description && (
                                                            <div className="text-xs text-muted-foreground">{badge.description}</div>
                                                        )}
                                                    </div>
                                                    <StatusBadge tone={(badge.tone as Parameters<typeof StatusBadge>[0]['tone']) ?? 'secondary'}>
                                                        Aktif
                                                    </StatusBadge>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </Section>
                    </div>
                </div>
            </div>
        </>
    );
}
