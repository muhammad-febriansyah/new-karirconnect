import { usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useState } from 'react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import type { FlashBag, SharedPageProps } from '@/types/shared';

type Tone = keyof FlashBag;

const TONES: Record<
    Tone,
    {
        icon: ComponentType<{ className?: string }>;
        title: string;
        className: string;
    }
> = {
    success: {
        icon: CheckCircle2,
        title: 'Berhasil',
        className: 'border-emerald-500/30 bg-emerald-50 text-emerald-900',
    },
    error: {
        icon: XCircle,
        title: 'Terjadi masalah',
        className: 'border-destructive/30 bg-destructive/5 text-destructive',
    },
    warning: {
        icon: AlertTriangle,
        title: 'Perlu perhatian',
        className: 'border-amber-500/30 bg-amber-50 text-amber-900',
    },
    info: {
        icon: Info,
        title: 'Informasi',
        className: 'border-brand-blue/30 bg-brand-blue/5 text-brand-navy',
    },
};

const ORDER: Tone[] = ['success', 'error', 'warning', 'info'];

/**
 * Persistent counterpart to the flash toast.
 *
 * Toasts auto-dismiss after a few seconds, which is easy to miss right after a
 * redirect (the page is still painting). This keeps the same message on screen
 * until the user dismisses it or navigates again, so an action like submitting
 * a job application always leaves a visible confirmation behind.
 */
export function FlashBanner() {
    const { flash } = usePage<SharedPageProps>().props;
    const [dismissedMessage, setDismissedMessage] = useState<string | null>(
        null,
    );

    const active = ORDER.map((tone) => ({ tone, message: flash?.[tone] })).find(
        (entry): entry is { tone: Tone; message: string } =>
            typeof entry.message === 'string' && entry.message.length > 0,
    );

    if (!active || active.message === dismissedMessage) {
        return null;
    }

    const { icon: Icon, title, className } = TONES[active.tone];

    return (
        <div className="px-4 pt-4">
            <div
                role="status"
                aria-live="polite"
                className={cn(
                    'flex items-start gap-3 rounded-xl border p-4 text-sm shadow-xs',
                    className,
                )}
            >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="font-semibold">{title}</p>
                    <p className="mt-0.5 leading-relaxed opacity-90">
                        {active.message}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setDismissedMessage(active.message)}
                    aria-label="Tutup pesan"
                    className="shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
