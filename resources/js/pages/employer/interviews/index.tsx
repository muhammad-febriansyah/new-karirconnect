import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Head, Link, router } from '@inertiajs/react';
import { Bot, Calendar, ChevronsRight, GripVertical, MapPin, MoreVertical, Plus, Video } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { create as interviewCreate, stage as interviewStage } from '@/routes/employer/interviews';

type InterviewCard = {
    id: number;
    title: string;
    stage: string | null;
    stage_label: string | null;
    mode: string | null;
    status: string | null;
    scheduled_at: string | null;
    candidate_name: string | null;
    job_title: string | null;
    job_slug: string | null;
};

type Column = {
    key: string;
    label: string;
    items: InterviewCard[];
};

type SelectOption = { value: string; label: string };

type Props = {
    columns: Column[];
    filters: { status: string; group_by: 'stage' | 'status' };
    statusOptions: SelectOption[];
    stageOptions: SelectOption[];
};

const modeIcon = (mode: string | null) => {
    switch (mode) {
        case 'ai':
            return <Bot className="size-3.5" />;
        case 'online':
            return <Video className="size-3.5" />;
        case 'onsite':
            return <MapPin className="size-3.5" />;
        default:
            return <Calendar className="size-3.5" />;
    }
};

const STAGE_TONE: Record<string, string> = {
    screening: 'bg-slate-50 dark:bg-slate-900/40',
    hr: 'bg-sky-50 dark:bg-sky-950/30',
    user: 'bg-violet-50 dark:bg-violet-950/30',
    technical: 'bg-amber-50 dark:bg-amber-950/30',
    final: 'bg-emerald-50 dark:bg-emerald-950/30',
};

