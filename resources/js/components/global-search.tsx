import { router, usePage } from '@inertiajs/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { adminMainNavSections } from '@/components/role-sidebars/admin-sidebar';
import { employeeMainNavSections } from '@/components/role-sidebars/employee-sidebar';
import { employerMainNavSections } from '@/components/role-sidebars/employer-sidebar';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { NavSection, SharedPageProps, UserRole } from '@/types';

/** Matches GlobalSearchController::MIN_QUERY_LENGTH. */
const MIN_QUERY_LENGTH = 2;

type ResultItem = { title: string; subtitle: string; url: string };
type ResultGroup = { label: string; items: ResultItem[] };

const navByRole: Record<string, NavSection[]> = {
    admin: adminMainNavSections,
    employer: employerMainNavSections,
    employee: employeeMainNavSections,
};

function hrefToUrl(href: NavSection['items'][number]['href']): string {
    return typeof href === 'string' ? href : href.url;
}

export function GlobalSearch({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { auth } = usePage<SharedPageProps>().props;
    const role = (auth.user?.role as UserRole | undefined) ?? 'employee';

    const [query, setQuery] = useState('');
    // Keep the term each result set belongs to, so a stale response never shows
    // under a newer query — derived at render instead of cleared in an effect.
    const [result, setResult] = useState<{ term: string; groups: ResultGroup[] }>({ term: '', groups: [] });
    const debouncedQuery = useDebouncedValue(query, 300);

    const pages = useMemo(() => {
        const term = query.trim().toLowerCase();

        if (term === '') {
            return [];
        }

        return (navByRole[role] ?? employeeMainNavSections)
            .flatMap((section) => section.items)
            .filter((item) => item.title.toLowerCase().includes(term))
            .slice(0, 5);
    }, [query, role]);

    // Data results come from the server; pages above are filtered locally, so a
    // short query still navigates instantly without waiting on a request.
    useEffect(() => {
        const term = debouncedQuery.trim();

        if (term.length < MIN_QUERY_LENGTH) {
            return;
        }

        const controller = new AbortController();

        fetch(`/search?q=${encodeURIComponent(term)}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
            .then((response) => (response.ok ? response.json() : { groups: [] }))
            .then((data: { groups?: ResultGroup[] }) => setResult({ term, groups: data.groups ?? [] }))
            .catch(() => {
                // Aborted by the next keystroke, or the request failed — either way
                // the newer request owns the results.
            });

        return () => controller.abort();
    }, [debouncedQuery]);

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setQuery('');
            setResult({ term: '', groups: [] });
        }

        onOpenChange(next);
    };

    const go = (url: string) => {
        handleOpenChange(false);
        router.visit(url);
    };

    const term = query.trim();
    const groups = result.term === term ? result.groups : [];
    // No loading state to track: we are waiting whenever the results on hand
    // belong to a different term than the one typed.
    const loading = term.length >= MIN_QUERY_LENGTH && result.term !== term;
    const hasResults = pages.length > 0 || groups.length > 0;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogHeader className="sr-only">
                <DialogTitle>Pencarian</DialogTitle>
                <DialogDescription>Cari halaman, menu, atau data.</DialogDescription>
            </DialogHeader>
            <DialogContent className="overflow-hidden p-0" showCloseButton={false}>
                {/* shouldFilter={false}: the server already matched the data results,
                    and cmdk's own filter would drop rows it cannot see the text of. */}
                <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:text-xs">
                    <CommandInput
                        value={query}
                        onValueChange={setQuery}
                        placeholder="Cari halaman, menu, atau data…"
                    />
                    <CommandList className="max-h-[60vh]">
                        {term === '' && (
                            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                <Search className="mx-auto mb-2 size-5 opacity-40" />
                                Ketik untuk mencari halaman atau data.
                            </div>
                        )}

                        {term !== '' && loading && !hasResults && (
                            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Mencari…
                            </div>
                        )}

                        {term !== '' && !loading && !hasResults && (
                            <CommandEmpty>Tidak ada hasil untuk “{term}”.</CommandEmpty>
                        )}

                        {pages.length > 0 && (
                            <CommandGroup heading="Halaman">
                                {pages.map((item) => {
                                    const url = hrefToUrl(item.href);

                                    return (
                                        <CommandItem
                                            key={url}
                                            value={`page-${url}`}
                                            onSelect={() => go(url)}
                                        >
                                            {item.icon && <item.icon className="size-4 text-muted-foreground" />}
                                            {item.title}
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        )}

                        {groups.map((group) => (
                            <CommandGroup key={group.label} heading={group.label}>
                                {group.items.map((item) => (
                                    <CommandItem
                                        key={`${group.label}-${item.url}`}
                                        value={`${group.label}-${item.url}`}
                                        onSelect={() => go(item.url)}
                                    >
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate">{item.title}</span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {item.subtitle}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
}

/** Opens the palette on ⌘K / Ctrl+K. */
export function useGlobalSearchShortcut(onOpen: () => void) {
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                onOpen();
            }
        };

        document.addEventListener('keydown', handler);

        return () => document.removeEventListener('keydown', handler);
    }, [onOpen]);
}
