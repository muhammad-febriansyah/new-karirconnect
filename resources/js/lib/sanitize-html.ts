import DOMPurify from 'dompurify';

/**
 * Defensive client-side sanitizer. Server already sanitizes via HTMLPurifier;
 * this is a second line of defense before injecting into the DOM.
 */
export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) {
        return '';
    }

    // DOMPurify needs a DOM. During SSR (no window) it can't run, but the server
    // already sanitized via HTMLPurifier, so return the markup as-is; the client
    // re-sanitizes on hydration.
    if (typeof window === 'undefined' || typeof DOMPurify.sanitize !== 'function') {
        return html;
    }

    return DOMPurify.sanitize(html, {
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'id', 'class'],
    });
}
