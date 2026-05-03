import { ExternalLink, Image as ImageIcon, Images, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormField } from './form-field';

type ImageUploadFieldProps = {
    id?: string;
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    accept?: string;
    value?: File | null;
    existingUrl?: string | null;
    onChange?: (file: File | null) => void;
};

export function ImageUploadField({
    id,
    label,
    description,
    error,
    required,
    accept = 'image/png,image/jpeg,image/webp,image/svg+xml',
    value,
    existingUrl,
    onChange,
}: ImageUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (value instanceof File) {
            const url = URL.createObjectURL(value);
            setPreview(url);

            return () => URL.revokeObjectURL(url);
        }

        setPreview(null);
    }, [value]);

    const display = preview ?? existingUrl ?? null;
    const isCoverField = (label ?? '').toLowerCase().includes('cover');
    const previewLabel = isCoverField ? 'Banner perusahaan' : 'Logo perusahaan';
    const idealRatio = isCoverField ? 'Rasio 3:1 atau 4:1' : 'Rasio 1:1';
    const idealSize = isCoverField ? 'Minimal 1600x480px' : 'Minimal 512x512px';

    const reset = () => {
        if (inputRef.current) {
            inputRef.current.value = '';
        }

        onChange?.(null);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        onChange?.(file);
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
                    'rounded-3xl border border-dashed bg-gradient-to-br from-muted/30 via-background to-muted/10 p-4 shadow-sm',
                    error && 'border-destructive',
                )}
            >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                                <div className="text-sm font-semibold">
                                    {value ? 'Preview baru siap diunggah' : existingUrl ? 'Aset saat ini aktif' : 'Belum ada gambar'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {previewLabel} akan tampil di profil perusahaan dan area publik terkait.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="secondary">{idealRatio}</Badge>
                                <Badge variant="outline">{idealSize}</Badge>
                            </div>
                        </div>

                        <div
                            className={cn(
                                'relative overflow-hidden rounded-2xl border bg-background/90 shadow-sm',
                                isCoverField ? 'min-h-52' : 'min-h-64',
                                error && 'border-destructive',
                            )}
                        >
                            {display ? (
                                <>
                                    <img
                                        src={display}
                                        alt="Preview"
                                        className={cn('size-full', isCoverField ? 'object-cover' : 'object-contain p-6')}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 py-3 text-white">
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium">{previewLabel}</div>
                                            <div className="truncate text-xs text-white/80">
                                                {value instanceof File ? value.name : 'File aktif dari profil perusahaan'}
                                            </div>
                                        </div>
                                        {value && (
                                            <Badge variant="secondary" className="border-white/20 bg-white/15 text-white">
                                                Baru
                                            </Badge>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center text-muted-foreground">
                                    {isCoverField ? <Images className="size-12" /> : <ImageIcon className="size-12" />}
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium text-foreground">Preview gambar akan muncul di sini</div>
                                        <div className="text-xs">{idealSize}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                                <Upload className="size-4" /> {display ? 'Ganti Gambar' : 'Pilih Gambar'}
                            </Button>
                            {(value || existingUrl) && (
                                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                                    <X className="size-4" /> Reset Pilihan
                                </Button>
                            )}
                            {existingUrl && (
                                <Button asChild type="button" variant="ghost" size="sm">
                                    <a href={existingUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="size-4" /> Buka Gambar
                                    </a>
                                </Button>
                            )}
                        </div>

                        <div className="rounded-2xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                            {value instanceof File
                                ? `File terpilih: ${value.name}. Simpan perubahan untuk menerapkan gambar baru.`
                                : existingUrl
                                    ? 'Gambar lama masih aktif dan baru akan terganti setelah Anda menyimpan perubahan.'
                                    : 'Belum ada file yang dipilih. Gunakan gambar yang tajam agar profil perusahaan terlihat lebih profesional.'}
                        </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border bg-background/80 p-4 shadow-sm">
                        <div className="space-y-1">
                            <div className="text-sm font-semibold">Panduan cepat</div>
                            <p className="text-xs text-muted-foreground">
                                Unggah aset yang bersih, tajam, dan konsisten dengan identitas brand perusahaan.
                            </p>
                        </div>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            <li>Gunakan latar transparan untuk logo jika memungkinkan.</li>
                            <li>Hindari teks terlalu kecil pada cover karena bisa terpotong di beberapa tampilan.</li>
                            <li>Pastikan file tetap jelas saat dilihat di desktop maupun mobile.</li>
                        </ul>
                        <div className="rounded-xl border border-dashed bg-muted/20 p-4">
                            <div className="mb-2 text-xs font-medium text-foreground">Format yang didukung</div>
                            <div className="flex flex-wrap gap-2">
                                {['PNG', 'JPG', 'WEBP', 'SVG'].map((format) => (
                                    <Badge key={format} variant="outline">
                                        {format}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <Input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleChange}
                />
            </div>
        </FormField>
    );
}
