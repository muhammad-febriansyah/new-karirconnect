import { Check, Lock, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { formatRupiah } from '@/lib/format-rupiah';
import { cn } from '@/lib/utils';

type PricingCardProps = {
    name: string;
    description?: string | null;
    /** Optional tier label rendered as a small badge next to the plan name. */
    tier?: string;
    /** Price in IDR. Pass 0 for "Free". */
    priceIdr: number;
    /** Billing cadence label, e.g. "per bulan" or "per 30 hari". */
    period?: string;
    /** Render a highlighted/featured variant for the recommended plan. */
    featured?: boolean;
    /** Quota chips rendered between price and feature list. Items with label "Tier" are filtered (use `tier` prop instead). */
    quotas?: Array<{ label: string; value: string }>;
    /** Bullet list of plan features. */
    features: string[];
    /** Features unavailable on this plan, shown locked with an upgrade hint. */
    lockedFeatures?: string[];
    /** Explicit upsell line shown at the bottom of the card. Overrides the
     * default "Upgrade ke Pro untuk membuka fitur terkunci" hint. Pass null to
     * suppress the hint entirely (e.g. for the top-tier plan). */
    upsellNote?: string | null;
    /** Disabled state (e.g. plan unavailable for the user's role). */
    disabled?: boolean;
    /** CTA label. Default 'Pilih Paket'. */
    ctaLabel?: string;
    /** CTA element. When passed, replaces the default button — useful for Inertia <Link>. */
    cta?: ReactNode;
    onSelect?: () => void;
    className?: string;
};

export function PricingCard({
    name,
    description,
    tier,
    priceIdr,
    period = 'per bulan',
    featured = false,
    quotas,
    features,
    lockedFeatures = [],
    upsellNote,
    disabled = false,
    ctaLabel = 'Pilih Paket',
    cta,
    onSelect,
    className,
}: PricingCardProps) {
    const isFree = priceIdr === 0;
    const visibleQuotas = (quotas ?? []).filter((q) => q.label.toLowerCase() !== 'tier');

    return (
        <Card
            className={cn(
                'relative flex h-full flex-col gap-0 overflow-hidden py-0 transition-all',
                featured
                    ? 'border-primary/60 shadow-lg ring-2 ring-primary/30 lg:-mt-3'
                    : 'border-border/70 hover:border-primary/40 hover:shadow-md',
                disabled && 'opacity-60',
                className,
            )}
            data-featured={featured}
        >
            {featured && (
                <div className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-primary to-primary/85 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
                    <Sparkles className="size-3" aria-hidden />
                    Paling Direkomendasikan
                </div>
            )}

            <CardHeader className="gap-1.5 px-5 pb-3 pt-5">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold leading-tight">{name}</h3>
                    {tier && (
                        <Badge
                            variant="outline"
                            className="shrink-0 px-1.5 py-0 text-[10px] font-medium uppercase tracking-wider"
                        >
                            {tier}
                        </Badge>
                    )}
                </div>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4 px-5 pb-4">
                <div className="flex items-baseline gap-1.5">
                    {isFree ? (
                        <span className="text-3xl font-bold tracking-tight">Gratis</span>
                    ) : (
                        <>
                            <span className="text-2xl font-bold tracking-tight tabular-nums sm:text-[1.65rem]">
                                {formatRupiah(priceIdr)}
                            </span>
                            <span className="text-xs text-muted-foreground">{period}</span>
                        </>
                    )}
                </div>

                {visibleQuotas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {visibleQuotas.map((q) => (
                            <span
                                key={q.label}
                                className="inline-flex items-baseline gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs"
                            >
                                <span className="font-semibold tabular-nums">{q.value}</span>
                                <span className="text-muted-foreground">{q.label}</span>
                            </span>
                        ))}
                    </div>
                )}

                {(features.length > 0 || lockedFeatures.length > 0) && (
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
                        {lockedFeatures.map((feature) => (
                            <li key={feature} className="flex items-start gap-2 text-muted-foreground">
                                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                                <span className="line-through decoration-muted-foreground/40">{feature}</span>
                            </li>
                        ))}
                    </ul>
                )}

                {(() => {
                    const note =
                        upsellNote === undefined
                            ? lockedFeatures.length > 0
                                ? 'Upgrade ke Pro untuk membuka fitur terkunci'
                                : null
                            : upsellNote;

                    if (!note) {
                        return null;
                    }

                    return (
                        <p className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            <Sparkles className="size-3.5 shrink-0" aria-hidden />
                            {note}
                        </p>
                    );
                })()}
            </CardContent>

            <CardFooter
                className={cn(
                    'mt-auto px-5 py-4',
                    featured ? 'border-t border-primary/20 bg-primary/5' : 'border-t bg-muted/20',
                )}
            >
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
