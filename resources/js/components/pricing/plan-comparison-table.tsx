import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlanColumn = {
    key: string;
    name: string;
    /** Mark this plan as the recommended one — column gets a subtle accent. */
    featured?: boolean;
};

type ComparisonRow = {
    /** Feature label shown in the leftmost column. */
    feature: string;
    /** Optional sub-text shown under the feature label. */
    helpText?: string;
    /**
     * Per-plan value: boolean = check/dash, string/number = literal text.
     * Keys must match `plans[].key`.
     */
    values: Record<string, boolean | string | number>;
};

type PlanComparisonTableProps = {
    plans: PlanColumn[];
    rows: ComparisonRow[];
    className?: string;
};

/**
 * Side-by-side feature comparison across pricing plans. Sticky leftmost column
 * keeps the feature label visible while scrolling on narrow viewports.
 */
export function PlanComparisonTable({ plans, rows, className }: PlanComparisonTableProps) {
    return (
        <div className={cn('overflow-x-auto rounded-xl border', className)}>
            <table className="w-full min-w-[640px] text-sm">
                <thead>
                    <tr className="border-b bg-muted/40">
                        <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3 text-left font-semibold">
                            Fitur
                        </th>
                        {plans.map((plan) => (
                            <th
                                key={plan.key}
                                scope="col"
                                className={cn(
                                    'px-4 py-3 text-center font-semibold',
                                    plan.featured && 'bg-primary/5 text-primary',
                                )}
                            >
                                {plan.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.feature} className="border-b last:border-0">
                            <th
                                scope="row"
                                className="sticky left-0 z-10 bg-background px-4 py-3 text-left font-medium align-top"
                            >
                                <div>{row.feature}</div>
                                {row.helpText && (
                                    <div className="mt-0.5 text-xs font-normal text-muted-foreground">
                                        {row.helpText}
                                    </div>
                                )}
                            </th>
                            {plans.map((plan) => {
                                const raw = row.values[plan.key];
                                return (
                                    <td
                                        key={plan.key}
                                        className={cn(
                                            'px-4 py-3 text-center align-middle tabular-nums',
                                            plan.featured && 'bg-primary/5',
                                        )}
                                    >
                                        <PlanCellValue value={raw} />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function PlanCellValue({ value }: { value: boolean | string | number | undefined }) {
    if (value === true) {
        return (
            <Check
                className="mx-auto size-4 text-emerald-600 dark:text-emerald-400"
                aria-label="Termasuk"
            />
        );
    }

    if (value === false || value === undefined || value === null) {
        return (
            <Minus
                className="mx-auto size-4 text-muted-foreground/60"
                aria-label="Tidak termasuk"
            />
        );
    }

    return <span className="text-foreground/90">{value}</span>;
}
