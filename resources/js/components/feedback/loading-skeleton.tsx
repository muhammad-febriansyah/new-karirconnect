import { Skeleton } from '@/components/ui/skeleton';

type Preset = 'table' | 'card-grid' | 'profile' | 'list';

const PRESETS: Record<Preset, () => React.ReactNode> = {
    table: () => (
        <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
            ))}
        </div>
    ),
    'card-grid': () => (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-xl border bg-card p-4">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2">
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-6 w-16" />
                    </div>
                </div>
            ))}
        </div>
    ),
    profile: () => (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            </div>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    ),
    list: () => (
        <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
            ))}
        </div>
    ),
};

export function LoadingSkeleton({ preset = 'list' }: { preset?: Preset }) {
    return <>{PRESETS[preset]()}</>;
}
