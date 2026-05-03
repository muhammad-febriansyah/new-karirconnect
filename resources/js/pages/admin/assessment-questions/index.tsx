import { Head, Link, useForm } from '@inertiajs/react';
import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table';
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ArrowLeft, ChevronDown, ChevronsUpDown, Eye, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import AssessmentQuestionController from '@/actions/App/Http/Controllers/Admin/AssessmentQuestionController';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatStatus } from '@/lib/format-status';

type SkillOption = {
    id: number;
    name: string;
    category?: string | null;
    questions_count?: number;
    active_questions_count?: number;
    multiple_choice_count?: number;
    text_count?: number;
    updated_at?: string | null;
};
type Item = {
    id: number;
    skill_id: number;
    skill_name: string | null;
    type: string;
    question: string;
    options: string[];
    correct_answer: { value?: string };
    difficulty: string;
    time_limit_seconds: number;
    is_active: boolean;
};

type Props = {
    items: Item[];
    skills: SkillOption[];
    selectedSkill?: SkillOption | null;
};

type FormShape = {
    skill_id: string;
    type: string;
    question: string;
    options_text: string;
    correct_answer_value: string;
    difficulty: string;
    time_limit_seconds: number;
    is_active: boolean;
};

type GenerateFormShape = {
    skill_id: string;
    type: string;
    difficulty: string;
    count: number;
    topic: string;
    time_limit_seconds: number;
};

const defaultForm: FormShape = {
    skill_id: '',
    type: 'multiple_choice',
    question: '',
    options_text: '',
    correct_answer_value: '',
    difficulty: 'medium',
    time_limit_seconds: 300,
    is_active: true,
};

const defaultGenerateForm: GenerateFormShape = {
    skill_id: '',
    type: 'multiple_choice',
    difficulty: 'medium',
    count: 5,
    topic: '',
    time_limit_seconds: 300,
};

