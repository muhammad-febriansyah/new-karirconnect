import { Head, useForm } from '@inertiajs/react';
import { ImagePlus, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import AboutPageController from '@/actions/App/Http/Controllers/Admin/AboutPageController';
import { ImageUploadField } from '@/components/form/image-upload-field';
import { InputField } from '@/components/form/input-field';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ValueItem = { icon?: string | null; title: string; body?: string | null };
type StatItem = { number: string; label: string; description?: string | null };
type TeamItem = {
    photo_path?: string | null;
    photo_url?: string | null;
    photo?: File | null;
    name: string;
    role?: string | null;
    bio_short?: string | null;
    linkedin_url?: string | null;
};

type PageProps = {
    page: {
        hero_title: string | null;
        hero_subtitle: string | null;
        hero_image_path: string | null;
        hero_image_url: string | null;
        story_body: string | null;
        vision: string | null;
        mission: string | null;
        values: ValueItem[];
        stats: StatItem[];
        team_members: TeamItem[];
        office_address: string | null;
        office_map_embed: string | null;
        seo_title: string | null;
        seo_description: string | null;
    };
};

type FormData = {
    hero_title: string;
    hero_subtitle: string;
    hero_image: File | null;
    remove_hero_image: boolean;
    story_body: string;
    vision: string;
    mission: string;
    values: ValueItem[];
    stats: StatItem[];
    team_members: TeamItem[];
    office_address: string;
    office_map_embed: string;
    seo_title: string;
    seo_description: string;
    _method: 'POST';
};

export default function AdminAboutPageEdit({ page }: PageProps) {
    const [activeTab, setActiveTab] = useState<'content' | 'highlights' | 'team-office' | 'seo'>('content');

    const form = useForm<FormData>({
        hero_title: page.hero_title ?? '',
        hero_subtitle: page.hero_subtitle ?? '',
        hero_image: null,
        remove_hero_image: false,
        story_body: page.story_body ?? '',
        vision: page.vision ?? '',
        mission: page.mission ?? '',
        values: page.values ?? [],
        stats: page.stats ?? [],
        team_members: page.team_members ?? [],
        office_address: page.office_address ?? '',
        office_map_embed: page.office_map_embed ?? '',
        seo_title: page.seo_title ?? '',
        seo_description: page.seo_description ?? '',
        _method: 'POST',
    });

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post(AboutPageController.update().url, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Tentang Kami" />

            <form onSubmit={onSubmit} className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Tentang Kami"
                    description="Konten halaman publik Tentang KarirConnect — diakses lewat /tentang-kami."
                    actions={
                        <Button type="submit" disabled={form.processing}>
                            <Save className="size-4" /> Simpan Perubahan
                        </Button>
                    }
                />

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="gap-4">
                    <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 p-1">
                        <TabsTrigger value="content" className="flex-none">Konten Utama</TabsTrigger>
                        <TabsTrigger value="highlights" className="flex-none">Nilai & Statistik</TabsTrigger>
                        <TabsTrigger value="team-office" className="flex-none">Tim & Kantor</TabsTrigger>
                        <TabsTrigger value="seo" className="flex-none">SEO</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-6">
                        <Section title="Hero" description="Bagian paling atas halaman publik — pertama dilihat pengunjung.">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                                <div className="space-y-4">
                                    <InputField
                                        label="Judul Hero"
                                        value={form.data.hero_title}
                                        onChange={(e) => form.setData('hero_title', e.target.value)}
                                        error={form.errors.hero_title}
                                        description="Tampilkan tagline utama yang menggambarkan misi platform."
                                    />
                                    <TextareaField
                                        label="Subjudul Hero"
                                        rows={3}
                                        value={form.data.hero_subtitle}
                                        onChange={(e) => form.setData('hero_subtitle', e.target.value)}
                                        error={form.errors.hero_subtitle}
                                        description="1-2 kalimat di bawah judul utama."
                                    />
                                </div>
                                <ImageUploadField
                                    label="Banner Hero (cover)"
                                    description="Rekomendasi rasio 3:1 atau 4:1, minimal 1600×480px. Format PNG/JPG/WebP, max 4MB."
                                    value={form.data.hero_image}
                                    existingUrl={form.data.remove_hero_image ? null : page.hero_image_url}
                                    error={form.errors.hero_image as string | undefined}
                                    onChange={(file) => {
                                        form.setData('hero_image', file);
                                        form.setData('remove_hero_image', file === null && page.hero_image_url !== null);
                                    }}
                                />
                            </div>
                        </Section>

                        <Section title="Cerita, Visi & Misi" description="Narasi panjang tentang origin story, lalu rangkum visi & misi singkat.">
                            <div className="space-y-6">
                                <RichTextEditor
                                    label="Cerita Kami"
                                    placeholder="Ceritakan bagaimana platform ini dimulai, masalah yang ingin diselesaikan, dan perjalanan tim..."
                                    value={form.data.story_body}
                                    onChange={(html) => form.setData('story_body', html)}
                                    error={form.errors.story_body as string | undefined}
                                />
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <RichTextEditor
                                        label="Visi"
                                        placeholder="Cita-cita jangka panjang platform..."
                                        value={form.data.vision}
                                        onChange={(html) => form.setData('vision', html)}
                                        error={form.errors.vision as string | undefined}
                                    />
                                    <RichTextEditor
                                        label="Misi"
                                        placeholder="Langkah konkret untuk mencapai visi (gunakan list)..."
                                        value={form.data.mission}
                                        onChange={(html) => form.setData('mission', html)}
                                        error={form.errors.mission as string | undefined}
                                    />
                                </div>
                            </div>
                        </Section>
                    </TabsContent>

                    <TabsContent value="highlights" className="space-y-6">
                        <Section title="Nilai Inti" description="3-6 nilai yang menjadi pegangan tim. Icon menggunakan nama Lucide (mis. shield, heart, zap).">
                            <ValuesRepeater
                                items={form.data.values}
                                onChange={(items) => form.setData('values', items)}
                            />
                        </Section>

                        <Section title="Angka Kunci" description="3-4 statistik yang menunjukkan dampak platform (jumlah kandidat, perusahaan, dll).">
                            <StatsRepeater
                                items={form.data.stats}
                                onChange={(items) => form.setData('stats', items)}
                            />
                        </Section>
                    </TabsContent>

                    <TabsContent value="team-office" className="space-y-6">
                        <Section title="Anggota Tim" description="Tampilkan founder atau key team members agar membangun trust.">
                            <TeamRepeater
                                items={form.data.team_members}
                                onChange={(items) => form.setData('team_members', items)}
                            />
                        </Section>

                        <Section title="Kantor" description="Alamat kantor pusat & embed Google Maps untuk transparansi.">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <TextareaField
                                    label="Alamat Kantor"
                                    rows={4}
                                    value={form.data.office_address}
                                    onChange={(e) => form.setData('office_address', e.target.value)}
                                    error={form.errors.office_address}
                                    placeholder="Jl. Sudirman No. 1, Jakarta Pusat 10220"
                                />
                                <TextareaField
                                    label="URL Embed Google Maps"
                                    rows={4}
                                    value={form.data.office_map_embed}
                                    onChange={(e) => form.setData('office_map_embed', e.target.value)}
                                    error={form.errors.office_map_embed}
                                    description="Google Maps → Bagikan → Sematkan peta → salin URL src dari iframe."
                                    placeholder="https://www.google.com/maps/embed?pb=..."
                                />
                            </div>
                        </Section>
                    </TabsContent>

                    <TabsContent value="seo" className="space-y-6">
                        <Section title="SEO & Meta" description="Untuk Open Graph dan title halaman publik.">
                            <div className="grid gap-4 lg:grid-cols-2">
                                <InputField
                                    label="SEO Title"
                                    value={form.data.seo_title}
                                    onChange={(e) => form.setData('seo_title', e.target.value)}
                                    error={form.errors.seo_title}
                                    description="Maksimal 60 karakter."
                                    maxLength={80}
                                />
                                <TextareaField
                                    label="SEO Description"
                                    rows={3}
                                    value={form.data.seo_description}
                                    onChange={(e) => form.setData('seo_description', e.target.value)}
                                    error={form.errors.seo_description}
                                    description="Maksimal 160 karakter."
                                    maxLength={200}
                                />
                            </div>
                        </Section>
                    </TabsContent>
                </Tabs>

                <div className="sticky bottom-0 -mx-4 border-t bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                    <div className="flex items-center justify-end gap-3">
                        <span className="text-xs text-muted-foreground">
                            Halaman akan langsung diperbarui di publik setelah disimpan.
                        </span>
                        <Button type="submit" disabled={form.processing}>
                            <Save className="size-4" />
                            {form.processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
}

function ValuesRepeater({ items, onChange }: { items: ValueItem[]; onChange: (items: ValueItem[]) => void }) {
    const add = () => onChange([...items, { icon: 'sparkles', title: '', body: '' }]);
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<ValueItem>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada nilai inti. Tambahkan minimal 3 untuk tampil rapi.
                </div>
            ) : (
                items.map((item, i) => (
                    <Card key={i}>
                        <CardContent className="grid gap-3 p-4 md:grid-cols-[120px_minmax(0,1fr)_auto]">
                            <InputField
                                label="Icon"
                                value={item.icon ?? ''}
                                onChange={(e) => update(i, { icon: e.target.value })}
                                placeholder="shield"
                            />
                            <div className="space-y-3">
                                <InputField
                                    label="Judul"
                                    value={item.title}
                                    onChange={(e) => update(i, { title: e.target.value })}
                                    required
                                />
                                <TextareaField
                                    label="Deskripsi"
                                    rows={2}
                                    value={item.body ?? ''}
                                    onChange={(e) => update(i, { body: e.target.value })}
                                />
                            </div>
                            <div className="flex items-start justify-end pt-7">
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Hapus nilai">
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
            <Button type="button" variant="outline" onClick={add}>
                <Plus className="size-4" /> Tambah Nilai
            </Button>
        </div>
    );
}

function StatsRepeater({ items, onChange }: { items: StatItem[]; onChange: (items: StatItem[]) => void }) {
    const add = () => onChange([...items, { number: '', label: '', description: '' }]);
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<StatItem>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada stat. Tambahkan 3-4 angka kunci.
                </div>
            ) : (
                items.map((item, i) => (
                    <Card key={i}>
                        <CardContent className="grid gap-3 p-4 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                            <InputField
                                label="Angka"
                                value={item.number}
                                onChange={(e) => update(i, { number: e.target.value })}
                                placeholder="10.000+"
                                required
                            />
                            <InputField
                                label="Label"
                                value={item.label}
                                onChange={(e) => update(i, { label: e.target.value })}
                                placeholder="Kandidat tersalurkan"
                                required
                            />
                            <InputField
                                label="Keterangan (opsional)"
                                value={item.description ?? ''}
                                onChange={(e) => update(i, { description: e.target.value })}
                                placeholder="Sejak 2024"
                            />
                            <div className="flex items-start justify-end pt-7">
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Hapus stat">
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
            <Button type="button" variant="outline" onClick={add}>
                <Plus className="size-4" /> Tambah Stat
            </Button>
        </div>
    );
}

function TeamRepeater({ items, onChange }: { items: TeamItem[]; onChange: (items: TeamItem[]) => void }) {
    const add = () =>
        onChange([
            ...items,
            { name: '', role: '', bio_short: '', linkedin_url: '', photo: null, photo_path: null, photo_url: null },
        ]);
    const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
    const update = (i: number, patch: Partial<TeamItem>) =>
        onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada anggota tim.
                </div>
            ) : (
                items.map((item, i) => (
                    <Card key={i}>
                        <CardContent className="grid gap-4 p-4 md:grid-cols-[140px_minmax(0,1fr)_auto]">
                            <TeamPhotoInput
                                file={item.photo ?? null}
                                existingUrl={item.photo_url ?? null}
                                onChange={(file) => update(i, { photo: file })}
                                onClear={() => update(i, { photo: null, photo_path: null, photo_url: null })}
                            />
                            <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <InputField
                                        label="Nama"
                                        value={item.name}
                                        onChange={(e) => update(i, { name: e.target.value })}
                                        required
                                    />
                                    <InputField
                                        label="Peran"
                                        value={item.role ?? ''}
                                        onChange={(e) => update(i, { role: e.target.value })}
                                        placeholder="Founder & CEO"
                                    />
                                </div>
                                <TextareaField
                                    label="Bio Singkat"
                                    rows={2}
                                    value={item.bio_short ?? ''}
                                    onChange={(e) => update(i, { bio_short: e.target.value })}
                                />
                                <InputField
                                    label="LinkedIn URL"
                                    value={item.linkedin_url ?? ''}
                                    onChange={(e) => update(i, { linkedin_url: e.target.value })}
                                    placeholder="https://linkedin.com/in/..."
                                />
                            </div>
                            <div className="flex items-start justify-end pt-2">
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} aria-label="Hapus anggota">
                                    <Trash2 className="size-4 text-destructive" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
            <Button type="button" variant="outline" onClick={add}>
                <Plus className="size-4" /> Tambah Anggota
            </Button>
        </div>
    );
}

function TeamPhotoInput({
    file,
    existingUrl,
    onChange,
    onClear,
}: {
    file: File | null;
    existingUrl: string | null;
    onChange: (file: File | null) => void;
    onClear: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (file instanceof File) {
            const url = URL.createObjectURL(file);
            setPreview(url);

            return () => URL.revokeObjectURL(url);
        }

        setPreview(null);
    }, [file]);

    const display = preview ?? existingUrl ?? null;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.files?.[0] ?? null);
    };

    return (
        <div className="space-y-2">
            <Label className="text-xs">Foto</Label>
            <div
                className={cn(
                    'group relative aspect-square w-32 overflow-hidden rounded-full border bg-muted/30',
                    !display && 'flex items-center justify-center',
                )}
            >
                {display ? (
                    <img src={display} alt="Anggota tim" className="size-full object-cover" />
                ) : (
                    <ImagePlus className="size-8 text-muted-foreground" />
                )}
                {display && (
                    <button
                        type="button"
                        onClick={() => {
                            onClear();
                            if (inputRef.current) inputRef.current.value = '';
                        }}
                        className="absolute right-1 top-1 rounded-full bg-background/80 p-1 opacity-0 backdrop-blur transition group-hover:opacity-100"
                        aria-label="Hapus foto"
                    >
                        <X className="size-3" />
                    </button>
                )}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                className="w-32"
            >
                <Upload className="size-3" /> {display ? 'Ganti' : 'Pilih'}
            </Button>
            <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleChange}
            />
        </div>
    );
}
