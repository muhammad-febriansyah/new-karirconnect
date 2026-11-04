import { router } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { StatusBadge } from '@/components/feedback/status-badge';
import { SelectControl } from '@/components/form/select-control';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Option, Paginator, Tone } from '@/types/scraper';

/** Error categories that mean the source refused us; shown in red. */
const BLOCKING_CATEGORIES = new Set([
    'access_restricted',
    'captcha',
    'ssrf_blocked',
]);
const WARNING_CATEGORIES = new Set([
    'rate_limited',
    'validation_error',
    'timeout',
]);

export function ToneBadge({
    tone,
    children,
    className,
}: {
    tone: Tone | string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <StatusBadge tone={tone as Tone} className={className}>
            {children}
        </StatusBadge>
    );
}

export function ErrorCategoryBadge({
    category,
    label,
}: {
    category: string;
    label: string;
}) {
    const tone: Tone = BLOCKING_CATEGORIES.has(category)
        ? 'destructive'
        : WARNING_CATEGORIES.has(category)
          ? 'warning'
          : 'secondary';

    return <ToneBadge tone={tone}>{label}</ToneBadge>;
}

/**
 * A filter dropdown where an empty filter is shown as "Semua …". Radix Select
 * cannot hold an empty value, so "all" stands in for it.
 */
export function FilterSelect({
    value,
    onChange,
    options,
    allLabel,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    allLabel: string;
    className?: string;
}) {
    return (
        <SelectControl
            className={cn('sm:w-48', className)}
            value={value === '' ? 'all' : value}
            onValueChange={(next) => onChange(next === 'all' ? '' : next)}
            options={[{ value: 'all', label: allLabel }, ...options]}
            placeholder={allLabel}
        />
    );
}

/**
 * Re-run the current index route with new filter values (page reset to 1).
 */
export function applyFilters(url: string, filters: Record<string, string>) {
    const query = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== ''),
    );

    router.get(url, query, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

export function PaginationBar<T>({
    paginator,
    noun = 'data',
}: {
    paginator: Paginator<T>;
    noun?: string;
}) {
    if (paginator.total === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
                Menampilkan {paginator.from}–{paginator.to} dari{' '}
                {paginator.total} {noun}
            </span>
            {paginator.last_page > 1 && (
                <div className="flex flex-wrap items-center gap-1">
                    {paginator.links.map((link, index) => (
                        <Button
                            key={`${link.label}-${index}`}
                            size="sm"
                            variant={link.active ? 'default' : 'ghost'}
                            disabled={!link.url}
                            onClick={() =>
                                link.url &&
                                router.visit(link.url, {
                                    preserveScroll: true,
                                    preserveState: true,
                                })
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function StatCard({
    icon: Icon,
    label,
    value,
    hint,
    tone = 'default',
}: {
    icon: LucideIcon;
    label: string;
    value: number | string;
    hint?: string;
    tone?: 'default' | 'warning' | 'danger' | 'success';
}) {
    const toneClasses = {
        default: 'bg-primary/10 text-primary',
        success: 'bg-emerald-100 text-emerald-700',
        warning: 'bg-amber-100 text-amber-700',
        danger: 'bg-rose-100 text-rose-700',
    }[tone];

    return (
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs">
            <div
                className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-lg',
                    toneClasses,
                )}
            >
                <Icon className="size-5" />
            </div>
            <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                {hint && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {hint}
                    </p>
                )}
            </div>
        </div>
    );
}

export function formatDuration(ms: number | null): string {
    if (ms === null) {
        return '-';
    }

    if (ms < 1000) {
        return `${ms} ms`;
    }

    const seconds = Math.round(ms / 1000);

    return seconds < 60
        ? `${seconds} dtk`
        : `${Math.floor(seconds / 60)} mnt ${seconds % 60} dtk`;
}

export function formatInterval(minutes: number): string {
    if (minutes % 1440 === 0) {
        return `${minutes / 1440} hari`;
    }

    if (minutes % 60 === 0) {
        return `${minutes / 60} jam`;
    }

    return `${minutes} menit`;
}

export function CompanyLogo({
    name,
    url,
    className,
}: {
    name: string;
    url: string | null;
    className?: string;
}) {
    return url ? (
        <img
            src={url}
            alt={`Logo ${name}`}
            className={cn(
                'size-9 shrink-0 rounded-md border bg-white object-contain p-0.5',
                className,
            )}
            loading="lazy"
        />
    ) : (
        <div
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted text-xs font-semibold text-muted-foreground',
                className,
            )}
        >
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
}
