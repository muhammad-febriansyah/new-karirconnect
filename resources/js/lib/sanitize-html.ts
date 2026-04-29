import DOMPurify from 'dompurify';

/**
 * Defensive client-side sanitizer. Server already sanitizes via HTMLPurifier;
 * this is a second line of defense before injecting into the DOM.
 */
export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) {
        return '';
    }
    return DOMPurify.sanitize(html, {
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    });
}
