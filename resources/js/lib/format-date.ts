import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const LOCALE = idLocale;

export function formatDate(input: string | Date | null | undefined, pattern = 'dd MMM yyyy'): string {
    if (!input) {
        return '';
    }
    const date = typeof input === 'string' ? parseISO(input) : input;
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return format(date, pattern, { locale: LOCALE });
}

export function formatDateTime(input: string | Date | null | undefined): string {
    return formatDate(input, 'dd MMM yyyy, HH:mm');
}

export function toIsoDate(input: Date | null | undefined): string {
    if (!input) {
        return '';
    }
    return format(input, 'yyyy-MM-dd');
}
