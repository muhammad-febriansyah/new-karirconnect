import { Head } from '@inertiajs/react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { formatDateTime } from '@/lib/format-date';

type Props = {
    company: {
        id: number;
        name: string;
        slug: string;
        about: string | null;
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
};

export default function AdminCompanyShow({ company }: Props) {
    return (
        <>
            <Head title={company.name} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={company.name}
                    description={`Owner: ${company.owner?.name ?? '-'} (${company.owner?.email ?? '-'})`}
                    actions={
                        <div className="flex gap-2">
                            <StatusBadge tone={company.status === 'approved' ? 'success' : 'warning'}>
                                {company.status}
                            </StatusBadge>
                            <StatusBadge tone={company.verification_status === 'verified' ? 'success' : 'muted'}>
                                {company.verification_status}
                            </StatusBadge>
                        </div>
                    }
                />

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Informasi">
                        <dl className="grid grid-cols-2 gap-3 text-sm">
                            <dt className="text-muted-foreground">Industri</dt>
                            <dd>{company.industry?.name ?? '-'}</dd>
                            <dt className="text-muted-foreground">Ukuran</dt>
                            <dd>{company.size ? `${company.size.name} (${company.size.employee_range})` : '-'}</dd>
                            <dt className="text-muted-foreground">Lokasi</dt>
                            <dd>{company.city ? `${company.city.name}, ${company.city.province?.name ?? '-'}` : '-'}</dd>
                            <dt className="text-muted-foreground">Disetujui</dt>
                            <dd>{company.approved_at ? formatDateTime(company.approved_at) : '-'}</dd>
                            <dt className="text-muted-foreground">Diverifikasi</dt>
                            <dd>{company.verified_at ? formatDateTime(company.verified_at) : '-'}</dd>
                        </dl>
                    </Section>

                    <Section title="Tim">
                        {company.members.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada anggota.</p>
                        ) : (
                            <ul className="divide-y">
                                {company.members.map((m) => (
                                    <li key={m.id} className="flex items-center justify-between py-2">
                                        <div>
                                            <div className="font-medium">{m.user?.name}</div>
                                            <div className="text-xs text-muted-foreground">{m.user?.email}</div>
                                        </div>
                                        <StatusBadge tone={m.role === 'owner' ? 'primary' : 'secondary'}>{m.role}</StatusBadge>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Section title="Lokasi Kantor">
                        {company.offices.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada lokasi kantor.</p>
                        ) : (
                            <ul className="space-y-3">
                                {company.offices.map((office) => (
                                    <li key={office.id} className="rounded-md border p-3">
                                        <div className="font-medium">{office.label}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {office.city ? `${office.city.name}, ${office.city.province?.name ?? '-'}` : '-'}
                                        </div>
                                        {office.address && (
                                            <div className="mt-1 text-sm text-muted-foreground">{office.address}</div>
                                        )}
                                        {office.contact_phone && (
                                            <div className="mt-1 text-xs text-muted-foreground">{office.contact_phone}</div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>

                    <Section title="Badge Aktif">
                        {company.badges.filter((badge) => badge.is_active).length === 0 ? (
                            <p className="text-sm text-muted-foreground">Belum ada badge aktif.</p>
                        ) : (
                            <ul className="space-y-3">
                                {company.badges
                                    .filter((badge) => badge.is_active)
                                    .map((badge) => (
                                        <li key={badge.id} className="rounded-md border p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <div className="font-medium">{badge.name}</div>
                                                    {badge.description && (
                                                        <div className="text-sm text-muted-foreground">{badge.description}</div>
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

                <Section title="Dokumen Verifikasi">
                    {company.verifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>
                    ) : (
                        <ul className="space-y-2">
                            {company.verifications.map((v) => (
                                <li key={v.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <div className="font-medium uppercase">{v.document_type}</div>
                                        <div className="text-xs text-muted-foreground">{formatDateTime(v.created_at)}</div>
                                        {v.review_note && (
                                            <div className="mt-1 text-xs text-muted-foreground">Catatan: {v.review_note}</div>
                                        )}
                                    </div>
                                    <StatusBadge
                                        tone={v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'destructive' : 'warning'}
                                    >
                                        {v.status}
                                    </StatusBadge>
                                </li>
                            ))}
                        </ul>
                    )}
                </Section>

                {company.about && (
                    <Section title="Tentang">
                        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{company.about}</p>
                    </Section>
                )}
            </div>
        </>
    );
}
