import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

export function isFirebaseConfigured(): boolean {
    return Boolean(
        firebaseConfig.apiKey &&
            firebaseConfig.projectId &&
            firebaseConfig.appId &&
            VAPID_KEY,
    );
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function getFirebaseApp(): FirebaseApp | null {
    if (!isFirebaseConfigured()) {
        return null;
    }

    if (app === null) {
        app = initializeApp(firebaseConfig);
    }

    return app;
}

export function getFirebaseMessaging(): Messaging | null {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp === null) {
        return null;
    }

    if (messaging === null) {
        messaging = getMessaging(firebaseApp);
    }

    return messaging;
}
