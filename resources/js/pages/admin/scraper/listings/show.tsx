import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ExternalLink,
    EyeOff,
    Eye,
    Globe,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import ScrapedJobListingController from '@/actions/App/Http/Controllers/Admin/Scraper/ScrapedJobListingController';
import { CompanyLogo, ToneBadge } from '@/components/admin/scraper/scraper-ui';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { SafeHtml } from '@/components/shared/safe-html';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { formatRupiah } from '@/lib/format-rupiah';
import type { SourceRef, Tone } from '@/types/scraper';

type Listing = {
    id: number;
    title: string;
    status: string;
    status_label: string;
    status_tone: Tone;
    external_id: string;
    apply_url: string;
    contact_email: string | null;
    description: string | null;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    min_education: string | null;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string | null;
    salary_interval: string | null;
    location_text: string | null;
    city: string | null;
    province: string | null;
    category: string | null;
    skills: Array<{ id: number; name: string; is_required: boolean }>;
    application_deadline: string | null;
    published_at: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    raw_attributes: Record<string, string>;
    source: SourceRef | null;
    origins: Array<{
        id: number;
        external_id: string;
        source_url: string;
        source: SourceRef | null;
        first_seen_at: string | null;
        last_seen_at: string | null;
        last_crawl_run_id: number | null;
    }>;
    published_job: {
        slug: string;
        applications_count: number;
        status: string | null;
        published_at: string | null;
    } | null;
    company: {
        name: string;
        tagline: string | null;
        logo_url: string | null;
        logo_stored: boolean;
        website: string | null;
        email: string | null;
        phone: string | null;
        address: string | null;
        about: string | null;
        founded_year: number | null;
        industry: string | null;
        size: string | null;
        city: string | null;
        profile_source_url: string | null;
        linked_company_id: number | null;
        id: number;
        recruitment_email: string | null;
        recruitment_email_source: string | null;
        recruitment_email_verified_at: string | null;
        contact_checked_at: string | null;
    } | null;
};

function formatSalary(listing: Listing): string | null {
    const {
        salary_min: min,
        salary_max: max,
        salary_currency: currency,
    } = listing;

    if (min === null && max === null) {
        return null;
    }

    const format = (value: number) =>
        currency === null || currency === 'IDR'
            ? formatRupiah(value)
            : `${currency} ${value.toLocaleString('id-ID')}`;
    const range =
        min !== null && max !== null
            ? `${format(min)} – ${format(max)}`
            : format((min ?? max) as number);

    return listing.salary_interval
        ? `${range} (${listing.salary_interval})`
        : range;
}

const SECTIONS: Array<{
    key: 'description' | 'responsibilities' | 'requirements' | 'benefits';
    title: string;
}> = [
    { key: 'description', title: 'Deskripsi' },
    { key: 'responsibilities', title: 'Tanggung jawab' },
    { key: 'requirements', title: 'Kualifikasi' },
    { key: 'benefits', title: 'Benefit' },
];

