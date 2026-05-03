import { Head, router } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ArrowRight, Clock3, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { index as assessmentIndex, show as assessmentShow, store as assessmentStore } from '@/routes/employee/skill-assessments';
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

type SkillOption = {
    id: number;
    name: string;
    category: string | null;
    question_count: number;
};

type AssessmentItem = {
    id: number;
    skill: string | null;
    category: string | null;
    status: string;
    score: number | null;
    total_questions: number;
    correct_answers: number;
    started_at: string | null;
    completed_at: string | null;
    expires_at: string | null;
};

type Props = {
    skills: SkillOption[];
    assessments: AssessmentItem[];
};

export default function SkillAssessmentIndex({ skills, assessments }: Props) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

    const columns: ColumnDef<AssessmentItem>[] = [
        {
            accessorKey: 'skill',
            header: 'Skill',
            cell: ({ row }) => (
                <div>
                    <div className="font-semibold">{row.original.skill}</div>
                    <Badge variant="outline">{row.original.category || 'General'}</Badge>
                </div>
            ),
        },
        {
            accessorKey: 'score',
            header: 'Hasil',
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground">
                    {row.original.total_questions} soal · {row.original.correct_answers} benar
                    {row.original.score !== null && <> · Skor {row.original.score}</>}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant={row.original.status === 'completed' ? 'default' : 'secondary'}>
                    {formatStatus(row.original.status)}
                </Badge>
            ),
        },
        {
            id: 'waktu',
            header: 'Waktu',
            cell: ({ row }) => (
                <div className="space-y-1 text-xs text-muted-foreground">
                    {row.original.started_at && <div>Mulai: {formatDateTime(row.original.started_at)}</div>}
                    {row.original.expires_at && <div><Clock3 className="mr-1 inline size-3" />Batas: {formatDateTime(row.original.expires_at)}</div>}
                </div>
            ),
        },
        {
            id: 'actions',
            enableHiding: false,
            header: () => <div className="text-right">Aksi</div>,
            cell: ({ row }) => (
                <div className="text-right">
                    <Button type="button" variant="outline" onClick={() => router.get(assessmentShow(row.original.id).url)}>
                        Lihat Detail
                        <ArrowRight className="size-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const table = useReactTable({
        data: assessments,
        columns,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _id, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword === '') return true;
            return [row.original.skill ?? '', row.original.category ?? '', row.original.status].join(' ').toLowerCase().includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: 10 } },
    });

    return (
        <>
            <Head title="Skill Assessments" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Skill Assessments"
                    description="Uji pemahaman skill inti Anda dan bangun bukti kemampuan yang lebih kuat untuk recruiter."
                />

                <Section title="Mulai Assessment" description="Setiap assessment berisi maksimal 5 soal aktif untuk satu skill.">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {skills.map((skill) => (
                            <Card key={skill.id}>
                                <CardContent className="space-y-3 p-4">
                                    <div className="space-y-1">
                                        <div className="font-semibold">{skill.name}</div>
                                        <div className="text-sm text-muted-foreground">{skill.category || 'General'} · {skill.question_count} soal</div>
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full"
                                        onClick={() => router.post(assessmentStore().url, { skill_id: skill.id }, { preserveScroll: true })}
                                    >
                                        <Sparkles className="size-4" />
                                        Mulai Assessment
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </Section>

                <Section title="Riwayat Assessment" description="Lanjutkan assessment yang masih berjalan atau lihat hasil terbaru Anda.">
                    {assessments.length === 0 ? (
                        <EmptyState
                            title="Belum ada assessment"
                            description="Mulai assessment pertama Anda untuk melihat riwayat dan hasil di sini."
                        />
                    ) : (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Input className="sm:max-w-sm" placeholder="Cari skill, kategori, status..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
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
                                <Table className="min-w-[980px]">
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

SkillAssessmentIndex.layout = {
    breadcrumbs: [{ title: 'Skill Assessments', href: assessmentIndex().url }],
};
