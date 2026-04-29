import { forwardRef, useMemo, type InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { formatRupiah, parseRupiah } from '@/lib/format-rupiah';
import { FormField } from './form-field';

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
    label?: string;
    description?: string;
    error?: string;
    value?: number | null;
    onChange?: (value: number) => void;
};

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ label, description, error, id, required, value, onChange, placeholder = 'Rp 0', ...props }, ref) => {
        const display = useMemo(
            () => (value === null || value === undefined ? '' : formatRupiah(value)),
            [value],
        );

        return (
            <FormField
                id={id}
                label={label}
                description={description}
                error={error}
                required={required}
            >
                <Input
                    id={id}
                    ref={ref}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={display}
                    onChange={(event) => onChange?.(parseRupiah(event.target.value))}
                    placeholder={placeholder}
                    required={required}
                    {...props}
                />
            </FormField>
        );
    },
);
MoneyInput.displayName = 'MoneyInput';
