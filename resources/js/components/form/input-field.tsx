import { forwardRef  } from 'react';
import type {InputHTMLAttributes} from 'react';
import { Input } from '@/components/ui/input';
import { FormField } from './form-field';

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    description?: string;
    error?: string;
};

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
    ({ label, description, error, id, required, placeholder, ...props }, ref) => {
        const resolvedPlaceholder =
            placeholder ?? (label ? `Masukkan ${label.toLowerCase()}` : 'Masukkan nilai');

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
                    required={required}
                    placeholder={resolvedPlaceholder}
                    {...props}
                />
            </FormField>
        );
    },
);
InputField.displayName = 'InputField';
