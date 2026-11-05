import { router, useHttp } from '@inertiajs/react';
import type { RowSelectionState } from '@tanstack/react-table';
import { CheckCircle2, CloudDownload, Loader2, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import CrawlRunController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlRunController';
import ExternalJobController from '@/actions/App/Http/Controllers/Admin/Scraper/ExternalJobController';
import { DataTable } from '@/components/admin/scraper/data-table';
import {
    canPublish,
    listingColumns,
} from '@/components/admin/scraper/listing-columns';
import type { ExternalListingRow } from '@/components/admin/scraper/listing-columns';
import { PublishPanel } from '@/components/admin/scraper/publish-panel';
import { ToneBadge } from '@/components/admin/scraper/scraper-ui';
import {
    parseUrls,
    SourcePicker,
} from '@/components/admin/scraper/source-picker';
import type { ScrapeSources } from '@/components/admin/scraper/source-picker';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { RunRow } from '@/types/scraper';

type Step = 'choose' | 'running' | 'results';

const POLL_MS = 3000;

/**
 * "Scrap" flow: pick sources -> queue a crawl per source -> follow progress
 * -> review what was found in a data table -> publish all or a selection.
 */
export function ScrapeDialog({
    open,
    onOpenChange,
    sources,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sources: ScrapeSources;
}) {
    const [step, setStep] = useState<Step>('choose');
    // The parent remounts this dialog (key) each time it opens, so the
    // initial selection is computed fresh from the catalog defaults.
    const [catalog, setCatalog] = useState<string[]>(() =>
        sources.catalog
            .filter(
                (entry) =>
                    entry.default_selected && entry.cooldown_until === null,
            )
            .map((entry) => entry.key),
    );
    const [saved, setSaved] = useState<number[]>([]);
    const [urlText, setUrlText] = useState('');
    const urls = parseUrls(urlText);
    const chosenCount = catalog.length + saved.length + urls.length;
    const [runIds, setRunIds] = useState<number[]>([]);
    const [runs, setRuns] = useState<RunRow[]>([]);
    const [results, setResults] = useState<ExternalListingRow[] | null>(null);
    const [resultTotal, setResultTotal] = useState(0);
    const [selection, setSelection] = useState<RowSelectionState>({});
    const timer = useRef<number | null>(null);

    const start = useHttp<
        { catalog: string[]; urls: string[]; source_ids: number[] },
        {
            runs: Array<{ id: number; source: string }>;
            skipped: Array<{ source: string; reason: string }>;
        }
    >({ catalog: [], urls: [], source_ids: [] });
    const status = useHttp<
        Record<string, never>,
        { runs: RunRow[]; finished: boolean }
    >({});
    const fetchResults = useHttp<
        Record<string, never>,
        { total: number; truncated: boolean; listings: ExternalListingRow[] }
    >({});

    const stopPolling = () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };

    useEffect(
        () => () => {
            if (timer.current !== null) {
                window.clearTimeout(timer.current);
            }
        },
        [],
    );

    const loadResults = (ids: number[], preselect = true) => {
        fetchResults.get(
            ExternalJobController.results({ query: { runs: ids.join(',') } })
                .url,
            {
                onSuccess: (response) => {
                    setResults(response.listings);
                    setResultTotal(response.total);
                    // Preselect everything that can still be published, but
                    // only on the first load: after a publish, start clean.
                    setSelection(
                        preselect
                            ? Object.fromEntries(
                                  response.listings
                                      .filter(canPublish)
                                      .map((row) => [String(row.id), true]),
                              )
                            : {},
                    );
                    setStep('results');
                },
            },
        );
    };

    const poll = (ids: number[]) => {
        status.get(
            ExternalJobController.status({ query: { runs: ids.join(',') } })
                .url,
            {
                onSuccess: (response) => {
                    setRuns(response.runs);

                    if (response.finished) {
                        stopPolling();
                        loadResults(ids);
                    } else {
                        timer.current = window.setTimeout(
                            () => poll(ids),
                            POLL_MS,
                        );
                    }
                },
                onHttpException: () => {
                    timer.current = window.setTimeout(
                        () => poll(ids),
                        POLL_MS * 2,
                    );

                    return false;
                },
            },
        );
    };

    const begin = () => {
        start.transform(() => ({ catalog, urls, source_ids: saved }));
        start.post(ExternalJobController.scrape().url, {
            onSuccess: (response) => {
                response.skipped.forEach((item) =>
                    toast.warning(item.source, { description: item.reason }),
                );

                if (response.runs.length === 0) {
                    return;
                }

                toast.success('Scrape dimulai', {
                    description: `${response.runs.length} sumber masuk antrean.`,
                });
                const ids = response.runs.map((run) => run.id);
                setRunIds(ids);
                setRuns([]);
                setStep('running');
                poll(ids);
            },
            onError: (errors) =>
                toast.error('Tidak bisa mulai', {
                    description: Object.values(errors)[0],
                }),
        });
    };

    const close = (next: boolean) => {
        if (!next) {
            stopPolling();

            if (step === 'results') {
                router.reload({ only: ['listings'] });
            }

            setStep('choose');
            setResults(null);
            setSelection({});
        }

        onOpenChange(next);
    };

    const selectedIds = Object.keys(selection)
        .filter((key) => selection[key])
        .map(Number);
    const publishable = results?.filter(canPublish).length ?? 0;
    const columns = useMemo(() => listingColumns({ showSource: false }), []);

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-6xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CloudDownload className="size-5" /> Scrap lowongan
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'choose' &&
                            'Pilih dari katalog sumber yang mengizinkan pengambilan lowongan, atau tempel URL sendiri.'}
                        {step === 'running' &&
                            'Crawl berjalan di antrean "crawler". Jendela ini diperbarui otomatis.'}
                        {step === 'results' &&
                            'Lowongan yang ditemukan. Pilih yang akan dipublish ke portal, atau publish semuanya.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {step === 'choose' && (
                        <SourcePicker
                            sources={sources}
                            catalog={catalog}
                            onCatalogChange={setCatalog}
                            saved={saved}
                            onSavedChange={setSaved}
                            urlText={urlText}
                            onUrlTextChange={setUrlText}
                        />
                    )}

                    {step === 'running' && (
                        <div className="space-y-3">
                            {runs.length === 0
                                ? runIds.map((id) => (
                                      <Skeleton
                                          key={id}
                                          className="h-14 w-full"
                                      />
                                  ))
                                : runs.map((run) => (
                                      <div
                                          key={run.id}
                                          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                          <div>
                                              <p className="font-medium">
                                                  {run.source?.name}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                  {run.items_found} ditemukan ·{' '}
                                                  {run.items_created} baru ·{' '}
                                                  {run.items_updated} diperbarui
                                              </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {run.is_finished ? (
                                                  <CheckCircle2 className="size-4 text-emerald-600" />
                                              ) : (
                                                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                              )}
                                              <ToneBadge tone={run.status_tone}>
                                                  {run.status_label}
                                              </ToneBadge>
                                              <a
                                                  href={
                                                      CrawlRunController.show(
                                                          run.id,
                                                      ).url
                                                  }
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-primary hover:underline"
                                              >
                                                  Detail
                                              </a>
                                          </div>
                                      </div>
                                  ))}
                            {runs.some((run) => run.status === 'queued') && (
                                <p className="text-xs text-muted-foreground">
                                    Masih antre? Pastikan worker berjalan:{' '}
                                    <code>
                                        php artisan queue:work crawler
                                        --queue=crawler
                                    </code>
                                </p>
                            )}
                        </div>
                    )}

                    {step === 'results' &&
                        (results === null ? (
                            <Skeleton className="h-64 w-full" />
                        ) : results.length === 0 ? (
                            <EmptyState
                                bare
                                icon={CloudDownload}
                                title="Tidak ada lowongan"
                                description="Crawl selesai tanpa lowongan. Cek detail crawl untuk penyebabnya."
                            />
                        ) : (
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                    <span>
                                        {resultTotal} lowongan · {publishable}{' '}
                                        bisa dipublish · {selectedIds.length}{' '}
                                        dipilih
                                    </span>
                                    {resultTotal > results.length && (
                                        <span className="text-amber-700">
                                            Menampilkan {results.length}{' '}
                                            terbaru.
                                        </span>
                                    )}
                                </div>
                                <DataTable
                                    columns={columns}
                                    data={results}
                                    getRowId={(row) => String(row.id)}
                                    rowSelection={selection}
                                    onRowSelectionChange={setSelection}
                                    canSelect={canPublish}
                                    minWidth={820}
                                    className="max-h-[48vh] overflow-y-auto"
                                />
                            </div>
                        ))}
                </div>

                <DialogFooter className="block border-t pt-4">
                    {step === 'choose' && (
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => close(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={begin}
                                disabled={chosenCount === 0 || start.processing}
                            >
                                {start.processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <CloudDownload className="size-4" />
                                )}
                                Mulai scrap ({chosenCount})
                            </Button>
                        </div>
                    )}
                    {step === 'running' && (
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => loadResults(runIds)}
                            >
                                Lihat hasil sementara
                            </Button>
                        </div>
                    )}
                    {step === 'results' && results && results.length > 0 && (
                        <div className="space-y-3">
                            <PublishPanel
                                target={{ listingIds: selectedIds }}
                                onPublished={() => loadResults(runIds, false)}
                            />
                            <div className="flex flex-wrap justify-between gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        setSelection(
                                            Object.fromEntries(
                                                results
                                                    .filter(canPublish)
                                                    .map((row) => [
                                                        String(row.id),
                                                        true,
                                                    ]),
                                            ),
                                        )
                                    }
                                >
                                    Pilih semua yang bisa dipublish (
                                    {publishable})
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setStep('choose')}
                                >
                                    <RotateCw className="size-4" /> Scrap lagi
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
