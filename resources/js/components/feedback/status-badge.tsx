import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'primary' | 'muted';

const TONE_CLASSES: Record<Tone, string> = {
    default: '',
    secondary: '',
    destructive: '',
    outline: '',
    success: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    info: 'border-transparent bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    primary: 'border-transparent bg-primary/10 text-primary',
    muted: 'border-transparent bg-muted text-muted-foreground',
};

const VARIANT_FALLBACK: Partial<Record<Tone, 'default' | 'secondary' | 'destructive' | 'outline'>> = {
    default: 'default',
    secondary: 'secondary',
    destructive: 'destructive',
    outline: 'outline',
};

export function StatusBadge({
    tone = 'secondary',
    children,
    className,
}: {
    tone?: Tone;
    children: React.ReactNode;
    className?: string;
}) {
    const fallback = VARIANT_FALLBACK[tone];
    return (
        <Badge
            variant={fallback ?? 'outline'}
            className={cn(TONE_CLASSES[tone], className)}
        >
            {children}
        </Badge>
    );
}
