import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDate, toIsoDate } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import { FormField } from './form-field';

type DatePickerFieldProps = {
    id?: string;
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    /** ISO date string (yyyy-MM-dd). */
    value?: string | null;
    onChange?: (isoDate: string) => void;
};

export function DatePickerField({
    id,
    label,
    description,
    error,
    required,
    disabled,
    placeholder = 'Pilih tanggal',
    value,
    onChange,
}: DatePickerFieldProps) {
    const [open, setOpen] = useState(false);
    const selected = value ? new Date(value) : undefined;

    return (
        <FormField
            id={id}
            label={label}
            description={description}
            error={error}
            required={required}
        >
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            'w-full justify-start text-left font-normal',
                            !selected && 'text-muted-foreground',
                        )}
                    >
                        <CalendarIcon className="size-4" />
                        {selected ? formatDate(selected) : placeholder}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selected}
                        onSelect={(date) => {
                            if (date) {
                                onChange?.(toIsoDate(date));
                                setOpen(false);
                            }
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </FormField>
    );
}
