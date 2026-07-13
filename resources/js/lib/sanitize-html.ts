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

/**
 * Strip all HTML tags and decode common entities to plain text. Use for
 * truncated previews (e.g. line-clamped cards) where rich markup would leak
 * raw tags or break clamping. The result is rendered as a React text node,
 * so it is auto-escaped and safe against XSS.
 */
export function stripHtml(html: string | null | undefined): string {
    if (!html) {
        return '';
    }

    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#0*39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
}