export default function AssessmentQuestionIndex({ items = [], skills, selectedSkill = null }: Props) {
    const [editing, setEditing] = useState<Item | null>(null);
    const [deleting, setDeleting] = useState<Item | null>(null);
    const [open, setOpen] = useState(false);
    const [generateOpen, setGenerateOpen] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const form = useForm<FormShape>(defaultForm);
    const generateForm = useForm<GenerateFormShape>(defaultGenerateForm);
    const fieldErrors = form.errors as Record<string, string | undefined>;
    const isSkillDetail = selectedSkill !== null;
    const filteredSkills = useMemo(() => {
        const keyword = globalFilter.toLowerCase().trim();

        if (keyword.length === 0) {
            return skills;
        }

        return skills.filter((skill) =>
            [skill.name, skill.category]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(keyword),
        );
    }, [globalFilter, skills]);

    const columns = useMemo<ColumnDef<Item>[]>(
        () => [
            {
                accessorKey: 'question',
                header: ({ column }) => (
                    <Button
                        variant="ghost"
                        className="-ml-2 h-auto px-2"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Pertanyaan
                        <ChevronsUpDown className="ml-1 size-4" />
                    </Button>
                ),
                cell: ({ row }) => (
                    <div className="space-y-1">
                        <div className="max-w-xl whitespace-normal font-medium">{row.original.question}</div>
                        <div className="text-xs text-muted-foreground">
                            Jawaban: {row.original.correct_answer?.value ?? '-'} · {row.original.time_limit_seconds} detik
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'skill_name',
                header: 'Skill',
                cell: ({ row }) => <Badge>{row.original.skill_name ?? 'Skill'}</Badge>,
            },
            {
                accessorKey: 'type',
                header: 'Tipe',
                cell: ({ row }) => <Badge variant="outline">{formatStatus(row.original.type)}</Badge>,
            },
            {
                accessorKey: 'difficulty',
                header: 'Level',
                cell: ({ row }) => <Badge variant="outline">{formatStatus(row.original.difficulty)}</Badge>,
            },
            {
                accessorKey: 'is_active',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge variant={row.original.is_active ? 'default' : 'secondary'}>
                        {row.original.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                ),
            },
            {
                accessorKey: 'options',
                header: 'Opsi',
                cell: ({ row }) => (
                    <span className="block max-w-[240px] whitespace-normal text-xs text-muted-foreground">
                        {row.original.options.length > 0 ? row.original.options.join(', ') : '-'}
                    </span>
                ),
            },
            {
                id: 'actions',
                enableHiding: false,
                header: () => <div className="text-right">Aksi</div>,
                cell: ({ row }) => (
                    <ActionGroup className="justify-end">
                        <ActionButton type="button" intent="edit" onClick={() => openEdit(row.original)}>
                            <Pencil className="size-4" /> Ubah
                        </ActionButton>
                        <ActionButton type="button" intent="delete" onClick={() => setDeleting(row.original)}>
                            <Trash2 className="size-4" /> Hapus
                        </ActionButton>
                    </ActionGroup>
                ),
            },
        ],
        [],
    );

    const table = useReactTable({
        data: items,
        columns,
        state: {
            sorting,
            globalFilter,
            columnVisibility,
        },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        globalFilterFn: (row, _columnId, filterValue) => {
            const keyword = String(filterValue).toLowerCase().trim();
            if (keyword.length === 0) {
                return true;
            }

            const searchSource = [
                row.original.question,
                row.original.skill_name,
                row.original.type,
                row.original.difficulty,
                row.original.correct_answer?.value,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return searchSource.includes(keyword);
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({
            ...defaultForm,
            skill_id: selectedSkill ? String(selectedSkill.id) : '',
        });
        setOpen(true);
    };

    const openEdit = (item: Item) => {
        setEditing(item);
        form.setData({
            skill_id: String(item.skill_id),
            type: item.type,
            question: item.question,
            options_text: item.options.join('\n'),
            correct_answer_value: item.correct_answer?.value ?? '',
            difficulty: item.difficulty,
            time_limit_seconds: item.time_limit_seconds,
            is_active: item.is_active,
        });
        setOpen(true);
    };

    const submit = () => {
        form.transform((data) => ({
            skill_id: Number(data.skill_id),
            type: data.type,
            question: data.question,
            options: data.type === 'multiple_choice' ? data.options_text.split('\n').map((value) => value.trim()).filter(Boolean) : [],
            correct_answer: { value: data.correct_answer_value },
            difficulty: data.difficulty,
            time_limit_seconds: data.time_limit_seconds,
            is_active: data.is_active,
            ...(editing ? { _method: 'put' } : {}),
        }));

        form.post(editing ? AssessmentQuestionController.update(editing.id).url : AssessmentQuestionController.store().url, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                setEditing(null);
                form.setData({
                    ...defaultForm,
                    skill_id: selectedSkill ? String(selectedSkill.id) : '',
                });
            },
        });
    };

    const submitGenerate = () => {
        generateForm.transform((data) => ({
            skill_id: Number(data.skill_id),
            type: data.type,
            difficulty: data.difficulty,
            count: Number(data.count),
            topic: data.topic,
            time_limit_seconds: Number(data.time_limit_seconds),
        }));

        generateForm.post('/admin/assessment-questions/generate', {
            preserveScroll: true,
            onSuccess: () => {
                setGenerateOpen(false);
                generateForm.setData({
                    ...defaultGenerateForm,
                    skill_id: selectedSkill ? String(selectedSkill.id) : '',
                });
            },
        });
    };

    return (
        <>
            <Head title={isSkillDetail ? `Soal ${selectedSkill.name}` : 'Bank Soal Assessment'} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={isSkillDetail ? `Soal ${selectedSkill.name}` : 'Bank Soal Assessment'}
                    description={
                        isSkillDetail
                            ? 'Kelola pertanyaan, jawaban benar, dan opsi untuk skill ini.'
                            : 'Pilih skill terlebih dahulu, lalu buka detail untuk mengelola pertanyaan dan jawabannya.'
                    }
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {isSkillDetail && (
                                <Button type="button" variant="outline" asChild>
                                    <Link href={AssessmentQuestionController.index().url}>
                                        <ArrowLeft className="size-4" />
                                        Kembali
                                    </Link>
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    generateForm.setData({
                                        ...defaultGenerateForm,
                                        skill_id: selectedSkill ? String(selectedSkill.id) : '',
                                    });
                                    setGenerateOpen(true);
                                }}
                            >
                                <Sparkles className="size-4" />
                                Generate AI
                            </Button>
                            <ActionButton intent="create" onClick={openCreate}>
                                <Plus className="size-4" />
                                Tambah Soal
                            </ActionButton>
                        </div>
                    }
                />

                <Section>
                    {!isSkillDetail ? (
                        <div className="space-y-4">
                            <InputField
                                label="Cari Skill"
                                value={globalFilter}
                                onChange={(event) => setGlobalFilter(event.target.value)}
                                placeholder="Cari nama skill atau kategori"
                                className="sm:max-w-md"
                            />

                            <div className="overflow-hidden rounded-md border">
                                <Table className="min-w-[760px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Skill</TableHead>
                                            <TableHead>Kategori</TableHead>
                                            <TableHead className="text-center">Total Soal</TableHead>
                                            <TableHead className="text-center">Pilihan Ganda</TableHead>
                                            <TableHead className="text-center">Teks</TableHead>
                                            <TableHead className="text-center">Aktif</TableHead>
                                            <TableHead className="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSkills.length > 0 ? (
                                            filteredSkills.map((skill) => (
                                                <TableRow key={skill.id}>
                                                    <TableCell>
                                                        <div className="font-medium">{skill.name}</div>
                                                        {skill.updated_at && (
                                                            <div className="text-xs text-muted-foreground">Update terakhir {skill.updated_at}</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{skill.category ?? 'Umum'}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">{skill.questions_count ?? 0}</TableCell>
                                                    <TableCell className="text-center">{skill.multiple_choice_count ?? 0}</TableCell>
                                                    <TableCell className="text-center">{skill.text_count ?? 0}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge>{skill.active_questions_count ?? 0} aktif</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button asChild size="sm">
                                                            <Link href={AssessmentQuestionController.showSkill(skill.id).url}>
                                                                <Eye className="size-4" />
                                                                Detail
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                    Belum ada skill yang cocok.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <InputField
                                label="Cari Soal"
                                value={globalFilter}
                                onChange={(event) => setGlobalFilter(event.target.value)}
                                placeholder="Cari pertanyaan, skill, tipe, level, jawaban"
                                className="sm:max-w-md"
                            />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="sm:ml-auto">
                                        Kolom <ChevronDown className="ml-2 size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {table
                                        .getAllColumns()
                                        .filter((column) => column.getCanHide())
                                        .map((column) => (
                                            <DropdownMenuCheckboxItem
                                                key={column.id}
                                                className="capitalize"
                                                checked={column.getIsVisible()}
                                                onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                                            >
                                                {column.id}
                                            </DropdownMenuCheckboxItem>
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
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.length > 0 ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                                Tidak ada data soal.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                Menampilkan {table.getRowModel().rows.length} dari {items.length} soal
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    Sebelumnya
                                </Button>
                                <span className="text-xs">
                                    Halaman {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    Berikutnya
                                </Button>
                            </div>
                        </div>
                    </div>
                    )}
                </Section>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <span />
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Ubah Soal' : 'Tambah Soal'}</DialogTitle>
                        <DialogDescription>
                            Pastikan skill, jawaban benar, dan batas waktunya sesuai dengan level kesulitan soal.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Skill</Label>
                                <Select value={form.data.skill_id} onValueChange={(value) => form.setData('skill_id', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih skill" /></SelectTrigger>
                                    <SelectContent>
                                        {skills.map((skill) => (
                                            <SelectItem key={skill.id} value={String(skill.id)}>{skill.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {form.errors.skill_id && <p className="text-xs text-destructive">{form.errors.skill_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Tipe Soal</Label>
                                <Select value={form.data.type} onValueChange={(value) => form.setData('type', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih tipe soal" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                                        <SelectItem value="text">Teks</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <TextareaField
                            label="Pertanyaan"
                            value={form.data.question}
                            onChange={(event) => form.setData('question', event.target.value)}
                            error={form.errors.question}
                            required
                        />

                        {form.data.type === 'multiple_choice' && (
                            <TextareaField
                                label="Opsi Jawaban"
                                description="Satu baris untuk satu opsi. Minimal 2 opsi untuk pilihan ganda."
                                value={form.data.options_text}
                                onChange={(event) => form.setData('options_text', event.target.value)}
                                error={fieldErrors.options}
                            />
                        )}

                        <div className="grid gap-4 md:grid-cols-3">
                            <InputField
                                label="Jawaban Benar"
                                value={form.data.correct_answer_value}
                                onChange={(event) => form.setData('correct_answer_value', event.target.value)}
                                error={fieldErrors.correct_answer}
                                required
                            />
                            <div className="space-y-2">
                                <Label>Kesulitan</Label>
                                <Select value={form.data.difficulty} onValueChange={(value) => form.setData('difficulty', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih tingkat kesulitan" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <InputField
                                label="Batas Waktu (detik)"
                                type="number"
                                min={30}
                                max={3600}
                                value={form.data.time_limit_seconds}
                                onChange={(event) => form.setData('time_limit_seconds', Number(event.target.value))}
                                error={form.errors.time_limit_seconds}
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.is_active}
                                onChange={(event) => form.setData('is_active', event.target.checked)}
                            />
                            Soal aktif
                        </label>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                        <Button type="button" onClick={submit} disabled={form.processing}>Simpan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Generate Soal dengan AI</DialogTitle>
                        <DialogDescription>
                            Buat beberapa soal sekaligus untuk skill tertentu. Hasil akan langsung masuk ke bank soal aktif.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Skill</Label>
                                <Select value={generateForm.data.skill_id} onValueChange={(value) => generateForm.setData('skill_id', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih skill" /></SelectTrigger>
                                    <SelectContent>
                                        {skills.map((skill) => (
                                            <SelectItem key={skill.id} value={String(skill.id)}>{skill.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {generateForm.errors.skill_id && <p className="text-xs text-destructive">{generateForm.errors.skill_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Tipe Soal</Label>
                                <Select value={generateForm.data.type} onValueChange={(value) => generateForm.setData('type', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih tipe soal" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="multiple_choice">Pilihan Ganda</SelectItem>
                                        <SelectItem value="text">Teks</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <TextareaField
                            label="Instruksi / Topik Khusus"
                            description="Opsional. Contoh: fokus ke Eloquent relationship, React hooks, atau SQL indexing."
                            value={generateForm.data.topic}
                            onChange={(event) => generateForm.setData('topic', event.target.value)}
                            error={generateForm.errors.topic}
                        />

                        <div className="grid gap-4 md:grid-cols-3">
                            <InputField
                                label="Jumlah Soal"
                                type="number"
                                min={1}
                                max={20}
                                value={generateForm.data.count}
                                onChange={(event) => generateForm.setData('count', Number(event.target.value))}
                                error={generateForm.errors.count}
                            />
                            <div className="space-y-2">
                                <Label>Kesulitan</Label>
                                <Select value={generateForm.data.difficulty} onValueChange={(value) => generateForm.setData('difficulty', value)}>
                                    <SelectTrigger><SelectValue placeholder="Pilih tingkat kesulitan" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="easy">Easy</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="hard">Hard</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <InputField
                                label="Batas Waktu"
                                type="number"
                                min={30}
                                max={3600}
                                value={generateForm.data.time_limit_seconds}
                                onChange={(event) => generateForm.setData('time_limit_seconds', Number(event.target.value))}
                                error={generateForm.errors.time_limit_seconds}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Batal</Button>
                        <Button type="button" onClick={submitGenerate} disabled={generateForm.processing}>
                            {generateForm.processing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                            Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus soal assessment?"
                description={
                    deleting
                        ? `Soal "${deleting.question}" akan dihapus permanen dari bank soal.`
                        : ''
                }
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => {
                    if (!deleting) {
                        return;
                    }

                    form.delete(AssessmentQuestionController.destroy(deleting.id).url, {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    });
                }}
            />
        </>
    );
}

AssessmentQuestionIndex.layout = {
    breadcrumbs: [
        {
            title: 'Assessment Questions',
            href: AssessmentQuestionController.index().url,
        },
    ],
};
