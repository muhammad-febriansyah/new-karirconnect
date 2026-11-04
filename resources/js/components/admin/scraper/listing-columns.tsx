import { Link } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, ExternalLink, Pencil, Sparkles, Trash2 } from 'lucide-react';
import ScrapedJobListingController from '@/actions/App/Http/Controllers/Admin/Scraper/ScrapedJobListingController';
import { CompanyLogo, ToneBadge } from '@/components/admin/scraper/scraper-ui';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { formatDate } from '@/lib/format-date';
import type { Tone } from '@/types/scraper';

export type ExternalListingRow = {
    id: number;
    title: string;
    status: string;
    status_label: string;
    status_tone: Tone;
    location: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    category: string | null;
    company: { name: string; logo_url: string | null } | null;
    published_job: { slug: string; status: string | null } | null;
    published_at: string | null;
    last_seen_at: string | null;
    is_new?: boolean;
    source?: { name: string } | null;
    origins_count?: number;
};

/** A row can be published once, and only while it is still active. */
export const canPublish = (row: ExternalListingRow) =>
    row.published_job === null && row.status === 'active';

export function listingColumns({
    showSource = true,
    onDelete,
}: {
    showSource?: boolean;
    /** When given, an "Aksi" column with Detail / Edit / Hapus is added. */
    onDelete?: (row: ExternalListingRow) => void;
} = {}): ColumnDef<ExternalListingRow>[] {
    const columns: ColumnDef<ExternalListingRow>[] = [
        {
            id: 'title',
            header: 'Lowongan',
            cell: ({ row }) => {
                const listing = row.original;

                return (
                    <div className="flex items-center gap-3">
                        <CompanyLogo
                            name={listing.company?.name ?? '?'}
                            url={listing.company?.logo_url ?? null}
                        />
                        <div className="min-w-0">
                            <Link
                                href={
                                    ScrapedJobListingController.show(listing.id)
                                        .url
                                }
                                className="block max-w-[300px] truncate font-medium hover:underline"
                            >
                                {listing.title}
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {listing.company?.name ??
                                    'Perusahaan tidak diketahui'}
                                {listing.is_new && (
                                    <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700">
                                        <Sparkles className="size-3" /> baru
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'details',
            header: 'Detail',
            cell: ({ row }) => (
                <div className="text-xs text-muted-foreground">
                    <div>{row.original.location ?? 'Lokasi tidak disebut'}</div>
                    <div>
                        {[
                            row.original.employment_type,
                            row.original.work_arrangement,
                        ]
                            .filter(Boolean)
                            .join(' · ') || '-'}
                    </div>
                    {row.original.category ? (
                        <div className="text-foreground">
                            {row.original.category}
                        </div>
                    ) : (
                        <div className="text-amber-700">
                            Kategori belum terpetakan
                        </div>
                    )}
                </div>
            ),
        },
    ];

    if (showSource) {
        columns.push({
            id: 'source',
            header: 'Sumber',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>{row.original.source?.name ?? '-'}</div>
                    {(row.original.origins_count ?? 1) > 1 && (
                        <div className="text-muted-foreground">
                            +{(row.original.origins_count ?? 1) - 1} sumber lain
                        </div>
                    )}
                </div>
            ),
        });
    }

    columns.push({
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const listing = row.original;

            return (
                <div className="space-y-1">
                    <div className="flex flex-wrap gap-1">
                        <ToneBadge tone={listing.status_tone}>
                            {listing.status_label}
                        </ToneBadge>
                        {listing.published_job && (
                            <ToneBadge tone="primary">Dipublish</ToneBadge>
                        )}
                    </div>
                    {listing.published_job ? (
                        <a
                            href={`/jobs/${listing.published_job.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                            Lihat di portal <ExternalLink className="size-3" />
                        </a>
                    ) : (
                        <div className="text-xs text-muted-foreground">
                            {listing.published_at
                                ? `Tayang ${formatDate(listing.published_at)}`
                                : `Terlihat ${formatDate(listing.last_seen_at)}`}
                        </div>
                    )}
                </div>
            );
        },
    });

    if (onDelete) {
        columns.push({
            id: 'actions',
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <ActionGroup className="flex-nowrap justify-end">
                    <ActionButton asChild intent="detail">
                        <Link
                            href={
                                ScrapedJobListingController.show(
                                    row.original.id,
                                ).url
                            }
                        >
                            <Eye className="size-4" /> Detail
                        </Link>
                    </ActionButton>
                    <ActionButton asChild intent="edit">
                        <Link
                            href={
                                ScrapedJobListingController.edit(
                                    row.original.id,
                                ).url
                            }
                        >
                            <Pencil className="size-4" /> Edit
                        </Link>
                    </ActionButton>
                    <ActionButton
                        intent="delete"
                        onClick={() => onDelete(row.original)}
                    >
                        <Trash2 className="size-4" /> Hapus
                    </ActionButton>
                </ActionGroup>
            ),
        });
    }

    return columns;
}
