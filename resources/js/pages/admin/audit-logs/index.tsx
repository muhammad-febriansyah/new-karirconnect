import { Head, router, useForm } from '@inertiajs/react';
import { Activity, ChevronDown, FileSearch, Search, ShieldCheck, User } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';

type Option = { value: string; label: string };

type AuditLog = {
    id: number;
    action: string;
    subject_type: string | null;
    subject_id: number | null;
    before_values: Record<string, unknown> | null;
    after_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string | null;
    user: { id: number; name: string; email: string; role: string | null } | null;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    logs: Paginator<AuditLog>;
    filters: { action?: string; user_id?: number | null; from?: string | null; to?: string | null };
    actionOptions: Option[];
    totals: { total: number; today: number; this_week: number };
};

const actionTone: Record<string, string> = {
    'settings.update': 'bg-amber-100 text-amber-700',
    'company.approve': 'bg-emerald-100 text-emerald-700',
    'company.suspend': 'bg-rose-100 text-rose-700',
    'review.approve': 'bg-emerald-100 text-emerald-700',
    'review.reject': 'bg-rose-100 text-rose-700',
};

export default function AdminAuditLogsIndex({ logs, filters, actionOptions, totals }: Props) {
    const [expanded, setExpanded] = useState<Record<number, boolean>>({});
    const { data, setData, get, processing } = useForm({
        action: filters.action ?? '',
        from: filters.from ?? '',
        to: filters.to ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/admin/audit-logs', { preserveState: true, preserveScroll: true });
    };

    const toggle = (id: number) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <>
            <Head title="Audit Log" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Audit Log"
                    description="Riwayat aksi sensitif (perubahan settings, moderasi, dll). Catatan tidak bisa dihapus."
                />

                <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard label="Total Log" value={totals.total.toLocaleString('id-ID')} icon={Activity} tone="default" />
                    <StatCard label="Hari Ini" value={totals.today.toLocaleString('id-ID')} icon={ShieldCheck} tone="primary" />
                    <StatCard label="Minggu Ini" value={totals.this_week.toLocaleString('id-ID')} icon={FileSearch} tone="success" />
                </div>

                <Section>
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-[220px_1fr_1fr_auto]">
                        <Select value={data.action || 'all'} onValueChange={(v) => setData('action', v === 'all' ? '' : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Semua aksi" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua aksi</SelectItem>
                                {actionOptions.map((a) => (
                                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            type="date"
                            value={data.from}
                            onChange={(e) => setData('from', e.target.value)}
                            aria-label="Dari tanggal"
                        />
                        <Input
                            type="date"
                            value={data.to}
                            onChange={(e) => setData('to', e.target.value)}
                            aria-label="Sampai tanggal"
                        />
                        <Button type="submit" disabled={processing}>
                            <Search className="size-4" /> Filter
                        </Button>
                    </form>
                </Section>

                <Section title={`${logs.from ?? 0}–${logs.to ?? 0} dari ${logs.total}`}>
                    {logs.data.length === 0 ? (
                        <EmptyState
                            icon={FileSearch}
                            title="Belum ada audit log"
                            description="Log akan muncul saat admin mengubah settings atau moderasi konten."
                        />
                    ) : (
                        <div className="overflow-hidden rounded-md border">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Aktor</TableHead>
                                            <TableHead>Aksi</TableHead>
                                            <TableHead>Subjek</TableHead>
                                            <TableHead>IP</TableHead>
                                            <TableHead>Waktu</TableHead>
                                            <TableHead className="text-right">Detail</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.data.map((log) => {
                                            const tone = actionTone[log.action] ?? 'bg-slate-100 text-slate-700';
                                            const open = expanded[log.id] ?? false;
                                            const hasDetail = log.before_values || log.after_values;
                                            return (
                                                <>
                                                    <TableRow key={log.id}>
                                                        <TableCell>
                                                            {log.user ? (
                                                                <div className="flex items-center gap-2">
                                                                    <Avatar className="size-7">
                                                                        <AvatarFallback>
                                                                            {log.user.name.charAt(0).toUpperCase()}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div className="min-w-0">
                                                                        <div className="truncate text-sm font-medium">{log.user.name}</div>
                                                                        <div className="text-xs text-muted-foreground">{log.user.email}</div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <User className="size-4" /> System
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className={`inline-flex rounded-full px-2 py-0.5 font-mono text-xs ${tone}`}>
                                                                {log.action}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {log.subject_type ? (
                                                                <>
                                                                    <div className="font-medium">{log.subject_type}</div>
                                                                    {log.subject_id && <div className="text-xs text-muted-foreground">#{log.subject_id}</div>}
                                                                </>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">{log.ip_address ?? '—'}</TableCell>
                                                        <TableCell className="text-xs tabular-nums">
                                                            {log.created_at ? formatDateTime(log.created_at) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {hasDetail ? (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => toggle(log.id)}
                                                                    aria-expanded={open}
                                                                    aria-controls={`log-detail-${log.id}`}
                                                                >
                                                                    <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    {open && hasDetail && (
                                                        <TableRow id={`log-detail-${log.id}`} className="bg-muted/30">
                                                            <TableCell colSpan={6} className="p-4">
                                                                <div className="grid gap-3 md:grid-cols-2">
                                                                    {log.before_values && (
                                                                        <div>
                                                                            <div className="mb-1 text-xs font-semibold text-muted-foreground">Sebelum</div>
                                                                            <pre className="overflow-x-auto rounded bg-card p-2 text-xs">{JSON.stringify(log.before_values, null, 2)}</pre>
                                                                        </div>
                                                                    )}
                                                                    {log.after_values && (
                                                                        <div>
                                                                            <div className="mb-1 text-xs font-semibold text-muted-foreground">Sesudah</div>
                                                                            <pre className="overflow-x-auto rounded bg-card p-2 text-xs">{JSON.stringify(log.after_values, null, 2)}</pre>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {log.user_agent && (
                                                                    <div className="mt-3 text-xs text-muted-foreground">
                                                                        <span className="font-semibold">UA:</span> {log.user_agent}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {logs.last_page > 1 && (
                                <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                                    <span>Halaman {logs.current_page} dari {logs.last_page}</span>
                                    <div className="flex items-center gap-1">
                                        {logs.links.filter((l) => l.url).slice(1, -1).map((link) => (
                                            <Button
                                                key={link.label}
                                                size="sm"
                                                variant={link.active ? 'default' : 'ghost'}
                                                onClick={() => link.url && router.visit(link.url, { preserveScroll: true, preserveState: true })}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Activity; tone: 'default' | 'success' | 'primary' }) {
    const toneClass = {
        default: 'bg-muted text-muted-foreground',
        success: 'bg-emerald-100 text-emerald-700',
        primary: 'bg-primary/10 text-primary',
    }[tone];

    return (
        <Card>
            <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex size-10 items-center justify-center rounded-lg ${toneClass}`}>
                    <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="truncate text-xl font-bold tabular-nums">{value}</div>
                </div>
            </CardContent>
        </Card>
    );
}
