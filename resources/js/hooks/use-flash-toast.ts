import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashBag } from '@/types/shared';

type ToastType = keyof FlashBag;

/**
 * Sonner's 4s default can expire while the destination page is still painting
 * after a redirect, so the confirmation for an action like "Kirim Lamaran"
 * could be gone before the user ever looked at it.
 */
const TOAST_DURATION = 10000;

const HANDLERS: Record<ToastType, (message: string) => void> = {
    success: (msg) => toast.success('Berhasil', { description: msg, duration: TOAST_DURATION }),
    error: (msg) => toast.error('Terjadi masalah', { description: msg, duration: TOAST_DURATION }),
    warning: (msg) => toast.warning('Perlu perhatian', { description: msg, duration: TOAST_DURATION }),
    info: (msg) => toast.info('Informasi', { description: msg, duration: TOAST_DURATION }),
};

type ToastShape = { type?: ToastType; message?: string };
type ValidationErrors = Record<string, string | string[] | undefined>;

/**
 * Error keys that already have inline display elsewhere (OAuth providers,
 * external integrations) and are NOT actual form fields. The generic
 * "Formulir belum lengkap" toast should not fire when only these keys are
 * present — the controller is expected to flash a proper `error` message
 * instead.
 */
const NON_FORM_ERROR_KEYS = new Set(['google', 'oauth', 'social']);

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

            const formKeys = Object.keys(errors).filter(
                (key) => !NON_FORM_ERROR_KEYS.has(key),
            );

            if (formKeys.length === 0) {
                return;
            }

            const fingerprint = `validation|${formKeys.sort().join(',')}`;
            const now = Date.now();

            if (
                fingerprint === lastFiredRef.current
                && now - lastFiredAtRef.current <= 1200
            ) {
                return;
            }

            toast.error('Formulir belum lengkap', {
                description: 'Masih ada isian yang perlu diperbaiki. Silakan cek kolom yang ditandai.',
                duration: TOAST_DURATION,
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

        // Inertia v3 delivers Inertia::flash() data through a dedicated `flash`
        // event carrying page.flash (NOT page.props.flash). Controllers using
        // Inertia::flash('toast', [...]) only surface here, so subscribe to it.
        const offFlash = router.on('flash', (event) => {
            fire(event.detail.flash as (FlashBag & { toast?: ToastShape }) | undefined);
        });

        return () => {
            offNavigate();
            offSuccess();
            offFlash();
        };
    }, []);
}
