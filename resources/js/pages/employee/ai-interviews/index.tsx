import { Head, Link, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Bot, Loader2, Mic, Play, Type } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Session = {
    id: number;
    status: string | null;
    mode: string | null;
    is_practice: boolean;
    started_at: string | null;
    completed_at: string | null;
    job: { title: string | null; slug: string | null };
    analysis: { overall_score: number; recommendation: string } | null;
};

type Props = { sessions: Session[] };

const tone = (status: string | null) => {
    switch (status) {
        case 'pending':
        case 'invited':
            return 'info';
        case 'in_progress':
            return 'primary';
        case 'completed':
            return 'success';
        case 'expired':
        case 'cancelled':
            return 'destructive';
        default:
            return 'muted';
    }
};

export default function AiInterviewsIndex({ sessions }: Props) {
    const [submittingMode, setSubmittingMode] = useState<'text' | 'voice' | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const startPractice = (mode: 'text' | 'voice') => {
        setSubmittingMode(mode);
        router.post(
            '/employee/ai-interviews/practice',
            { mode, language: 'id', voice: mode === 'voice' ? 'marin' : undefined },
            {
                onFinish: () => setSubmittingMode(null),
            },
        );
    };

    const columns: ColumnDef<Session>[] = [
        {
            accessorKey: 'job.title',
            id: 'sesi',
            header: 'Sesi',
            cell: ({ row }) => (
                <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <Bot className="size-4 text-primary" />
                        {row.original.is_practice ? 'Practice Session' : (row.original.job.title ?? 'AI Interview')}
                        {row.original.mode === 'voice' ? (
                            <Badge variant="secondary" className="gap-1">
                                <Mic className="size-3" /> Voice
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1">
                                <Type className="size-3" /> Teks
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.completed_at
                            ? `Selesai ${formatDateTime(row.original.completed_at)}`
                            : row.original.started_at
                              ? `Dimulai ${formatDateTime(row.original.started_at)}`
                              : '-'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <StatusBadge tone={tone(row.original.status) as never}>{formatStatus(row.original.status)}</StatusBadge>,
        },
        {
            id: 'analisis',
            header: 'Analisis',
            cell: ({ row }) =>
                row.original.analysis ? (
                    <div className="rounded-md border bg-muted/40 p-2 text-sm">
                        <span className="font-medium">Score: {row.original.analysis.overall_score}/100</span>
                        <span className="ml-2 text-xs text-muted-foreground">{row.original.analysis.recommendation}</span>
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    {row.original.status === 'in_progress' || row.original.status === 'pending' ? (
                        <Button asChild size="sm">
                            <Link href={`/employee/ai-interviews/${row.original.id}/run`}>
                                <Play className="size-4" /> Lanjutkan
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild size="sm" variant="outline">
                            <Link href={`/employee/ai-interviews/${row.original.id}/result`}>Lihat Hasil</Link>
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: sessions,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;

            return [
                row.original.job.title ?? '',
                row.original.is_practice ? 'practice' : '',
                row.original.mode ?? '',
                row.original.status ?? '',
                row.original.analysis?.recommendation ?? '',
            ]
                .join(' ')
                .toLowerCase()
                .includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="AI Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="AI Interview"
                    description="Latih kemampuan interview Anda dengan AI atau ikuti AI screening dari recruiter."
                />

                <Section title="Mulai Latihan" description="Pilih mode wawancara yang kamu inginkan.">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="group relative overflow-hidden border-slate-200/70 shadow-sm transition hover:shadow-md">
                            <span className="absolute inset-x-0 top-0 h-1 bg-slate-300" />
                            <CardContent className="space-y-4 p-6">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                        <Type className="size-6" />
                                    </div>
                                    <Badge variant="outline">Stabil</Badge>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Mode Teks</h3>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Ketik jawabanmu di textbox. AI mengevaluasi struktur, kedalaman, dan relevansi setelah tiap jawaban.
                                        Cocok kalau di tempat ramai atau mic bermasalah.
                                    </p>
                                </div>
                                <ul className="space-y-1 text-xs text-slate-500">
                                    <li>· Tidak butuh mic / izin browser</li>
                                    <li>· Bisa berpikir sambil ngetik</li>
                                    <li>· Hemat token AI</li>
                                </ul>
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    disabled={submittingMode !== null}
                                    onClick={() => startPractice('text')}
                                >
                                    {submittingMode === 'text' ? <Loader2 className="size-4 animate-spin" /> : <Type className="size-4" />}
                                    Mulai Latihan Teks
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="group relative overflow-hidden border-slate-200/70 shadow-sm transition hover:shadow-md">
                            <span
                                className="absolute inset-x-0 top-0 h-1"
                                style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                            />
                            <CardContent className="space-y-4 p-6">
                                <div className="flex items-start justify-between gap-2">
                                    <div
                                        className="flex size-12 items-center justify-center rounded-xl text-white shadow-sm"
                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                    >
                                        <Mic className="size-6" />
                                    </div>
                                    <Badge
                                        className="text-white"
                                        style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                    >
                                        Beta
                                    </Badge>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Mode Voice</h3>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Realtime AI conversation — ngomong langsung pakai mic, AI jawab pakai suara natural. Mirip wawancara
                                        Zoom dengan recruiter sungguhan.
                                    </p>
                                </div>
                                <ul className="space-y-1 text-xs text-slate-500">
                                    <li>· Butuh mic + HTTPS / localhost</li>
                                    <li>· Lebih natural, bisa interrupt</li>
                                    <li>· Latihan public speaking sekaligus</li>
                                </ul>
                                <Button
                                    className="w-full text-white"
                                    style={{ background: 'linear-gradient(135deg, #1080E0, #10C0E0)' }}
                                    disabled={submittingMode !== null}
                                    onClick={() => startPractice('voice')}
                                >
                                    {submittingMode === 'voice' ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
                                    Mulai Latihan Voice
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </Section>

                <Section title="Riwayat Sesi">
                    {sessions.length === 0 ? (
                        <EmptyState
                            title="Belum ada sesi AI Interview"
                            description="Mulai latihan mock interview gratis untuk meningkatkan persiapan Anda."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari sesi, mode, status..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline">Kolom</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {table.getAllColumns().filter((column) => column.getCanHide()).map((column) => (
                                            <DropdownMenuCheckboxItem key={column.id} checked={column.getIsVisible()} onCheckedChange={(v) => column.toggleVisibility(Boolean(v))}>{column.id}</DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="rounded-md border">
                                <Table className="min-w-[1100px]">
                                    <TableHeader>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                                                ))}
                                            </TableRow>
                                        )) : (
                                            <TableRow><TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}
