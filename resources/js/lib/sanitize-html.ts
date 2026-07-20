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

const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
};

/** Reject what `String.fromCodePoint` throws on, plus lone surrogates. */
function isDecodableCodePoint(codePoint: number): boolean {
    return Number.isInteger(codePoint)
        && codePoint >= 0
        && codePoint <= 0x10ffff
        && !(codePoint >= 0xd800 && codePoint <= 0xdfff);
}

/**
 * Decode the entities the server-side purifier writes when it normalises plain
 * text for HTML output — a typed `&` is stored as `&amp;`. Callers must render
 * the result as a React text node, which escapes it again, so this never widens
 * the XSS surface. Kept free of DOM APIs so it also runs under SSR.
 *
 * Content is author-supplied, so an out-of-range numeric entity must be left
 * alone rather than reach `String.fromCodePoint` and throw mid-render.
 */
export function decodeEntities(text: string): string {
    return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
        if (entity[0] === '#') {
            const codePoint = entity[1]?.toLowerCase() === 'x'
                ? Number.parseInt(entity.slice(2), 16)
                : Number.parseInt(entity.slice(1), 10);

            return isDecodableCodePoint(codePoint) ? String.fromCodePoint(codePoint) : match;
        }

        return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
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

    return decodeEntities(html.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
}
