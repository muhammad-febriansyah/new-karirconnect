import { type ReactNode } from 'react';
import { decodeEntities, sanitizeHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

type SafeHtmlProps = {
    html: string | null | undefined;
    className?: string;
};

const HTML_TAG = /<[a-z][\s\S]*>/i;
const BULLET_PREFIX = /^[-–—•*]\s+/;
/**
 * Matches the separator when a bulleted block was authored on a single line.
 * The capturing group keeps the separator so a dash used as a range — not as a
 * bullet — can be put back.
 */
const INLINE_BULLET = /(\s+[-–—•*]\s+)/;
const DASH_SEPARATOR = /[-–—]/;
/** A quantity ending the left side of a dash, e.g. "5", "10jt", "5.000.000". */
const RANGE_START = /\d[\w.,]*$/;
/** A quantity opening the right side of a dash, e.g. "10 juta", "Rp10.000". */
const RANGE_END = /^(?:rp\s*)?\d/i;

type Block =
    | { kind: 'list'; items: string[] }
    | { kind: 'paragraph'; text: string };

/**
 * A dash between two quantities is a range ("Gaji 5 - 10 juta"), not a bullet
 * separator. Bullet markers that never appear mid-sentence always separate.
 */
function isRangeDash(separator: string, before: string, after: string): boolean {
    return DASH_SEPARATOR.test(separator) && RANGE_START.test(before) && RANGE_END.test(after);
}

/**
 * Split a single authored line on its inline bullet separators, rejoining the
 * dashes that turn out to be ranges.
 */
function splitInlineBullets(line: string): string[] {
    const parts = line.split(INLINE_BULLET);
    const items = [parts[0]];

    for (let index = 1; index < parts.length; index += 2) {
        const separator = parts[index];
        const segment = parts[index + 1] ?? '';
        const current = items[items.length - 1];

        if (isRangeDash(separator, current, segment)) {
            items[items.length - 1] = current + separator + segment;
            continue;
        }

        items.push(segment);
    }

    return items.map((item) => item.trim()).filter(Boolean);
}

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
        const items = splitInlineBullets(lines[0].replace(BULLET_PREFIX, ''));

        if (items.length > 1) {
            return items.map((text) => ({ text, isBullet: true }));
        }
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
                {toBlocks(decodeEntities(value)).map((block, index) =>
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
