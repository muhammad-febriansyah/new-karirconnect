import { Check, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SelectOption = {
    value: string;
    label: string;
};

/** Above this many options the control turns into a searchable combobox. */
const SEARCHABLE_THRESHOLD = 10;

/**
 * Match the search term against the option label only. Items carry their real
 * value (often a numeric id), which the default cmdk filter would otherwise
 * match against — typing "5" would surface every option whose id contains a 5.
 */
const filterByLabel = (value: string, search: string, keywords?: string[]): number => {
    const haystack = (keywords?.join(' ') ?? value).toLowerCase();

    return haystack.includes(search.toLowerCase()) ? 1 : 0;
};

export type SelectControlProps = {
    id?: string;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    options: SelectOption[];
    /** Force the searchable combobox on or off. Defaults to auto based on option count. */
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyMessage?: string;
};

/**
 * Bare select control without a label or error slot. Renders a plain dropdown
 * for short lists and a searchable combobox once the list grows past
 * {@link SEARCHABLE_THRESHOLD}. Use {@link SelectField} when you also want the
 * shared label/description/error chrome.
 */
export function SelectControl({
    id,
    className,
    placeholder = 'Pilih opsi',
    disabled,
    value,
    onValueChange,
    options,
    searchable,
    searchPlaceholder = 'Cari…',
    emptyMessage = 'Data tidak ditemukan.',
}: SelectControlProps) {
    const isSearchable = searchable ?? options.length > SEARCHABLE_THRESHOLD;

    if (!isSearchable) {
        return (
            <Select value={value} onValueChange={onValueChange} disabled={disabled}>
                <SelectTrigger id={id} className={cn('w-full', className)}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    return (
        <SearchableSelect
            id={id}
            className={className}
            placeholder={placeholder}
            searchPlaceholder={searchPlaceholder}
            emptyMessage={emptyMessage}
            disabled={disabled}
            value={value}
            onValueChange={onValueChange}
            options={options}
        />
    );
}

function SearchableSelect({
    id,
    className,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    disabled,
    value,
    onValueChange,
    options,
}: Omit<SelectControlProps, 'searchable'> & {
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = useMemo(
        () => options.find((option) => option.value === value),
        [options, value],
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        'h-9 w-full justify-between px-3 font-normal',
                        !selected && 'text-muted-foreground',
                        className,
                    )}
                >
                    <span className="truncate">{selected?.label ?? placeholder}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command filter={filterByLabel}>
                    <CommandInput placeholder={searchPlaceholder} />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    keywords={[option.label]}
                                    onSelect={() => {
                                        onValueChange?.(option.value);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'size-4',
                                            value === option.value ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
