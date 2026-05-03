import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import CareerResourceController from '@/actions/App/Http/Controllers/Admin/CareerResourceController';
import { ImageUploadField } from '@/components/form/image-upload-field';
import { InputField } from '@/components/form/input-field';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { slugify } from '@/lib/slugify';

type Item = {
    id: number;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    thumbnail_path: string | null;
    thumbnail_url: string | null;
    category: string | null;
    tags: string[];
    reading_minutes: number;
    is_published: boolean;
};

type Props = {
    mode: 'create' | 'edit';
    item: Item | null;
};

type FormShape = {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
    category: string;
    tags: string;
    reading_minutes: number;
    is_published: boolean;
    thumbnail: File | null;
};

export default function CareerResourceForm({ mode, item }: Props) {
    const isEdit = mode === 'edit' && item !== null;
    const [slugTouched, setSlugTouched] = useState(false);
    const form = useForm<FormShape>({
        title: item?.title ?? '',
        slug: item?.slug ?? '',
        excerpt: item?.excerpt ?? '',
        body: item?.body ?? '',
        category: item?.category ?? '',
        tags: item?.tags.join(', ') ?? '',
        reading_minutes: item?.reading_minutes ?? 5,
        is_published: item?.is_published ?? true,
        thumbnail: null,
    });

    const onSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            tags: data.tags,
            ...(isEdit ? { _method: 'put' } : {}),
        }));
        form.post(
            isEdit && item
                ? CareerResourceController.update(item.id).url
                : CareerResourceController.store().url,
            {
                forceFormData: true,
                preserveScroll: true,
            },
        );
    };

    return (
        <>
            <Head title={isEdit ? `Ubah Resource: ${item.title}` : 'Tambah Resource'} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={isEdit ? 'Ubah Career Resource' : 'Tambah Career Resource'}
                    description="Tulis konten artikel dengan editor rich text agar lebih nyaman dibaca di halaman publik."
                    actions={(
                        <ActionButton asChild intent="back">
                            <Link href={CareerResourceController.index().url}>
                                <ArrowLeft className="size-4" /> Kembali
                            </Link>
                        </ActionButton>
                    )}
                />

                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-6">
                        <Section title="Informasi Utama" description="Field bertanda bintang wajib diisi sebelum disimpan.">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <InputField
                                        label="Judul"
                                        value={form.data.title}
                                        onChange={(event) => {
                                            const nextTitle = event.target.value;
                                            form.setData('title', nextTitle);

                                            if (!slugTouched) {
                                                form.setData('slug', slugify(nextTitle));
                                            }
                                        }}
                                        error={form.errors.title}
                                        required
                                    />
                                    <InputField
                                        label="Slug"
                                        value={form.data.slug}
                                        onChange={(event) => {
                                            form.setData('slug', event.target.value);
                                            setSlugTouched(true);
                                        }}
                                        error={form.errors.slug}
                                    />
                                </div>
                                <div className="mt-4 grid gap-4 md:grid-cols-3">
                                    <InputField
                                        label="Kategori"
                                        value={form.data.category}
                                        onChange={(event) => form.setData('category', event.target.value)}
                                        error={form.errors.category}
                                    />
                                    <InputField
                                        label="Tags"
                                        description="Pisahkan dengan koma."
                                        value={form.data.tags}
                                        onChange={(event) => form.setData('tags', event.target.value)}
                                        error={form.errors.tags}
                                    />
                                    <InputField
                                        label="Estimasi Baca (menit)"
                                        type="number"
                                        min={1}
                                        max={120}
                                        value={form.data.reading_minutes}
                                        onChange={(event) => form.setData('reading_minutes', Number(event.target.value))}
                                        error={form.errors.reading_minutes}
                                    />
                                </div>
                            </Section>

                            <Section title="Thumbnail" description="Maksimum 4MB. Format: JPG, PNG, WEBP, atau SVG.">
                                <ImageUploadField
                                    label="Thumbnail Artikel"
                                    value={form.data.thumbnail}
                                    existingUrl={item?.thumbnail_url ?? null}
                                    onChange={(file) => form.setData('thumbnail', file)}
                                    error={form.errors.thumbnail}
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                />
                            </Section>

                            <Section title="Konten" description="Tulis ringkasan dan isi artikel menggunakan rich editor.">
                                <div className="space-y-4">
                                    <TextareaField
                                        label="Excerpt"
                                        rows={3}
                                        value={form.data.excerpt}
                                        onChange={(event) => form.setData('excerpt', event.target.value)}
                                        error={form.errors.excerpt}
                                    />
                                    <RichTextEditor
                                        label="Isi Artikel"
                                        value={form.data.body}
                                        onChange={(html) => form.setData('body', html)}
                                        error={form.errors.body}
                                        placeholder="Tulis isi artikel di sini..."
                                        required
                                    />
                                </div>
                            </Section>

                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={form.data.is_published}
                                onChange={(event) => form.setData('is_published', event.target.checked)}
                            />
                            Publish sekarang
                        </label>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href={CareerResourceController.index().url}>Batal</Link>
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Simpan
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

CareerResourceForm.layout = {
    breadcrumbs: [{ title: 'Career Resources', href: CareerResourceController.index().url }],
};
