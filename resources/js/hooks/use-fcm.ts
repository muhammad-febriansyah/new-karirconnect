import { getToken, onMessage } from 'firebase/messaging';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getFirebaseMessaging, isFirebaseConfigured, VAPID_KEY } from '@/lib/firebase';

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

const SERVICE_WORKER_PATH = '/firebase-messaging-sw.js';

let audioContext: AudioContext | null = null;

function createAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (Ctx === undefined) {
        return null;
    }

    try {
        return new Ctx();
    } catch {
        return null;
    }
}

function scheduleNotificationTones(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;
    masterGain.connect(ctx.destination);

    [
        { freq: 880, start: 0, dur: 0.18, peak: 0.6 },
        { freq: 1175, start: 0.16, dur: 0.22, peak: 0.55 },
    ].forEach(({ freq, start, dur, peak }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, now + start);
        gain.gain.linearRampToValueAtTime(peak, now + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(gain).connect(masterGain);
        osc.start(now + start);
        osc.stop(now + start + dur);
    });
}

function playNotificationSound(): void {
    if (audioContext === null) {
        audioContext = createAudioContext();
        if (audioContext === null) {
            return;
        }
    }

    const ctx = audioContext;

    if (ctx.state === 'suspended') {
        void ctx
            .resume()
            .then(() => {
                try {
                    scheduleNotificationTones(ctx);
                } catch {
                    // ignore
                }
            })
            .catch(() => {
                // ignore
            });
        return;
    }

    try {
        scheduleNotificationTones(ctx);
    } catch {
        // ignore
    }
}

function primeAudioOnInteraction(): void {
    if (audioContext === null) {
        audioContext = createAudioContext();
    }

    if (audioContext === null) {
        return;
    }

    if (audioContext.state === 'suspended') {
        void audioContext.resume();
    }

    try {
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch {
        // ignore
    }
}

export function testNotificationSound(): void {
    primeAudioOnInteraction();
    setTimeout(playNotificationSound, 50);
}

function getInitialPermission(): PermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }

    return Notification.permission as PermissionState;
}

function getCsrfToken(): string {
    if (typeof document === 'undefined') {
        return '';
    }

    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

async function postToken(token: string): Promise<void> {
    await fetch('/device-tokens', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
            token,
            platform: 'web',
            device_name: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 160) : null,
        }),
    });
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return null;
    }

    try {
        return await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
    } catch {
        return null;
    }
}

export function useFcm(): {
    permission: PermissionState;
    requesting: boolean;
    request: () => Promise<void>;
} {
    const [permission, setPermission] = useState<PermissionState>(getInitialPermission());
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        if (!isFirebaseConfigured() || permission !== 'granted' || typeof window === 'undefined') {
            return;
        }

        const handler = (): void => primeAudioOnInteraction();
        window.addEventListener('click', handler, { once: true });
        window.addEventListener('keydown', handler, { once: true });

        (window as unknown as { __testNotifSound?: () => void }).__testNotifSound = testNotificationSound;

        const messaging = getFirebaseMessaging();
        if (messaging === null) {
            return () => {
                window.removeEventListener('click', handler);
                window.removeEventListener('keydown', handler);
            };
        }

        const unsubscribe = onMessage(messaging, (payload) => {
            const title = payload.notification?.title ?? 'Notifikasi baru';
            const body = payload.notification?.body ?? '';

            playNotificationSound();

            toast(title, {
                description: body,
                position: 'bottom-right',
                duration: Infinity,
                closeButton: true,
            });
        });

        return () => {
            unsubscribe();
            window.removeEventListener('click', handler);
            window.removeEventListener('keydown', handler);
        };
    }, [permission]);

    useEffect(() => {
        if (!isFirebaseConfigured() || permission !== 'granted' || typeof window === 'undefined') {
            return;
        }

        const messaging = getFirebaseMessaging();
        if (messaging === null) {
            return;
        }

        let cancelled = false;

        (async () => {
            const registration = await registerServiceWorker();
            if (registration === null || cancelled) {
                return;
            }

            try {
                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: registration,
                });

                if (token && !cancelled) {
                    await postToken(token);
                }
            } catch {
                // permission revoked or token retrieval failed
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [permission]);

    const request = async (): Promise<void> => {
        if (permission === 'unsupported' || requesting) {
            return;
        }

        primeAudioOnInteraction();
        setRequesting(true);

        try {
            const result = await Notification.requestPermission();
            setPermission(result as PermissionState);

            if (result !== 'granted') {
                toast.error('Notifikasi tidak diizinkan oleh browser.');
            }
        } finally {
            setRequesting(false);
        }
    };

    return { permission, requesting, request };
}
