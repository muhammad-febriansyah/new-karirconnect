import { router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const LOADER_DELAY = 150;

export function NavigationLoader() {
    const [isVisible, setIsVisible] = useState(false);
    const pendingVisits = useRef(0);
    const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearTimeoutIfNeeded = () => {
            if (timeout.current !== null) {
                clearTimeout(timeout.current);
                timeout.current = null;
            }
        };

        const offStart = router.on('start', () => {
            pendingVisits.current += 1;

            if (pendingVisits.current === 1) {
                timeout.current = setTimeout(() => {
                    if (pendingVisits.current > 0) {
                        setIsVisible(true);
                    }
                }, LOADER_DELAY);
            }
        });

        const offFinish = router.on('finish', () => {
            pendingVisits.current = Math.max(0, pendingVisits.current - 1);

            if (pendingVisits.current === 0) {
                clearTimeoutIfNeeded();
                setIsVisible(false);
            }
        });

        return () => {
            offStart();
            offFinish();
            clearTimeoutIfNeeded();
        };
    }, []);

    if (!isVisible) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/55 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Memuat halaman"
        >
            <div className="flex min-w-48 flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-8 py-6 text-center shadow-2xl shadow-black/10">
                <LoaderCircle
                    className="size-9 animate-spin text-primary"
                    aria-hidden="true"
                />
                <p className="text-sm font-medium text-foreground">
                    Sedang memproses…
                </p>
            </div>
        </div>
    );
}
