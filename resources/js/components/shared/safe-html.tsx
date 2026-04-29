import { sanitizeHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

type SafeHtmlProps = {
    html: string | null | undefined;
    className?: string;
};

/**
 * Render server-sanitized rich-text content. Performs an additional defensive
 * pass with DOMPurify before injecting into the DOM.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
    return (
        <div
            className={cn('prose prose-sm dark:prose-invert max-w-none', className)}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(html ?? '') }}
        />
    );
}
