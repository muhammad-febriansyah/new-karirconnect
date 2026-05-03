import { usePage } from '@inertiajs/react';
import { Bell, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFcm } from '@/hooks/use-fcm';
import { isFirebaseConfigured } from '@/lib/firebase';

const DISMISS_KEY = 'karirconnect.notification-banner.dismissed';

export function NotificationPermissionBanner() {
    const { auth } = usePage<{ auth: { user?: { id?: number } | null } }>().props;
    const { permission, requesting, request } = useFcm();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return window.localStorage.getItem(DISMISS_KEY) === '1';
    });

    if (!auth?.user?.id) {
        return null;
    }

    if (!isFirebaseConfigured()) {
        return null;
    }

    if (permission === 'granted' || permission === 'denied' || permission === 'unsupported') {
        return null;
    }

    if (dismissed) {
        return null;
    }

    const handleDismiss = (): void => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(DISMISS_KEY, '1');
        }
        setDismissed(true);
    };

    return (
        <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent p-4 text-sm text-brand-navy sm:mx-6">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-sm">
                <Bell className="size-4" />
            </span>
            <div className="flex-1">
                <p className="font-semibold">Aktifkan notifikasi push</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                    Dapatkan pemberitahuan real-time untuk lamaran, pesan recruiter, dan jadwal interview — bahkan saat tab ditutup.
                </p>
                <div className="mt-3 flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        onClick={request}
                        disabled={requesting}
                        className="bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                    >
                        {requesting ? 'Memproses…' : 'Aktifkan Sekarang'}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={handleDismiss}>
                        Nanti saja
                    </Button>
                </div>
            </div>
            <button
                type="button"
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-brand-navy"
                onClick={handleDismiss}
                aria-label="Tutup"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
