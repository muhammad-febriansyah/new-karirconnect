import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AuroraBackgroundProps = {
    className?: string;
    children?: ReactNode;
    showRadialGradient?: boolean;
};

/**
 * Soft animated gradient mesh that drifts behind hero content.
 * Pure CSS — no JS dependency.
 */
export function AuroraBackground({ className, children, showRadialGradient = true }: AuroraBackgroundProps) {
    return (
        <div className={cn('relative overflow-hidden', className)}>
            <div className="absolute inset-0 overflow-hidden">
                <div
                    className={cn(
                        'pointer-events-none absolute -inset-[10px] opacity-50 blur-[10px] [--aurora:repeating-linear-gradient(100deg,#1080E0_10%,#10C0E0_15%,#3CD7F4_20%,#10C0E0_25%,#1080E0_30%)] [--white-gradient:repeating-linear-gradient(100deg,#fff_0%,#fff_7%,transparent_10%,transparent_12%,#fff_16%)]',
                        '[background-image:var(--white-gradient),var(--aurora)] [background-position:50%_50%,50%_50%] [background-size:300%,_200%]',
                        'after:absolute after:inset-0 after:[background-image:var(--white-gradient),var(--aurora)] after:[background-attachment:fixed] after:[background-size:200%,_100%] after:mix-blend-difference after:content-[""]',
                        'animate-[aurora_60s_linear_infinite] will-change-transform',
                        showRadialGradient && '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]',
                    )}
                />
            </div>
            {children}
        </div>
    );
}
