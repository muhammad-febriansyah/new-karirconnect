import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './form-field';

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    description?: string;
    error?: string;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
    ({ label, description, error, id, required, ...props }, ref) => {
        return (
            <FormField
                id={id}
                label={label}
                description={description}
                error={error}
                required={required}
            >
                <Textarea id={id} ref={ref} required={required} {...props} />
            </FormField>
        );
    },
);
TextareaField.displayName = 'TextareaField';
