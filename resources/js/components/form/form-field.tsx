import { type ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FormFieldProps = {
    id?: string;
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
    htmlFor?: string;
    className?: string;
    children: ReactNode;
};

export function FormField({
    id,
    label,
    description,
    error,
    required,
    htmlFor,
    className,
    children,
}: FormFieldProps) {
    return (
        <div className={cn('space-y-2.5', className)}>
            {label && (
                <Label htmlFor={htmlFor ?? id} className="leading-none">
                    {label}
                    {required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
            )}
            {children}
            {description && !error && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {error && <InputError message={error} />}
        </div>
    );
}
