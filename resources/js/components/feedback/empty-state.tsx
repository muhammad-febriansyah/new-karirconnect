import { Inbox, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actions?: ReactNode;
    /** Hint that this empty state lives inside a card/Section already — removes outer chrome to avoid doubled borders. */
    bare?: boolean;
};

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    actions,
    bare = false,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'relative flex min-h-[280px] flex-col items-center justify-center gap-5 overflow-hidden text-center',
                !bare && 'rounded-xl border border-dashed border-brand-blue/20 bg-gradient-to-br from-brand-blue/[0.02] via-background to-brand-cyan/[0.02] p-10 sm:p-14',
                bare && 'p-6',
            )}
        >
            {/* Decorative dotted grid pattern */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                    backgroundImage:
                        'radial-gradient(circle, var(--color-brand-blue) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                    maskImage:
                        'radial-gradient(ellipse at center, black 0%, transparent 70%)',
                    WebkitMaskImage:
                        'radial-gradient(ellipse at center, black 0%, transparent 70%)',
                }}
            />

            {/* Layered icon — ripple ring effect */}
            <div className="relative">
                <span aria-hidden className="absolute inset-0 -m-6 rounded-full bg-brand-blue/[0.05]" />
                <span aria-hidden className="absolute inset-0 -m-3 rounded-full bg-brand-blue/[0.08]" />
                <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-lg shadow-brand-blue/30">
                    <Icon className="size-7" strokeWidth={1.75} />
                    <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/10 to-white/30" />
                </div>
            </div>

            <div className="relative max-w-md space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight text-brand-navy">
                    {title}
                </h3>
                {description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="relative flex w-full max-w-sm flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    {actions}
                </div>
            )}
        </div>
    );
}
