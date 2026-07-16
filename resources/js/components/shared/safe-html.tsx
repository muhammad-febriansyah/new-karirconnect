import { type ReactNode } from 'react';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

type SafeHtmlProps = {
    html: string | null | undefined;
    className?: string;
};

const HTML_TAG = /<[a-z][\s\S]*>/i;
const BULLET_PREFIX = /^[-–—•*]\s+/;
/** Matches the separator when a bulleted block was authored on a single line. */
const INLINE_BULLET = /\s+[-–—•*]\s+/;

type Block =
    | { kind: 'list'; items: string[] }
    | { kind: 'paragraph'; text: string };

/**
 * Split plain text into lines, recovering bullets that were authored on one
 * line. Returns each line paired with whether it is a bullet item.
 */
function toLines(text: string): Array<{ text: string; isBullet: boolean }> {
    const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const authoredOnOneLine =
        lines.length === 1 && BULLET_PREFIX.test(lines[0]) && INLINE_BULLET.test(lines[0]);

    if (authoredOnOneLine) {
        return lines[0]
            .replace(BULLET_PREFIX, '')
            .split(INLINE_BULLET)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((text) => ({ text, isBullet: true }));
    }

    return lines.map((line) => ({
        text: line.replace(BULLET_PREFIX, '').trim(),
        isBullet: BULLET_PREFIX.test(line),
    }));
}

/**
 * Render the `**bold**` spans authors type in the plain textareas. Splitting on
 * a capturing group keeps the delimited text, so odd indexes are the bold runs.
 */
function withBold(text: string): ReactNode[] {
    return text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
        index % 2 === 1 ? <strong key={index}>{part}</strong> : part,
    );
}

/** Group consecutive bullet lines into a single list; keep the rest as paragraphs. */
function toBlocks(text: string): Block[] {
    const blocks: Block[] = [];

    for (const line of toLines(text)) {
        if (!line.text) {
            continue;
        }

        if (!line.isBullet) {
            blocks.push({ kind: 'paragraph', text: line.text });
            continue;
        }

        const last = blocks[blocks.length - 1];

        if (last?.kind === 'list') {
            last.items.push(line.text);
        } else {
            blocks.push({ kind: 'list', items: [line.text] });
        }
    }

    return blocks;
}

/**
 * Render server-sanitized rich-text content. Performs an additional defensive
 * pass with DOMPurify before injecting into the DOM.
 *
 * Job copy is authored in plain textareas, so content is often plain text whose
 * newlines HTML would collapse into one run-on paragraph. When no markup is
 * present the text is rendered as real blocks instead, and React escapes it —
 * dangerouslySetInnerHTML is never used on that path.
 */
export function SafeHtml({ html, className }: SafeHtmlProps) {
    const value = html ?? '';
    const classes = cn('prose prose-sm dark:prose-invert max-w-none', className);

    if (value.trim() !== '' && !HTML_TAG.test(value)) {
        return (
            <div className={classes}>
                {toBlocks(value).map((block, index) =>
                    block.kind === 'list' ? (
                        <ul key={index}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>{withBold(item)}</li>
                            ))}
                        </ul>
                    ) : (
                        <p key={index}>{withBold(block.text)}</p>
                    ),
                )}
            </div>
        );
    }

    return <div className={classes} dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />;
}
