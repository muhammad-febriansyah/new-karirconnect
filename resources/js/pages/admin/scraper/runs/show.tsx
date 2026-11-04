import { Head, Link, router, usePoll } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    CheckCircle2,
    Loader2,
    RotateCw,
    ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import CrawlErrorController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlErrorController';
import CrawlRunController from '@/actions/App/Http/Controllers/Admin/Scraper/CrawlRunController';
import JobSourceController from '@/actions/App/Http/Controllers/Admin/Scraper/JobSourceController';
import { ErrorTable } from '@/components/admin/scraper/error-table';
import {
    formatDuration,
    PaginationBar,
    ToneBadge,
} from '@/components/admin/scraper/scraper-ui';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format-date';
import type { ErrorRow, Paginator, RunRow } from '@/types/scraper';

type Attempt = { engine: string; outcome: string; ms?: number; items?: number };

type Run = RunRow & {
    engines_attempted: Attempt[];
    summary: Record<string, unknown>;
    retry_of: { id: number; uuid: string } | null;
    can_retry: boolean;
    can_cancel: boolean;
};

const OUTCOME_LABELS: Record<string, { label: string; tone: string }> = {
    ok: { label: 'Berhasil', tone: 'success' },
    failed: { label: 'Gagal, lanjut fallback', tone: 'warning' },
    stopped: { label: 'Dihentikan', tone: 'destructive' },
    skipped: { label: 'Dilewati', tone: 'muted' },
    unavailable: { label: 'Belum tersedia', tone: 'muted' },
};

const STATUS_EXPLANATIONS: Record<string, string> = {
    access_restricted:
        'Sumber menolak akses (403, CAPTCHA, login, atau robots.txt). Worker berhenti tanpa mencoba engine lain, dan sumber dijeda.',
    suspected_partial:
        'Jumlah lowongan jauh di bawah biasanya. Lowongan yang tidak terlihat tidak ditandai hilang pada crawl ini.',
    partial:
        'Hanya sebagian data yang terbaca (batas halaman atau gangguan di tengah jalan). Lowongan yang tidak terlihat tidak ditandai hilang.',
    failed: 'Crawl gagal. Lihat log di bawah untuk penyebabnya.',
};

