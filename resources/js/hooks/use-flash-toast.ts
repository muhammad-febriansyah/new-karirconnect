import { usePage } from '@inertiajs/react';
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

export function useFlashToast(): void {
    const { flash } = usePage().props as { flash?: FlashBag };
    const lastFiredRef = useRef<string>('');

    useEffect(() => {
        if (!flash) {
            return;
        }

        for (const key of Object.keys(HANDLERS) as ToastType[]) {
            const message = flash[key];
            if (typeof message === 'string' && message.length > 0) {
                const fingerprint = `${key}|${message}`;
                if (fingerprint !== lastFiredRef.current) {
                    HANDLERS[key](message);
                    lastFiredRef.current = fingerprint;
                }
            }
        }
    }, [flash]);
}
