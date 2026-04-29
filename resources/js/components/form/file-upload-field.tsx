import { Upload, X } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormField } from './form-field';

type FileUploadFieldProps = {
    id?: string;
    name?: string;
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    accept?: string;
    /** Currently selected File OR existing path/url string from server. */
    value?: File | string | null;
    onChange?: (file: File | null) => void;
    /** Display the existing path as a hint (e.g. "logo.png"). */
    existingLabel?: string;
};

export function FileUploadField({
    id,
    name,
    label,
    description,
    error,
    required,
    accept,
    value,
    onChange,
    existingLabel,
}: FileUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        onChange?.(file);
    };

    const reset = () => {
        if (inputRef.current) {
            inputRef.current.value = '';
        }

        onChange?.(null);
    };

    const hasFile = value instanceof File;
    const fileName = hasFile ? value.name : existingLabel;

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
                    'flex items-center gap-3 rounded-md border border-dashed bg-muted/30 p-3',
                    error && 'border-destructive',
                )}
            >
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                >
                    <Upload className="size-4" /> Pilih File
                </Button>
                <span className="flex-1 truncate text-sm text-muted-foreground">
                    {fileName ?? 'Belum ada file dipilih'}
                </span>
                {hasFile && (
                    <Button type="button" size="icon" variant="ghost" onClick={reset}>
                        <X className="size-4" />
                    </Button>
                )}
                <Input
                    ref={inputRef}
                    id={id}
                    name={name}
                    type="file"
                    accept={accept}
                    className="hidden"
                    onChange={handleChange}
                />
            </div>
        </FormField>
    );
}
