import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionProps = {
    title?: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function Section({ title, description, actions, children, className }: SectionProps) {
    return (
        <section className={cn('rounded-xl border bg-card p-6 shadow-sm', className)}>
            {(title || description || actions) && (
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                        )}
                    </div>
                    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}