export default function InterviewsIndex({ columns: initialColumns, filters, stageOptions }: Props) {
    const [columns, setColumns] = useState<Column[]>(initialColumns);
    const [activeCard, setActiveCard] = useState<InterviewCard | null>(null);

    // Re-sync when server returns a new view (e.g. after group_by toggle)
    useMemo(() => setColumns(initialColumns), [initialColumns]);

    const sensors = useSensors(
        // Material Design `drag-threshold`: avoid accidental drags on small movements.
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        // Keyboard fallback for accessibility (Apple HIG `keyboard-shortcuts`).
        useSensor(KeyboardSensor),
    );

    const setGroup = (next: 'stage' | 'status') => {
        router.get(
            '/employer/interviews',
            { group_by: next, status: filters.status },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const moveToStage = (interviewId: number, newStage: string) => {
        router.post(
            interviewStage(interviewId).url,
            { stage: newStage },
            { preserveScroll: true },
        );
    };

    const handleDragStart = (event: DragStartEvent) => {
        const id = Number(event.active.id);
        const card = columns.flatMap((c) => c.items).find((i) => i.id === id) ?? null;
        setActiveCard(card);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveCard(null);
        const { active, over } = event;
        if (!over) return;

        const interviewId = Number(active.id);
        const targetStage = String(over.id).replace('column-', '');
        const card = columns.flatMap((c) => c.items).find((i) => i.id === interviewId);
        if (!card || card.stage === targetStage) return;

        // Optimistic update — move the card immediately, then persist.
        const next = columns.map((col) => {
            if (col.key === card.stage) {
                return { ...col, items: col.items.filter((i) => i.id !== interviewId) };
            }
            if (col.key === targetStage) {
                const stageLabel = stageOptions.find((s) => s.value === targetStage)?.label ?? null;
                return { ...col, items: [...col.items, { ...card, stage: targetStage, stage_label: stageLabel }] };
            }
            return col;
        });
        setColumns(next);

        router.post(
            interviewStage(interviewId).url,
            { stage: targetStage },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setColumns(initialColumns),
            },
        );
    };

    const totalItems = columns.reduce((sum, c) => sum + c.items.length, 0);
    const dndEnabled = filters.group_by === 'stage';

    const KanbanBody = (
        <Section className="overflow-x-auto">
            {totalItems === 0 ? (
                <EmptyState
                    title="Belum ada interview"
                    description="Mulai dengan menjadwalkan interview pertama dari salah satu pelamar."
                />
            ) : (
                <div
                    className={cn(
                        'grid gap-3',
                        columns.length === 5
                            ? 'md:grid-cols-3 lg:grid-cols-5'
                            : 'md:grid-cols-3 lg:grid-cols-5',
                    )}
                >
                    {columns.map((col) => (
                        <KanbanColumn
                            key={col.key}
                            column={col}
                            tone={dndEnabled ? STAGE_TONE[col.key] ?? 'bg-muted/30' : 'bg-muted/30'}
                            dndEnabled={dndEnabled}
                            stageOptions={stageOptions}
                            onMove={moveToStage}
                            groupBy={filters.group_by}
                        />
                    ))}
                </div>
            )}
        </Section>
    );

    return (
        <>
            <Head title="Interview" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Interview"
                    description={
                        filters.group_by === 'stage'
                            ? 'Pipeline kandidat per tahap. Drag kartu antar kolom atau pakai menu untuk pindah tahap.'
                            : 'Daftar interview dikelompokkan berdasarkan status terjadwal.'
                    }
                    actions={
                        <div className="flex items-center gap-2">
                            <div
                                role="tablist"
                                aria-label="Tampilan kanban"
                                className="inline-flex rounded-md border bg-background p-0.5 text-xs"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={filters.group_by === 'stage'}
                                    onClick={() => setGroup('stage')}
                                    className={cn(
                                        'rounded px-3 py-1.5 font-medium transition-colors',
                                        filters.group_by === 'stage'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    Per Tahap
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={filters.group_by === 'status'}
                                    onClick={() => setGroup('status')}
                                    className={cn(
                                        'rounded px-3 py-1.5 font-medium transition-colors',
                                        filters.group_by === 'status'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    Per Status
                                </button>
                            </div>
                            <Button asChild>
                                <Link href={interviewCreate().url}>
                                    <Plus className="size-4" /> Jadwalkan
                                </Link>
                            </Button>
                        </div>
                    }
                />

                {dndEnabled ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        {KanbanBody}
                        <DragOverlay dropAnimation={null}>
                            {activeCard && <CardPreview card={activeCard} />}
                        </DragOverlay>
                    </DndContext>
                ) : (
                    KanbanBody
                )}
            </div>
        </>
    );
}

function KanbanColumn({
    column,
    tone,
    dndEnabled,
    stageOptions,
    onMove,
    groupBy,
}: {
    column: Column;
    tone: string;
    dndEnabled: boolean;
    stageOptions: SelectOption[];
    onMove: (id: number, stage: string) => void;
    groupBy: 'stage' | 'status';
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `column-${column.key}`,
        disabled: !dndEnabled,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex min-w-[220px] flex-col gap-2 rounded-lg p-2 transition-colors',
                tone,
                isOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
            )}
            aria-label={`${column.label}, ${column.items.length} item`}
        >
            <div className="flex items-center justify-between px-1 text-sm font-semibold">
                <span>{column.label}</span>
                <Badge variant="secondary">{column.items.length}</Badge>
            </div>

            {column.items.length === 0 ? (
                <div className={cn(
                    'rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground transition-colors',
                    isOver && 'border-primary bg-primary/5 text-primary',
                )}>
                    {isOver ? 'Lepaskan di sini' : 'Kosong'}
                </div>
            ) : (
                column.items.map((item) => (
                    <DraggableCard
                        key={item.id}
                        card={item}
                        dndEnabled={dndEnabled}
                        stageOptions={stageOptions}
                        onMove={onMove}
                        groupBy={groupBy}
                    />
                ))
            )}
        </div>
    );
}

function DraggableCard({
    card,
    dndEnabled,
    stageOptions,
    onMove,
    groupBy,
}: {
    card: InterviewCard;
    dndEnabled: boolean;
    stageOptions: SelectOption[];
    onMove: (id: number, stage: string) => void;
    groupBy: 'stage' | 'status';
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: card.id,
        disabled: !dndEnabled,
    });

    return (
        <Card
            ref={setNodeRef}
            className={cn(
                'group/card transition',
                isDragging ? 'opacity-30' : 'hover:shadow-md',
            )}
        >
            <CardContent className="space-y-2 p-3">
                <div className="flex items-start gap-1.5">
                    {dndEnabled && (
                        <button
                            type="button"
                            {...listeners}
                            {...attributes}
                            aria-label={`Drag ${card.title}`}
                            className="touch-none rounded p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/card:opacity-100 focus-visible:opacity-100 cursor-grab active:cursor-grabbing"
                        >
                            <GripVertical className="size-4" />
                        </button>
                    )}

                    <Link
                        href={`/employer/interviews/${card.id}`}
                        className="flex-1 text-sm font-medium leading-tight hover:underline"
                    >
                        {card.title}
                    </Link>

                    {dndEnabled && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Aksi kartu"
                                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/card:opacity-100 focus-visible:opacity-100"
                                >
                                    <MoreVertical className="size-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs">Pindahkan ke</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {stageOptions.map((opt) => (
                                    <DropdownMenuItem
                                        key={opt.value}
                                        disabled={opt.value === card.stage}
                                        onSelect={() => onMove(card.id, opt.value)}
                                    >
                                        <ChevronsRight className="size-3.5" />
                                        {opt.label}
                                        {opt.value === card.stage && (
                                            <span className="ml-auto text-xs text-muted-foreground">sekarang</span>
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div className="text-xs font-medium text-foreground/80">{card.candidate_name ?? '—'}</div>

                {card.job_title && (
                    <div className="truncate text-xs text-muted-foreground">{card.job_title}</div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                        <Calendar className="size-3" />
                        {card.scheduled_at ? formatDateTime(card.scheduled_at) : '-'}
                    </div>
                    <Badge variant="outline" className="gap-1 text-[10px]">
                        {modeIcon(card.mode)}
                        {card.mode}
                    </Badge>
                </div>

                {groupBy === 'status' && card.stage_label && (
                    <Badge variant="secondary" className="text-[10px]">{card.stage_label}</Badge>
                )}
            </CardContent>
        </Card>
    );
}

function CardPreview({ card }: { card: InterviewCard }) {
    return (
        <Card className="w-[260px] cursor-grabbing rotate-2 shadow-2xl ring-2 ring-primary">
            <CardContent className="space-y-2 p-3">
                <div className="text-sm font-medium leading-tight">{card.title}</div>
                <div className="text-xs text-muted-foreground">{card.candidate_name ?? '—'}</div>
                {card.job_title && (
                    <div className="truncate text-xs text-muted-foreground">{card.job_title}</div>
                )}
            </CardContent>
        </Card>
    );
}
