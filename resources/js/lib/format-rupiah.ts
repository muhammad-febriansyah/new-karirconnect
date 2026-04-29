/**
 * Format an integer Rupiah amount, e.g. 5000000 -> "Rp 5.000.000".
 */
export function formatRupiah(amount: number | string | null | undefined, options?: { withSymbol?: boolean }): string {
    if (amount === null || amount === undefined || amount === '') {
        return '';
    }

    const value = typeof amount === 'string' ? Number(amount.replace(/[^\d-]/g, '')) : amount;

    if (!Number.isFinite(value)) {
        return '';
    }

    const formatted = new Intl.NumberFormat('id-ID', {
        maximumFractionDigits: 0,
    }).format(value);

    return options?.withSymbol === false ? formatted : `Rp ${formatted}`;
}

/**
 * Parse a free-form Rupiah string into integer (digits only).
 */
export function parseRupiah(input: string | null | undefined): number {
    if (!input) {
        return 0;
    }

    const digits = String(input).replace(/[^\d]/g, '');
    return digits === '' ? 0 : Number(digits);
}

/**
 * Build "Rp X – Rp Y" range. Hides the side that is null.
 */
export function formatSalaryRange(
    min: number | null | undefined,
    max: number | null | undefined,
): string {
    if (!min && !max) {
        return 'Gaji dirahasiakan';
    }
    if (min && max) {
        return `${formatRupiah(min)} – ${formatRupiah(max)}`;
    }
    if (min) {
        return `Mulai dari ${formatRupiah(min)}`;
    }
    return `Hingga ${formatRupiah(max!)}`;
}
