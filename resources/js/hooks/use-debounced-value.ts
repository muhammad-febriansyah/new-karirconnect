import { useEffect, useState } from 'react';

/**
 * Return `value` only after it has stopped changing for `delay` ms. Used to keep
 * a keystroke-driven input from firing a request per character.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebounced(value), delay);

        return () => window.clearTimeout(timer);
    }, [value, delay]);

    return debounced;
}
