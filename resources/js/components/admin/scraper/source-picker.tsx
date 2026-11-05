import { Link2, ShieldAlert } from 'lucide-react';
import { ToneBadge } from '@/components/admin/scraper/scraper-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/lib/format-date';
import type { SourceRef, Tone } from '@/types/scraper';

export type CatalogEntry = {
    key: string;
    name: string;
    group: string;
    attribution: string | null;
    default_selected: boolean;
    cooldown_until: string | null;
    last_run: {
        status_label: string;
        status_tone: Tone;
        created_at: string | null;
    } | null;
};

export type SavedSource = SourceRef & {
    base_url: string;
    can_run: boolean;
    cooldown_until: string | null;
};

export type ScrapeSources = { catalog: CatalogEntry[]; saved: SavedSource[] };

export const MAX_URLS = 5;

export function parseUrls(text: string): string[] {
    return Array.from(
        new Set(
            text
                .split(/[\s,]+/)
                .map((url) => url.trim())
                .filter(Boolean),
        ),
    ).slice(0, MAX_URLS);
}

function Choice({
    checked,
    disabled,
    onChange,
    title,
    subtitle,
    badge,
}: {
    checked: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
    title: string;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;
}) {
    return (
        <label
            className={`flex items-start gap-3 rounded-lg border p-3 ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-muted/40'}`}
        >
            <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => onChange(value === true)}
            />
            <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{title}</span>
                    {badge}
                </span>
                {subtitle && (
                    <span className="block text-xs text-muted-foreground">
                        {subtitle}
                    </span>
                )}
            </span>
        </label>
    );
}

/**
 * Step 1 of the Scrap dialog: ready-made sources, sources added by URL
 * earlier, and a box to paste new URLs. No source form to fill in.
 */
export function SourcePicker({
    sources,
    catalog,
    onCatalogChange,
    saved,
    onSavedChange,
    urlText,
    onUrlTextChange,
}: {
    sources: ScrapeSources;
    catalog: string[];
    onCatalogChange: (keys: string[]) => void;
    saved: number[];
    onSavedChange: (ids: number[]) => void;
    urlText: string;
    onUrlTextChange: (text: string) => void;
}) {
    const groups = Array.from(
        new Set(sources.catalog.map((entry) => entry.group)),
    );
    const toggle = <T,>(list: T[], value: T, on: boolean) =>
        on ? [...list, value] : list.filter((item) => item !== value);

    return (
        <div className="space-y-6">
            {groups.map((group) => (
                <section key={group} className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        {group}
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {sources.catalog
                            .filter((entry) => entry.group === group)
                            .map((entry) => (
                                <li key={entry.key}>
                                    <Choice
                                        checked={catalog.includes(entry.key)}
                                        disabled={entry.cooldown_until !== null}
                                        onChange={(on) =>
                                            onCatalogChange(
                                                toggle(catalog, entry.key, on),
                                            )
                                        }
                                        title={entry.name}
                                        badge={
                                            entry.last_run && (
                                                <ToneBadge
                                                    tone={
                                                        entry.last_run
                                                            .status_tone
                                                    }
                                                >
                                                    {
                                                        entry.last_run
                                                            .status_label
                                                    }
                                                </ToneBadge>
                                            )
                                        }
                                        subtitle={
                                            entry.cooldown_until &&
                                            `Jeda sampai ${formatDateTime(entry.cooldown_until)}.`
                                        }
                                    />
                                </li>
                            ))}
                    </ul>
                </section>
            ))}

            {sources.saved.length > 0 && (
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        Ditambahkan lewat URL
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                        {sources.saved.map((source) => (
                            <li key={source.id}>
                                <Choice
                                    checked={saved.includes(source.id)}
                                    disabled={!source.can_run}
                                    onChange={(on) =>
                                        onSavedChange(
                                            toggle(saved, source.id, on),
                                        )
                                    }
                                    title={source.name}
                                    subtitle={
                                        <>
                                            <span className="block truncate">
                                                {source.base_url}
                                            </span>
                                            {source.cooldown_until &&
                                                `Jeda sampai ${formatDateTime(source.cooldown_until)}.`}
                                        </>
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="space-y-2">
                <Label
                    htmlFor="scrape_urls"
                    className="flex items-center gap-1.5"
                >
                    <Link2 className="size-4" /> Tempel URL lain (maks.{' '}
                    {MAX_URLS})
                </Label>
                <Textarea
                    id="scrape_urls"
                    rows={3}
                    value={urlText}
                    onChange={(event) => onUrlTextChange(event.target.value)}
                    placeholder={
                        'https://careers.perusahaan.co.id/lowongan\nhttps://job-boards.greenhouse.io/namaperusahaan'
                    }
                />
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                    Halaman karier perusahaan, satu lowongan, board
                    Greenhouse/Lever, atau sitemap. robots.txt dan CAPTCHA dicek
                    otomatis; situs yang menolak bot (Glints, Kalibrr,
                    JobStreet, LinkedIn, Indeed, dll.) tidak diproses. Pastikan
                    Anda berhak memakai lowongan dari situs yang ditempel.
                </p>
            </section>
        </div>
    );
}
