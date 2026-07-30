import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Database,
    Download,
    RefreshCw,
    ShieldAlert,
    Terminal,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { exportMethod as databaseExport } from '@/routes/admin/database';

type ExportDetails = {
    status?: 'started' | 'completed' | 'failed';
    bytes?: number;
    error?: string | null;
};

type RecentExport = {
    id: number;
    actor: string;
    ip_address: string | null;
    created_at: string | null;
    details: ExportDetails | null;
};

type Props = {
    available: boolean;
    error: string | null;
    connection: string;
    database: string;
    recentExports: RecentExport[];
    csrfToken: string;
};

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '-';
    }

    return new Date(iso).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function formatBytes(bytes: number | undefined): string {
    if (bytes === undefined || bytes <= 0) {
        return '-';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default function AdminDatabaseIndex({
    available,
    error,
    connection,
    database,
    recentExports,
    csrfToken,
}: Props) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const isRunning = recentExports.some(
        (item) => (item.details?.status ?? 'completed') === 'started',
    );

    // The download is a plain form POST that streams a file, so the page never
    // re-renders on its own -- without this the history sits stale, and a dump
    // that failed halfway keeps looking like a finished backup.
    useEffect(() => {
        if (!isRunning) {
            return;
        }

        const timer = window.setInterval(() => {
            router.reload({ only: ['recentExports'] });
        }, 4000);

        return () => window.clearInterval(timer);
    }, [isRunning]);

    return (
        <>
            <Head title="Export Database" />

            <PageHeader
                title="Export Database"
                description="Unduh salinan penuh database sebagai file .sql untuk keperluan backup."
            />

            <Section className="space-y-6">
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="size-5 shrink-0" />
                            Berisi seluruh data sensitif
                        </CardTitle>
                        <CardDescription className="text-destructive/90">
                            File hasil export memuat hash password semua akun,
                            secret two-factor, serta data pribadi pelamar dan
                            perusahaan. Siapa pun yang memegang file ini
                            memegang seluruh isi database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-destructive/90">
                        <p>Sebelum mengunduh, pastikan:</p>
                        <ul className="list-inside list-disc space-y-1">
                            <li>
                                File disimpan di perangkat terenkripsi, bukan
                                folder Download yang tersinkron ke cloud
                                pribadi.
                            </li>
                            <li>
                                File tidak dikirim lewat WhatsApp, email, atau
                                chat kantor.
                            </li>
                            <li>File dihapus setelah tidak dipakai.</li>
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="size-5 shrink-0" />
                            Target
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <dl className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <dt className="text-xs text-muted-foreground">
                                    Nama database
                                </dt>
                                <dd className="font-mono text-sm">
                                    {database}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs text-muted-foreground">
                                    Koneksi
                                </dt>
                                <dd className="font-mono text-sm">
                                    {connection}
                                </dd>
                            </div>
                        </dl>

                        {!available && (
                            <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                                <div className="space-y-2">
                                    <p className="font-medium text-amber-700 dark:text-amber-500">
                                        Export tidak tersedia
                                    </p>
                                    <p className="text-muted-foreground">
                                        {error}
                                    </p>
                                    <p className="flex items-center gap-1.5 text-muted-foreground">
                                        <Terminal className="size-3.5 shrink-0" />
                                        Sementara itu, backup tetap bisa
                                        dijalankan lewat SSH dengan{' '}
                                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                            mysqldump
                                        </code>
                                        .
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-1">
                            <Button
                                type="button"
                                disabled={!available}
                                onClick={() => setIsConfirmOpen(true)}
                            >
                                <Download className="size-4" />
                                Export Database
                            </Button>
                            <p className="pt-2 text-xs text-muted-foreground">
                                Anda akan diminta memasukkan ulang password.
                                Dibatasi 3 export per jam, dan setiap export
                                tercatat di audit log.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Export terakhir
                            {isRunning && (
                                <RefreshCw className="size-4 animate-spin text-muted-foreground" />
                            )}
                        </CardTitle>
                        <CardDescription>
                            Kalau ada baris yang tidak Anda kenali, itu tanda
                            akun admin bocor — segera ganti password semua
                            admin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {recentExports.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Belum pernah ada export.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs text-muted-foreground">
                                            <th className="pr-4 pb-2 font-medium">
                                                Waktu
                                            </th>
                                            <th className="pr-4 pb-2 font-medium">
                                                Oleh
                                            </th>
                                            <th className="pr-4 pb-2 font-medium">
                                                IP
                                            </th>
                                            <th className="pr-4 pb-2 font-medium">
                                                Ukuran
                                            </th>
                                            <th className="pb-2 font-medium">
                                                Hasil
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentExports.map((item) => {
                                            // Entries written before the outcome was tracked have no
                                            // details; calling those "failed" would be a lie.
                                            const status = item.details?.status;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="py-2 pr-4 whitespace-nowrap">
                                                        {formatDateTime(
                                                            item.created_at,
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        {item.actor}
                                                    </td>
                                                    <td className="py-2 pr-4 font-mono text-xs">
                                                        {item.ip_address ?? '-'}
                                                    </td>
                                                    <td className="py-2 pr-4 tabular-nums">
                                                        {formatBytes(
                                                            item.details?.bytes,
                                                        )}
                                                    </td>
                                                    <td className="py-2">
                                                        {status ===
                                                            'completed' && (
                                                            <StatusBadge tone="success">
                                                                Selesai
                                                            </StatusBadge>
                                                        )}
                                                        {status ===
                                                            'started' && (
                                                            <StatusBadge tone="warning">
                                                                Berjalan
                                                            </StatusBadge>
                                                        )}
                                                        {status ===
                                                            'failed' && (
                                                            <StatusBadge tone="destructive">
                                                                Gagal
                                                            </StatusBadge>
                                                        )}
                                                        {status ===
                                                            undefined && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Tidak tercatat
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {recentExports.some(
                            (item) => item.details?.status === 'failed',
                        ) && (
                            <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                                <div className="space-y-1">
                                    <p className="font-medium text-destructive">
                                        Ada export yang gagal
                                    </p>
                                    <p className="text-muted-foreground">
                                        File-nya sudah terunduh tapi tidak
                                        lengkap — di akhir file ada baris{' '}
                                        <code className="rounded bg-muted px-1 py-0.5 text-xs">
                                            -- DUMP GAGAL
                                        </code>
                                        . Jangan dipakai sebagai backup, ulangi
                                        export-nya.
                                    </p>
                                    {recentExports.find(
                                        (item) =>
                                            item.details?.status === 'failed',
                                    )?.details?.error && (
                                        <pre className="mt-1 overflow-x-auto rounded bg-card p-2 text-xs">
                                            {
                                                recentExports.find(
                                                    (item) =>
                                                        item.details?.status ===
                                                        'failed',
                                                )?.details?.error
                                            }
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                router.reload({ only: ['recentExports'] })
                            }
                        >
                            <RefreshCw className="size-4" /> Perbarui
                        </Button>
                    </CardContent>
                </Card>
            </Section>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Export seluruh database?</DialogTitle>
                        <DialogDescription>
                            File{' '}
                            <span className="font-mono">{database}.sql</span>{' '}
                            akan diunduh ke perangkat ini dan memuat seluruh
                            data pengguna. Tindakan ini tercatat atas nama akun
                            Anda.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsConfirmOpen(false)}
                        >
                            Batal
                        </Button>
                        {/*
                            Plain form, not Inertia's router: the response is a streamed
                            file, and an XHR would receive the bytes into memory and drop
                            them instead of handing the browser a download.
                        */}
                        <form
                            method="POST"
                            action={databaseExport().url}
                            onSubmit={() => {
                                setIsConfirmOpen(false);
                                // Give the request a moment to create its audit row, then
                                // pull it in so the history reflects the running export.
                                window.setTimeout(
                                    () =>
                                        router.reload({
                                            only: ['recentExports'],
                                        }),
                                    1500,
                                );
                            }}
                        >
                            <input
                                type="hidden"
                                name="_token"
                                value={csrfToken}
                            />
                            <Button type="submit" variant="destructive">
                                <Download className="size-4" />
                                Ya, export sekarang
                            </Button>
                        </form>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
