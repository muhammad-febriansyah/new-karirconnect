import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Redo,
    Underline as UnderlineIcon,
    Undo,
} from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { FormField } from './form-field';

type RichTextEditorProps = {
    id?: string;
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: (html: string) => void;
};

export function RichTextEditor({
    id,
    label,
    description,
    error,
    required,
    placeholder = 'Tulis konten di sini…',
    value = '',
    onChange,
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                },
            }),
            Image,
            Placeholder.configure({ placeholder }),
        ],
        content: value,
        onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-sm dark:prose-invert max-w-none min-h-[160px] px-3 py-2 focus:outline-none',
                ),
            },
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '', { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previous = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('URL link', previous ?? 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <FormField
            id={id}
            label={label}
            description={description}
            error={error}
            required={required}
        >
            <div
                className={cn(
                    'overflow-hidden rounded-md border bg-background',
                    error && 'border-destructive',
                )}
            >
                <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-2 py-1">
                    <ToolbarButton
                        active={editor.isActive('bold')}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        ariaLabel="Bold"
                    >
                        <Bold className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('italic')}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        ariaLabel="Italic"
                    >
                        <Italic className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('underline')}
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        ariaLabel="Underline"
                    >
                        <UnderlineIcon className="size-4" />
                    </ToolbarButton>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    <ToolbarButton
                        active={editor.isActive('heading', { level: 2 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        ariaLabel="Heading 2"
                    >
                        <Heading2 className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('heading', { level: 3 })}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        ariaLabel="Heading 3"
                    >
                        <Heading3 className="size-4" />
                    </ToolbarButton>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    <ToolbarButton
                        active={editor.isActive('bulletList')}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        ariaLabel="Bullet List"
                    >
                        <List className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        active={editor.isActive('orderedList')}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        ariaLabel="Numbered List"
                    >
                        <ListOrdered className="size-4" />
                    </ToolbarButton>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    <ToolbarButton
                        active={editor.isActive('link')}
                        onClick={setLink}
                        ariaLabel="Link"
                    >
                        <LinkIcon className="size-4" />
                    </ToolbarButton>
                    <Separator orientation="vertical" className="mx-1 h-5" />
                    <ToolbarButton
                        onClick={() => editor.chain().focus().undo().run()}
                        ariaLabel="Undo"
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        onClick={() => editor.chain().focus().redo().run()}
                        ariaLabel="Redo"
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="size-4" />
                    </ToolbarButton>
                </div>
                <EditorContent editor={editor} />
            </div>
        </FormField>
    );
}

function ToolbarButton({
    active,
    disabled,
    onClick,
    ariaLabel,
    children,
}: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    ariaLabel: string;
    children: React.ReactNode;
}) {
    return (
        <Button
            type="button"
            size="icon"
            variant={active ? 'secondary' : 'ghost'}
            disabled={disabled}
            onClick={onClick}
            aria-label={ariaLabel}
            className="size-8"
        >
            {children}
        </Button>
    );
}
