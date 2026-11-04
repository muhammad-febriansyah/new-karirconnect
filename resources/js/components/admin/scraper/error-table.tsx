import { Link } from '@inertiajs/react';
import CrawlRunController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlRunController';
import { ErrorCategoryBadge } from '@/components/admin/scraper/scraper-ui';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import type { ErrorRow } from '@/types/scraper';

export function ErrorTable({
    errors,
    showRun = true,
}: {
    errors: ErrorRow[];
    showRun?: boolean;
}) {
    return (
        <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[860px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-44">Waktu</TableHead>
                        <TableHead className="w-44">Kategori</TableHead>
                        <TableHead>Pesan</TableHead>
                        {showRun && (
                            <TableHead className="w-48">
                                Sumber / crawl
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {errors.map((error) => (
                        <TableRow
                            key={error.id}
                            className={
                                error.non_fatal ? 'opacity-75' : undefined
                            }
                        >
                            <TableCell className="align-top text-xs text-muted-foreground">
                                {formatDateTime(error.occurred_at)}
                            </TableCell>
                            <TableCell className="align-top">
                                <div className="flex flex-col items-start gap-1">
                                    <ErrorCategoryBadge
                                        category={error.category}
                                        label={error.category_label}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {[
                                            error.engine,
                                            error.http_status
                                                ? `HTTP ${error.http_status}`
                                                : null,
                                            error.non_fatal
                                                ? 'tidak fatal'
                                                : null,
                                            error.retryable
                                                ? 'bisa diulang'
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ') || '-'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="align-top">
                                <p className="text-sm break-words whitespace-pre-line">
                                    {error.message}
                                </p>
                                {error.url && (
                                    <p
                                        className="mt-1 max-w-[520px] truncate text-xs text-muted-foreground"
                                        title={error.url}
                                    >
                                        {error.url}
                                    </p>
                                )}
                            </TableCell>
                            {showRun && (
                                <TableCell className="align-top text-xs">
                                    <div>{error.source?.name ?? '-'}</div>
                                    <Link
                                        href={
                                            CrawlRunController.show(
                                                error.crawl_run_id,
                                            ).url
                                        }
                                        className="text-primary hover:underline"
                                    >
                                        Crawl #{error.crawl_run_id}
                                    </Link>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
