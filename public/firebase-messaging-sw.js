/* Firebase Cloud Messaging Service Worker
 * Loaded from /firebase-messaging-sw.js (must be served from web root, not Vite).
 * Receives background push notifications when the page is closed/inactive.
 */

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyALQPJlNUfIM16IwVd1llifCOvS2qmo1Ng',
    authDomain: 'febrinogen-dev-web.firebaseapp.com',
    projectId: 'febrinogen-dev-web',
    storageBucket: 'febrinogen-dev-web.firebasestorage.app',
    messagingSenderId: '245819043308',
    appId: '1:245819043308:web:07ab00c1384bd73cfd64c9',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'KarirConnect';
    const body = payload.notification?.body ?? '';
    const link = payload.data?.link ?? payload.fcmOptions?.link ?? '/';

    self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: { link },
        requireInteraction: true,
        silent: false,
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.link ?? '/';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                for (const client of clientList) {
                    if ('focus' in client && client.url.includes(self.location.origin)) {
                        client.navigate(targetUrl);
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            }),
    );
});
