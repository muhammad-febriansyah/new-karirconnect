import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type RatingStarsProps = {
    /** Rating value, fractional allowed. Clamped to 0–max. */
    value: number | null | undefined;
    /** Maximum rating. Default 5. */
    max?: number;
    /** Visual size. */
    size?: 'sm' | 'md' | 'lg';
    /** Show the numeric value next to the stars (e.g. "4.2"). */
    showValue?: boolean;
    /** Optional review count, rendered after the value (e.g. "4.2 (128)"). */
    count?: number;
    className?: string;
};

const SIZE_PX = { sm: 14, md: 18, lg: 22 } as const;
const TEXT_SIZE = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const;

/**
 * Display-only rating component. Uses a clip-path overlay to render fractional
 * stars without a second icon set. Conveys the rating via numeric value + aria
 * label so it never relies on color alone (§1 color-not-only).
 */
export function RatingStars({
    value,
    max = 5,
    size = 'md',
    showValue = false,
    count,
    className,
}: RatingStarsProps) {
    const safe = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
    const px = SIZE_PX[size];
    const fillPercent = (safe / max) * 100;

    const ariaLabel =
        value === null || value === undefined
            ? 'Belum ada penilaian'
            : `Rating ${safe.toFixed(1)} dari ${max}${typeof count === 'number' ? `, ${count} ulasan` : ''}`;

    return (
        <span
            role="img"
            aria-label={ariaLabel}
            className={cn('inline-flex items-center gap-1.5', className)}
        >
            <span className="relative inline-flex" style={{ height: px }} aria-hidden>
                <span className="inline-flex" style={{ gap: 2 }}>
                    {Array.from({ length: max }, (_, i) => (
                        <Star key={`base-${i}`} size={px} className="text-muted-foreground/30" />
                    ))}
                </span>
                <span
                    className="pointer-events-none absolute inset-y-0 left-0 inline-flex overflow-hidden"
                    style={{ width: `${fillPercent}%`, gap: 2 }}
                >
                    {Array.from({ length: max }, (_, i) => (
                        <Star
                            key={`fill-${i}`}
                            size={px}
                            className="shrink-0 fill-amber-400 text-amber-400"
                        />
                    ))}
                </span>
            </span>

            {showValue && (
                <span className={cn('font-medium tabular-nums', TEXT_SIZE[size])}>
                    {value === null || value === undefined ? '—' : safe.toFixed(1)}
                    {typeof count === 'number' && (
                        <span className="ml-1 font-normal text-muted-foreground">
                            ({count.toLocaleString('id-ID')})
                        </span>
                    )}
                </span>
            )}
        </span>
    );
}
