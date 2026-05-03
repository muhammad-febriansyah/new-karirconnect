import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormField } from './form-field';

export type SelectOption = {
    value: string;
    label: string;
};

type SelectFieldProps = {
    id?: string;
    label?: string;
    description?: string;
    error?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    options: SelectOption[];
};

export function SelectField({
    id,
    label,
    description,
    error,
    placeholder,
    required,
    disabled,
    value,
    onValueChange,
    options,
}: SelectFieldProps) {
    const resolvedPlaceholder = placeholder ?? (label ? `Pilih ${label.toLowerCase()}` : 'Pilih opsi');

    return (
        <FormField
            id={id}
            label={label}
            description={description}
            error={error}
            required={required}
        >
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger id={id} className="w-full">
                    <SelectValue placeholder={resolvedPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    );
}
