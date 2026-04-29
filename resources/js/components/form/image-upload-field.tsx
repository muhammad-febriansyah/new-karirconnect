import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
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
    /** Existing image URL coming from the server. */
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
            <div className="flex items-center gap-4">
                <div
                    className={cn(
                        'flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30',
                        error && 'border-destructive',
                    )}
                >
                    {display ? (
                        <img src={display} alt="Preview" className="size-full object-contain" />
                    ) : (
                        <ImageIcon className="size-8 text-muted-foreground" />
                    )}
                </div>
                <div className="flex flex-col gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inputRef.current?.click()}
                    >
                        <Upload className="size-4" /> Pilih Gambar
                    </Button>
                    {(value || existingUrl) && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={reset}
                        >
                            <X className="size-4" /> Hapus
                        </Button>
                    )}
                    <Input
                        ref={inputRef}
                        id={id}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={handleChange}
                    />
                </div>
            </div>
        </FormField>
    );
}
