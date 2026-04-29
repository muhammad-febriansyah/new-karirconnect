import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashBag } from '@/types/shared';

type ToastType = keyof FlashBag;

const HANDLERS: Record<ToastType, (message: string) => void> = {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    warning: (msg) => toast.warning(msg),
    info: (msg) => toast.info(msg),
};

type ToastShape = { type?: ToastType; message?: string };

/**
 * Subscribe to Inertia router events instead of usePage() so this hook stays
 * mountable from globally-rendered components (e.g. <Toaster /> in app.tsx)
 * that live outside the Inertia page tree.
 *
 * Supports two flash shapes:
 *   { flash: { success?, error?, warning?, info? } }   ← session()->with('success', '...')
 *   { flash: { toast: { type, message } } }             ← Inertia::flash('toast', [...])
 */
export function useFlashToast(): void {
    const lastFiredRef = useRef<string>('');

    useEffect(() => {
        const fire = (flash: (FlashBag & { toast?: ToastShape }) | undefined) => {
            if (!flash) {
                return;
            }

            for (const key of Object.keys(HANDLERS) as ToastType[]) {
                const message = flash[key];

                if (typeof message === 'string' && message.length > 0) {
                    const fingerprint = `${key}|${message}|${Date.now()}`;

                    if (fingerprint !== lastFiredRef.current) {
                        HANDLERS[key](message);

                        lastFiredRef.current = fingerprint;
                    }
                }
            }

            const toastPayload = flash.toast;

            if (
                toastPayload
                && typeof toastPayload.message === 'string'
                && toastPayload.message.length > 0
            ) {
                const type = toastPayload.type ?? 'info';

                const fingerprint = `toast|${type}|${toastPayload.message}|${Date.now()}`;

                if (fingerprint !== lastFiredRef.current && HANDLERS[type]) {
                    HANDLERS[type](toastPayload.message);

                    lastFiredRef.current = fingerprint;
                }
            }
        };

        return router.on('navigate', (event) => {
            const flash = (event.detail.page.props as { flash?: FlashBag & { toast?: ToastShape } }).flash;
            fire(flash);
        });
    }, []);
}