export default function CrawlRunShow({
    run,
    runErrors,
}: {
    run: Run;
    // Not "errors": Inertia reserves that prop for validation errors.
    runErrors: Paginator<ErrorRow>;
}) {
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [busy, setBusy] = useState(false);

    const { start, stop } = usePoll(
        4000,
        { only: ['run', 'runErrors'] },
        { autoStart: false },
    );
    useEffect(() => {
        if (run.is_finished) {
            stop();
        } else {
            start();
        }

        return stop;
    }, [run.is_finished, start, stop]);

    const post = (url: string) => {
        setBusy(true);
        router.post(
            url,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setConfirmCancel(false);
                },
            },
        );
    };

    const counts: Array<[string, number]> = [
        ['Ditemukan', run.items_found],
        ['Baru', run.items_created],
        ['Diperbarui', run.items_updated],
        ['Tidak berubah', run.items_unchanged],
        ['Ditolak', run.items_rejected],
    ];
    const explanation = STATUS_EXPLANATIONS[run.status];

    return (
        <>
            <Head title={`Crawl #${run.id}`} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`Crawl #${run.id} · ${run.source?.name ?? 'Sumber dihapus'}`}
                    description={`${run.trigger_label}${run.triggered_by ? ` oleh ${run.triggered_by}` : ''} · dibuat ${formatDateTime(run.created_at)}`}
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link href={CrawlRunController.index().url}>
                                    <ArrowLeft className="size-4" /> Kembali
                                </Link>
                            </Button>
                            {run.can_cancel && (
                                <Button
                                    variant="outline"
                                    onClick={() => setConfirmCancel(true)}
                                    disabled={busy}
                                >
                                    <Ban className="size-4" /> Batalkan
                                </Button>
                            )}
                            {run.can_retry && (
                                <Button
                                    onClick={() =>
                                        post(
                                            CrawlRunController.retry(run.id)
                                                .url,
                                        )
                                    }
                                    disabled={busy}
                                >
                                    <RotateCw className="size-4" /> Crawl ulang
                                </Button>
                            )}
                        </>
                    }
                />

                <Section>
                    <div className="flex flex-wrap items-center gap-3">
                        {!run.is_finished && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                        <ToneBadge tone={run.status_tone}>
                            {run.status_label}
                        </ToneBadge>
                        {run.cancel_requested && (
                            <ToneBadge tone="warning">
                                Pembatalan diminta
                            </ToneBadge>
                        )}
                        <span className="text-sm text-muted-foreground">
                            Durasi {formatDuration(run.duration_ms)} · mulai{' '}
                            {formatDateTime(run.started_at)} · selesai{' '}
                            {formatDateTime(run.finished_at)}
                        </span>
                        {run.retry_of && (
                            <Link
                                href={
                                    CrawlRunController.show(run.retry_of.id).url
                                }
                                className="text-sm text-primary hover:underline"
                            >
                                Ulangan dari crawl #{run.retry_of.id}
                            </Link>
                        )}
                    </div>

                    {explanation && (
                        <Alert
                            variant={
                                run.status === 'failed' ||
                                run.status === 'access_restricted'
                                    ? 'destructive'
                                    : 'default'
                            }
                            className="mt-4"
                        >
                            <AlertTitle>{run.status_label}</AlertTitle>
                            <AlertDescription>{explanation}</AlertDescription>
                        </Alert>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                        {counts.map(([label, value]) => (
                            <div key={label} className="rounded-lg border p-3">
                                <dt className="text-xs text-muted-foreground">
                                    {label}
                                </dt>
                                <dd className="text-xl font-semibold tabular-nums">
                                    {value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                <Section
                    title="Engine"
                    description="Urutan strategi yang dicoba. Tiap engine paling banyak dicoba sekali per crawl."
                >
                    {run.engines_attempted.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {run.is_finished
                                ? 'Worker tidak mencoba engine apa pun.'
                                : 'Menunggu worker…'}
                        </p>
                    ) : (
                        <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            {run.engines_attempted.map((attempt, index) => {
                                const outcome = OUTCOME_LABELS[
                                    attempt.outcome
                                ] ?? {
                                    label: attempt.outcome,
                                    tone: 'secondary',
                                };

                                return (
                                    <li
                                        key={`${attempt.engine}-${index}`}
                                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                                    >
                                        <span className="font-mono">
                                            {index + 1}. {attempt.engine}
                                        </span>
                                        <ToneBadge tone={outcome.tone}>
                                            {outcome.label}
                                        </ToneBadge>
                                        {attempt.ms !== undefined &&
                                            attempt.ms > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDuration(attempt.ms)}
                                                </span>
                                            )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                    {run.source && (
                        <p className="mt-3 text-sm">
                            <Link
                                href={
                                    JobSourceController.edit(run.source.id).url
                                }
                                className="text-primary hover:underline"
                            >
                                Pengaturan sumber
                            </Link>
                        </p>
                    )}
                </Section>

                <Section
                    title="Log crawl ini"
                    actions={
                        runErrors.total > 0 ? (
                            <Button variant="ghost" size="sm" asChild>
                                <Link
                                    href={
                                        CrawlErrorController.index({
                                            query: { run: String(run.id) },
                                        }).url
                                    }
                                >
                                    Buka di Log Crawl
                                </Link>
                            </Button>
                        ) : undefined
                    }
                >
                    {runErrors.data.length === 0 ? (
                        <EmptyState
                            bare
                            icon={run.is_finished ? CheckCircle2 : ShieldCheck}
                            title={
                                run.is_finished
                                    ? 'Tidak ada error'
                                    : 'Belum ada log'
                            }
                            description={
                                run.is_finished
                                    ? 'Crawl ini selesai tanpa catatan error.'
                                    : 'Log muncul di sini setelah worker selesai.'
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            <ErrorTable
                                errors={runErrors.data}
                                showRun={false}
                            />
                            <PaginationBar paginator={runErrors} noun="log" />
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={confirmCancel}
                onOpenChange={setConfirmCancel}
                title="Batalkan crawl ini?"
                description={
                    run.status === 'running'
                        ? 'Worker sedang berjalan dan tidak dihentikan paksa. Hasilnya akan dibuang begitu worker selesai.'
                        : 'Crawl yang masih antre akan langsung dibatalkan.'
                }
                confirmLabel="Batalkan crawl"
                variant="destructive"
                confirmIcon={Ban}
                loading={busy}
                onConfirm={() => post(CrawlRunController.cancel(run.id).url)}
            />
        </>
    );
}

CrawlRunShow.layout = {
    breadcrumbs: [
        { title: 'Monitoring Crawl', href: CrawlRunController.index().url },
    ],
};
