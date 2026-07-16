import { FormField } from './form-field';
import { SelectControl  } from './select-control';
import type {SelectControlProps} from './select-control';

export type { SelectOption } from './select-control';

type SelectFieldProps = SelectControlProps & {
    label?: string;
    description?: string;
    error?: string;
    required?: boolean;
};

export function SelectField({
    id,
    label,
    description,
    error,
    placeholder,
    required,
    searchPlaceholder,
    ...controlProps
}: SelectFieldProps) {
    return (
        <FormField
            id={id}
            label={label}
            description={description}
            error={error}
            required={required}
        >
            <SelectControl
                id={id}
                placeholder={placeholder ?? (label ? `Pilih ${label.toLowerCase()}` : 'Pilih opsi')}
                searchPlaceholder={searchPlaceholder ?? `Cari ${label ? label.toLowerCase() : 'opsi'}…`}
                {...controlProps}
            />
        </FormField>
    );
}
