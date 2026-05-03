import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashBag } from '@/types/shared';

type ToastType = keyof FlashBag;

const HANDLERS: Record<ToastType, (message: string) => void> = {
    success: (msg) => toast.success('Berhasil', { description: msg }),
    error: (msg) => toast.error('Terjadi masalah', { description: msg }),
    warning: (msg) => toast.warning('Perlu perhatian', { description: msg }),
    info: (msg) => toast.info('Informasi', { description: msg }),
};

type ToastShape = { type?: ToastType; message?: string };
type ValidationErrors = Record<string, string | string[] | undefined>;

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
    const lastFiredAtRef = useRef<number>(0);

    useEffect(() => {
        const fire = (flash: (FlashBag & { toast?: ToastShape }) | undefined) => {
            if (!flash) {
                return;
            }

            for (const key of Object.keys(HANDLERS) as ToastType[]) {
                const message = flash[key];

                if (typeof message === 'string' && message.length > 0) {
                    const fingerprint = `${key}|${message}`;
                    const now = Date.now();

                    // Prevent accidental double-fire from the same navigation event,
                    // but allow the same message to appear again on later actions.
                    if (
                        fingerprint !== lastFiredRef.current
                        || now - lastFiredAtRef.current > 1200
                    ) {
                        HANDLERS[key](message);

                        lastFiredRef.current = fingerprint;
                        lastFiredAtRef.current = now;
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

                const fingerprint = `toast|${type}|${toastPayload.message}`;
                const now = Date.now();

                if (
                    HANDLERS[type]
                    && (
                        fingerprint !== lastFiredRef.current
                        || now - lastFiredAtRef.current > 1200
                    )
                ) {
                    HANDLERS[type](toastPayload.message);

                    lastFiredRef.current = fingerprint;
                    lastFiredAtRef.current = now;
                }
            }
        };

        const fireValidationToast = (errors: ValidationErrors | undefined) => {
            if (!errors || Object.keys(errors).length === 0) {
                return;
            }

            const fingerprint = `validation|${Object.keys(errors).sort().join(',')}`;
            const now = Date.now();

            if (
                fingerprint === lastFiredRef.current
                && now - lastFiredAtRef.current <= 1200
            ) {
                return;
            }

            toast.error('Formulir belum lengkap', {
                description: 'Masih ada isian yang perlu diperbaiki. Silakan cek kolom yang ditandai.',
            });

            lastFiredRef.current = fingerprint;
            lastFiredAtRef.current = now;
        };

        const handlePageProps = (pageProps: {
            flash?: FlashBag & { toast?: ToastShape };
            errors?: ValidationErrors;
        }) => {
            const flash = pageProps.flash;

            fire(flash);
            fireValidationToast(pageProps.errors);
        };

        const offNavigate = router.on('navigate', (event) => {
            const pageProps = event.detail.page.props as {
                flash?: FlashBag & { toast?: ToastShape };
                errors?: ValidationErrors;
            };

            handlePageProps(pageProps);
        });

        // Some same-page form submissions may emit "success" without a full "navigate".
        // Listen to both to ensure toast consistently appears across pages.
        const offSuccess = router.on('success', (event) => {
            const pageProps = event.detail.page.props as {
                flash?: FlashBag & { toast?: ToastShape };
                errors?: ValidationErrors;
            };

            handlePageProps(pageProps);
        });

        return () => {
            offNavigate();
            offSuccess();
        };
    }, []);
}
