import { Check, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatRupiah } from '@/lib/format-rupiah';
import { cn } from '@/lib/utils';

type PricingCardProps = {
    name: string;
    description?: string | null;
    /** Price in IDR. Pass 0 for "Free". */
    priceIdr: number;
    /** Billing cadence label, e.g. "per bulan" or "per 30 hari". */
    period?: string;
    /** Render a highlighted/featured variant for the recommended plan. */
    featured?: boolean;
    /** Quota lines rendered above the feature list (e.g. "10 lowongan / bulan"). */
    quotas?: Array<{ label: string; value: string }>;
    /** Bullet list of plan features. */
    features: string[];
    /** Disabled state (e.g. plan unavailable for the user's role). */
    disabled?: boolean;
    /** CTA label. Default 'Pilih Paket'. */
    ctaLabel?: string;
    /** CTA element. When passed, replaces the default button — useful for Inertia <Link>. */
    cta?: ReactNode;
    onSelect?: () => void;
    className?: string;
};

/**
 * Single pricing plan card (Blueprint §15). Featured variant flips the visual
 * weight: solid surface, accent border, "Direkomendasikan" pill on top.
 */
export function PricingCard({
    name,
    description,
    priceIdr,
    period = 'per bulan',
    featured = false,
    quotas,
    features,
    disabled = false,
    ctaLabel = 'Pilih Paket',
    cta,
    onSelect,
    className,
}: PricingCardProps) {
    const isFree = priceIdr === 0;

    return (
        <Card
            className={cn(
                'relative flex flex-col overflow-hidden border-border/70 transition-shadow',
                featured && 'border-primary shadow-md',
                disabled && 'opacity-60',
                className,
            )}
            data-featured={featured}
        >
            {featured && (
                <div className="absolute right-4 top-4">
                    <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15">
                        <Sparkles className="size-3" aria-hidden />
                        Direkomendasikan
                    </Badge>
                </div>
            )}

            <CardHeader className="space-y-2 pb-4">
                <h3 className="text-lg font-semibold leading-tight">{name}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </CardHeader>

            <CardContent className="flex-1 space-y-5 pb-4">
                <div className="flex items-baseline gap-1.5">
                    {isFree ? (
                        <span className="text-3xl font-bold tracking-tight tabular-nums">Gratis</span>
                    ) : (
                        <>
                            <span className="text-3xl font-bold tracking-tight tabular-nums">
                                {formatRupiah(priceIdr)}
                            </span>
                            <span className="text-sm text-muted-foreground">{period}</span>
                        </>
                    )}
                </div>

                {quotas && quotas.length > 0 && (
                    <dl className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-xs">
                        {quotas.map((q) => (
                            <div key={q.label}>
                                <dt className="font-medium text-muted-foreground">{q.label}</dt>
                                <dd className="mt-0.5 text-sm font-semibold tabular-nums">{q.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}

                <ul className="space-y-2 text-sm">
                    {features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                            <Check
                                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden
                            />
                            <span className="text-foreground/90">{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>

            <CardFooter className="border-t bg-muted/20 pt-4">
                {cta ?? (
                    <Button
                        type="button"
                        className="w-full"
                        variant={featured ? 'default' : 'outline'}
                        disabled={disabled}
                        onClick={onSelect}
                    >
                        {ctaLabel}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
