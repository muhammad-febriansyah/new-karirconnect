import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActionIntent =
    | 'view'
    | 'detail'
    | 'edit'
    | 'create'
    | 'approve'
    | 'reject'
    | 'suspend'
    | 'delete'
    | 'download'
    | 'back'
    | 'filter';

const ACTION_STYLES: Record<ActionIntent, string> = {
    view: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200',
    detail: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200',
    edit: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
    create: 'bg-primary text-primary-foreground hover:bg-primary/90',
    approve: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
    reject: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
    suspend: 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-200',
    delete: 'border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 dark:border-destructive/40 dark:bg-destructive/15',
    download: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200',
    back: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200',
    filter: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-200',
};

type ActionButtonProps = ComponentProps<typeof Button> & {
    intent: ActionIntent;
};

export function ActionButton({
    intent,
    className,
    variant,
    size = 'sm',
    asChild = false,
    ...props
}: ActionButtonProps) {
    return (
        <Button
            {...props}
            asChild={asChild}
            variant={variant ?? (intent === 'create' ? 'default' : 'outline')}
            size={size}
            className={cn(
                intent !== 'create' && ACTION_STYLES[intent],
                'font-medium shadow-none',
                className,
            )}
        />
    );
}

export function ActionGroup({
    className,
    ...props
}: ComponentProps<'div'>) {
    return (
        <div
            {...props}
            className={cn('flex flex-wrap items-center justify-end gap-2', className)}
        />
    );
}

export function ActionButtonSlot({
    className,
    ...props
}: ComponentProps<typeof Slot.Root>) {
    return <Slot.Root {...props} className={className} />;
}