export default function ScrapedListingShow({ listing }: { listing: Listing }) {
    const [confirming, setConfirming] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const hasApplicants = (listing.published_job?.applications_count ?? 0) > 0;
    const [processing, setProcessing] = useState(false);
    const hidden = listing.status === 'hidden';
    const salary = formatSalary(listing);
    const location =
        [listing.city, listing.province].filter(Boolean).join(', ') ||
        listing.location_text;

    const facts: Array<[string, string | null]> = [
        ['Lokasi', location],
        ['Lokasi asli', listing.location_text],
        ['Tipe pekerjaan', listing.employment_type],
        ['Sistem kerja', listing.work_arrangement],
        ['Level', listing.experience_level],
        ['Pendidikan minimal', listing.min_education],
        ['Kategori', listing.category],
        ['Gaji', salary],
        [
            'Batas lamaran',
            listing.application_deadline
                ? formatDate(listing.application_deadline)
                : null,
        ],
        [
            'Tayang',
            listing.published_at ? formatDateTime(listing.published_at) : null,
        ],
    ];

    const toggle = () => {
        setProcessing(true);
        router.patch(
            ScrapedJobListingController.toggleVisibility(listing.id).url,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessing(false);
                    setConfirming(false);
                },
            },
        );
    };

    return (
        <>
            <Head title={listing.title} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={listing.title}
                    description={
                        listing.company
                            ? `${listing.company.name} · ${location ?? 'Lokasi tidak disebut'}`
                            : undefined
                    }
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link
                                    href={
                                        ScrapedJobListingController.index().url
                                    }
                                >
                                    <ArrowLeft className="size-4" /> Kembali
                                </Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link
                                    href={
                                        ScrapedJobListingController.edit(
                                            listing.id,
                                        ).url
                                    }
                                >
                                    <Pencil className="size-4" /> Edit
                                </Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setConfirmDelete(true)}
                                disabled={hasApplicants}
                                title={
                                    hasApplicants
                                        ? 'Sudah ada pelamar: tutup lowongan portalnya dari menu Lowongan'
                                        : undefined
                                }
                            >
                                <Trash2 className="size-4" /> Hapus
                            </Button>
                            <Button variant="outline" asChild>
                                <a
                                    href={listing.apply_url}
                                    target="_blank"
                                    rel="noopener noreferrer nofollow"
                                >
                                    <ExternalLink className="size-4" /> Halaman
                                    lamaran
                                </a>
                            </Button>
                            <Button
                                variant={hidden ? 'default' : 'outline'}
                                onClick={() =>
                                    hidden ? toggle() : setConfirming(true)
                                }
                                disabled={processing}
                            >
                                {hidden ? (
                                    <Eye className="size-4" />
                                ) : (
                                    <EyeOff className="size-4" />
                                )}
                                {hidden ? 'Tampilkan lagi' : 'Sembunyikan'}
                            </Button>
                        </>
                    }
                />

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <Section>
                            <div className="flex flex-wrap items-center gap-2">
                                <ToneBadge tone={listing.status_tone}>
                                    {listing.status_label}
                                </ToneBadge>
                                {listing.skills.map((skill) => (
                                    <Badge
                                        key={skill.id}
                                        variant={
                                            skill.is_required
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {skill.name}
                                    </Badge>
                                ))}
                            </div>
                            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                                {facts.map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-xs text-muted-foreground">
                                            {label}
                                        </dt>
                                        <dd className="text-sm">
                                            {value ?? (
                                                <span className="text-muted-foreground">
                                                    Tidak disebut sumber
                                                </span>
                                            )}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </Section>

                        {SECTIONS.map(({ key, title }) =>
                            listing[key] ? (
                                <Section key={key} title={title}>
                                    <SafeHtml
                                        html={listing[key]}
                                        className="prose prose-sm max-w-none"
                                    />
                                </Section>
                            ) : null,
                        )}
                        {SECTIONS.every(({ key }) => !listing[key]) && (
                            <Section title="Deskripsi">
                                <p className="text-sm text-muted-foreground">
                                    Sumber tidak menyertakan deskripsi.
                                </p>
                            </Section>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Section title="Publikasi">
                            {listing.published_job ? (
                                <div className="space-y-1 text-sm">
                                    <ToneBadge tone="primary">
                                        Dipublish
                                    </ToneBadge>
                                    <p className="text-muted-foreground">
                                        Tayang di portal sejak{' '}
                                        {formatDateTime(
                                            listing.published_job.published_at,
                                        )}
                                        {listing.published_job.status ===
                                            'closed' && ' (sudah ditutup)'}
                                        .
                                    </p>
                                    {listing.published_job.status ===
                                        'draft' && (
                                        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                            Disembunyikan dari portal karena
                                            belum ada email HRD atau email
                                            perusahaan. Tayang lagi otomatis
                                            setelah email ditemukan.
                                        </p>
                                    )}
                                    <a
                                        href={`/jobs/${listing.published_job.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                    >
                                        Buka halaman lowongan
                                    </a>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Belum dipublish. Publish dari halaman Jobs
                                    Eksternal (centang lowongan ini) atau lewat
                                    dialog Scrap.
                                </p>
                            )}
                        </Section>

                        {listing.company && (
                            <RecruitmentEmailForm company={listing.company} />
                        )}

                        {listing.company && (
                            <Section title="Profil perusahaan">
                                <div className="flex items-center gap-3">
                                    <CompanyLogo
                                        name={listing.company.name}
                                        url={listing.company.logo_url}
                                        className="size-14"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-semibold">
                                            {listing.company.name}
                                        </p>
                                        {listing.company.tagline && (
                                            <p className="text-xs text-muted-foreground">
                                                {listing.company.tagline}
                                            </p>
                                        )}
                                        {!listing.company.logo_stored &&
                                            listing.company.logo_url && (
                                                <p className="text-xs text-amber-700">
                                                    Logo belum tersimpan lokal
                                                </p>
                                            )}
                                    </div>
                                </div>
                                <ul className="mt-4 space-y-2 text-sm">
                                    {listing.company.website && (
                                        <li className="flex items-center gap-2">
                                            <Globe className="size-4 text-muted-foreground" />
                                            <a
                                                href={listing.company.website}
                                                target="_blank"
                                                rel="noopener noreferrer nofollow"
                                                className="truncate hover:underline"
                                            >
                                                {listing.company.website}
                                            </a>
                                        </li>
                                    )}
                                    {listing.company.email && (
                                        <li className="flex items-center gap-2">
                                            <Mail className="size-4 text-muted-foreground" />{' '}
                                            {listing.company.email}
                                        </li>
                                    )}
                                    {listing.company.phone && (
                                        <li className="flex items-center gap-2">
                                            <Phone className="size-4 text-muted-foreground" />{' '}
                                            {listing.company.phone}
                                        </li>
                                    )}
                                    {listing.company.address && (
                                        <li className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 size-4 text-muted-foreground" />{' '}
                                            {listing.company.address}
                                        </li>
                                    )}
                                </ul>
                                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    {(
                                        [
                                            [
                                                'Industri',
                                                listing.company.industry,
                                            ],
                                            ['Ukuran', listing.company.size],
                                            [
                                                'Berdiri',
                                                listing.company.founded_year
                                                    ? String(
                                                          listing.company
                                                              .founded_year,
                                                      )
                                                    : null,
                                            ],
                                            ['Kota', listing.company.city],
                                        ] as Array<[string, string | null]>
                                    ).map(([label, value]) => (
                                        <div key={label}>
                                            <dt className="text-xs text-muted-foreground">
                                                {label}
                                            </dt>
                                            <dd>{value ?? '-'}</dd>
                                        </div>
                                    ))}
                                </dl>
                                {listing.company.about && (
                                    <div className="mt-4 border-t pt-4">
                                        <SafeHtml
                                            html={listing.company.about}
                                            className="prose prose-sm max-w-none"
                                        />
                                    </div>
                                )}
                            </Section>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title="Hapus lowongan ini?"
                description={`Lowongan dihapus dari Jobs Eksternal${listing.published_job ? ' beserta lowongannya di portal, karena belum ada pelamar' : ''}. Jika masih ada di sumbernya, crawl berikutnya akan mengambilnya lagi — pakai Sembunyikan agar tidak muncul lagi.`}
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={() =>
                    router.delete(
                        ScrapedJobListingController.destroy(listing.id).url,
                    )
                }
            />

            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title="Sembunyikan lowongan ini?"
                description="Lowongan tetap tersimpan, tetapi tidak dianggap aktif dan tidak dipakai untuk deduplikasi lowongan baru."
                confirmLabel="Sembunyikan"
                confirmIcon={EyeOff}
                loading={processing}
                onConfirm={toggle}
            />
        </>
    );
}

/**
 * Where applications to this company's external jobs are forwarded. Empty
 * means candidates apply on the company's own site instead.
 */
/** Whether `url` is on the company's website (ignoring www.). */
function sameSite(url: string, website: string | null): boolean {
    if (!website) {
        return false;
    }

    try {
        const host = (value: string) =>
            new URL(value).hostname.replace(/^www\./, '');

        return host(url).endsWith(host(website));
    } catch {
        return false;
    }
}

function RecruitmentEmailForm({
    company,
}: {
    company: {
        id: number;
        name: string;
        recruitment_email: string | null;
        recruitment_email_source: string | null;
        recruitment_email_verified_at: string | null;
        contact_checked_at: string | null;
        website: string | null;
        email: string | null;
    };
}) {
    const sendsTo = company.recruitment_email ?? company.email;

    return (
        <Section
            title="Email lamaran"
            description="Diambil otomatis saat scrape dari iklan lowongan dan situs perusahaan. Lamaran lewat KarirConnect diteruskan via SMTP."
        >
            <dl className="space-y-3 text-sm">
                <EmailRow
                    label="Email HRD"
                    email={company.recruitment_email}
                    sendsTo={sendsTo}
                />
                <EmailRow
                    label="Email perusahaan"
                    email={company.email}
                    sendsTo={sendsTo}
                />
            </dl>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                {company.recruitment_email_source && (
                    <p>
                        Email HRD dari{' '}
                        <a
                            href={company.recruitment_email_source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                        >
                            {sameSite(
                                company.recruitment_email_source,
                                company.website,
                            )
                                ? 'situs perusahaan'
                                : 'iklan lowongan'}
                        </a>
                        {company.recruitment_email_verified_at &&
                            ' · domain dapat menerima email'}
                        .
                    </p>
                )}
                {!sendsTo && !company.contact_checked_at && (
                    <p>Email sedang dicari otomatis di situs perusahaan.</p>
                )}
                {!sendsTo && company.contact_checked_at && (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-amber-900">
                        Dicek {formatDateTime(company.contact_checked_at)}:
                        iklan dan situs perusahaan tidak mencantumkan email.
                        Kandidat melamar di halaman lamaran aslinya.
                    </p>
                )}
            </div>
        </Section>
    );
}

function EmailRow({
    label,
    email,
    sendsTo,
}: {
    label: string;
    email: string | null;
    sendsTo: string | null;
}) {
    return (
        <div>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="flex flex-wrap items-center gap-2 font-medium">
                {email ? (
                    <a
                        href={`mailto:${email}`}
                        className="break-all hover:underline"
                    >
                        {email}
                    </a>
                ) : (
                    <span className="font-normal text-muted-foreground">
                        Tidak ditemukan
                    </span>
                )}
                {email && email === sendsTo && (
                    <Badge variant="secondary">Tujuan lamaran</Badge>
                )}
            </dd>
        </div>
    );
}

ScrapedListingShow.layout = {
    breadcrumbs: [
        {
            title: 'Hasil Scrape',
            href: ScrapedJobListingController.index().url,
        },
    ],
};
