import { cn } from '@/lib/utils';

type MatchScoreBadgeProps = {
    /** Score 0–100. Negative or > 100 values are clamped. */
    score: number | null | undefined;
    /** Visual size. Default 'md' = 56px. 'sm' = 36px, 'lg' = 80px. */
    size?: 'sm' | 'md' | 'lg';
    /** Override the suffix label below the score. Default 'Match'. */
    label?: string;
    /** Hide the textual score inside the donut (icon-only). */
    hideValue?: boolean;
    /** Show animated stripes while we wait for the AI score to arrive. */
    pending?: boolean;
    className?: string;
};

const SIZE_TOKENS = {
    sm: { px: 36, stroke: 4, font: 'text-[10px]', label: 'text-[9px]' },
    md: { px: 56, stroke: 5, font: 'text-sm', label: 'text-[10px]' },
    lg: { px: 80, stroke: 7, font: 'text-xl', label: 'text-xs' },
} as const;

/**
 * Donut indicator for AI Match Score (Blueprint §15). Encodes zones via color
 * + numeric value so it doesn't violate "color is not the only signal" (§1).
 *  - >=80  → emerald
 *  - 60–79 → amber
 *  - <60   → rose
 */
export function MatchScoreBadge({
    score,
    size = 'md',
    label = 'Match',
    hideValue = false,
    pending = false,
    className,
}: MatchScoreBadgeProps) {
    const tokens = SIZE_TOKENS[size];
    const radius = (tokens.px - tokens.stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    const safe = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : null;
    const offset = safe === null ? circumference : circumference * (1 - safe / 100);

    const ring =
        safe === null
            ? 'stroke-muted-foreground/30'
            : safe >= 80
              ? 'stroke-emerald-500'
              : safe >= 60
                ? 'stroke-amber-500'
                : 'stroke-rose-500';

    const text =
        safe === null
            ? 'text-muted-foreground'
            : safe >= 80
              ? 'text-emerald-600 dark:text-emerald-400'
              : safe >= 60
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400';

    const ariaLabel =
        safe === null
            ? `${label} score belum tersedia`
            : `${label} score ${safe} dari 100`;

    return (
        <div
            role="img"
            aria-label={ariaLabel}
            className={cn('relative inline-flex flex-col items-center justify-center', className)}
            style={{ width: tokens.px }}
        >
            <svg
                width={tokens.px}
                height={tokens.px}
                viewBox={`0 0 ${tokens.px} ${tokens.px}`}
                className={pending ? 'animate-pulse' : undefined}
                aria-hidden
            >
                <circle
                    cx={tokens.px / 2}
                    cy={tokens.px / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={tokens.stroke}
                    className="stroke-muted-foreground/15"
                />
                <circle
                    cx={tokens.px / 2}
                    cy={tokens.px / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={tokens.stroke}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${tokens.px / 2} ${tokens.px / 2})`}
                    className={cn('transition-[stroke-dashoffset] duration-500 ease-out', ring)}
                />
            </svg>

            {!hideValue && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className={cn('font-semibold tabular-nums', tokens.font, text)}>
                        {safe ?? '—'}
                    </span>
                    {size === 'lg' && (
                        <span className={cn('mt-0.5 font-medium uppercase tracking-wide text-muted-foreground', tokens.label)}>
                            {label}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
