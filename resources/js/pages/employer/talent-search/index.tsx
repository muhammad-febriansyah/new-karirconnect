import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Eye,
    Linkedin,
    Mail,
    MapPin,
    MessageCircle,
    Search,
    Sparkles,
    UserSearch,
    Wallet,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { MoneyInput } from '@/components/form/money-input';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInitials } from '@/hooks/use-initials';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type ResultItem = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    headline: string | null;
    current_position: string | null;
    experience_level: string | null;
    expected_salary_min: number | null;
    expected_salary_max: number | null;
    is_open_to_work: boolean;
    profile_completion: number;
    province: string | null;
    city: string | null;
    skills: Array<{ id: number; name: string }>;
    skills_count: number;
    linkedin_url: string | null;
    is_saved: boolean;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    filters: {
        keyword?: string;
        experience_level?: string;
        salary_max?: number;
        open_to_work?: boolean;
        sort?: string;
    };
    results: Paginator<ResultItem>;
    skills: Array<{ id: number; name: string; slug: string }>;
};

const idr = (v: number | null) =>
    v ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v) : null;

const compactIdr = (v: number | null) => {
    if (!v) return null;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
    return `Rp ${v}`;
};

/** Strips +, spaces, dashes, leading 0 (Indonesia → 62). */
const toWaPhone = (raw: string | null): string | null => {
    if (!raw) return null;
    let p = raw.replace(/[\s\-+()]/g, '');
    if (p.startsWith('0')) p = `62${p.slice(1)}`;
    return p;
};

const completionTone = (pct: number): { bar: string; chip: string } => {
    if (pct >= 80) return { bar: 'from-emerald-500 to-emerald-600', chip: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700' };
    if (pct >= 60) return { bar: 'from-brand-blue to-brand-cyan', chip: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue' };
    if (pct >= 40) return { bar: 'from-amber-500 to-amber-600', chip: 'border-amber-500/30 bg-amber-500/10 text-amber-700' };
    return { bar: 'from-rose-500 to-rose-600', chip: 'border-rose-500/30 bg-rose-500/10 text-rose-700' };
};

export default function EmployerTalentSearchIndex({ filters, results }: Props) {
    const getInitials = useInitials();
    const { data, setData, get, processing } = useForm({
        keyword: filters.keyword ?? '',
        experience_level: filters.experience_level ?? '',
        salary_max: filters.salary_max ?? '',
        open_to_work: filters.open_to_work ?? false,
        sort: filters.sort ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        get('/employer/talent-search', { preserveState: true, preserveScroll: true });
    };

    const toggleSave = (item: ResultItem) => {
        if (item.is_saved) {
            router.delete(`/employer/talent-search/${item.id}/save`, { preserveScroll: true });
        } else {
            router.post(`/employer/talent-search/${item.id}/save`, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Talent Search" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Talent Search"
                    description="Cari kandidat aktif dari basis data KarirConnect."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/employer/talent-search/saved">
                                <Bookmark className="size-4" /> Tersimpan
                            </Link>
                        </Button>
                    }
                />

                <Section>
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
                        <Input
                            placeholder="Kata kunci (jabatan, skill, headline)"
                            value={data.keyword}
                            onChange={(e) => setData('keyword', e.target.value)}
                            className="md:col-span-2"
                        />
                        <Select value={data.experience_level} onValueChange={(v) => setData('experience_level', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Level pengalaman" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="entry">Entry</SelectItem>
                                <SelectItem value="junior">Junior</SelectItem>
                                <SelectItem value="mid">Mid</SelectItem>
                                <SelectItem value="senior">Senior</SelectItem>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="executive">Executive</SelectItem>
                            </SelectContent>
                        </Select>
                        <MoneyInput
                            value={data.salary_max}
                            onChange={(value) => setData('salary_max', value ?? '')}
                            placeholder="Rp 15.000.000"
                        />
                        <Select value={data.sort} onValueChange={(v) => setData('sort', v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Urutkan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Terbaru</SelectItem>
                                <SelectItem value="completion">Profil paling lengkap</SelectItem>
                            </SelectContent>
                        </Select>
                        <label className="flex items-center gap-2 text-sm md:col-span-4">
                            <input
                                type="checkbox"
                                checked={data.open_to_work}
                                onChange={(e) => setData('open_to_work', e.target.checked)}
                            />
                            Hanya yang Open to Work
                        </label>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                        >
                            <Search className="size-4" /> Cari
                        </Button>
                    </form>
                </Section>

                <Section title={`${results.data.length} dari halaman ${results.current_page}/${results.last_page}`}>
                    {results.data.length === 0 ? (
                        <EmptyState
                            icon={UserSearch}
                            title="Tidak ada kandidat yang cocok"
                            description="Coba ubah filter pencarian untuk melihat hasil lain."
                        />
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {results.data.map((c) => {
                                const tone = completionTone(c.profile_completion);
                                const waPhone = toWaPhone(c.phone);
                                return (
                                    <Card
                                        key={c.id}
                                        className="group/card relative overflow-hidden border-border/60 transition-all hover:border-brand-blue/30 hover:shadow-md hover:shadow-brand-blue/5"
                                    >
                                        {c.is_saved && (
                                            <div
                                                aria-hidden
                                                className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-brand-blue to-brand-cyan"
                                            />
                                        )}
                                        <CardContent className="space-y-4 p-5">
                                            {/* Top row: Avatar + identity + match score */}
                                            <div className="flex items-start gap-3.5">
                                                <Avatar className="size-14 ring-2 ring-background">
                                                    <AvatarImage src={c.avatar_url ?? undefined} alt={c.name ?? ''} />
                                                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-cyan text-base font-bold text-white">
                                                        {getInitials(c.name ?? '?')}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/employer/talent-search/${c.id}`}
                                                                className="block truncate text-base font-bold leading-tight text-brand-navy hover:text-brand-blue"
                                                            >
                                                                {c.name ?? 'Anonim'}
                                                            </Link>
                                                            <p className="mt-0.5 truncate text-sm font-medium text-muted-foreground">
                                                                {c.headline ?? c.current_position ?? 'Profesional'}
                                                            </p>
                                                        </div>

                                                        {/* Profile completion ring badge */}
                                                        <div
                                                            className={cn(
                                                                'flex shrink-0 flex-col items-center rounded-lg border px-2 py-1',
                                                                tone.chip,
                                                            )}
                                                            title={`Profil ${c.profile_completion}% lengkap`}
                                                        >
                                                            <span className="font-mono text-sm font-bold leading-none tabular-nums">
                                                                {c.profile_completion}%
                                                            </span>
                                                            <span className="text-[8px] font-bold uppercase tracking-wider opacity-70">
                                                                Profil
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Status pills */}
                                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                        {c.experience_level && (
                                                            <Badge variant="outline" className="font-medium">
                                                                <Briefcase className="size-3" /> {formatStatus(c.experience_level)}
                                                            </Badge>
                                                        )}
                                                        {c.is_open_to_work && (
                                                            <Badge className="border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-700" variant="outline">
                                                                <Sparkles className="size-3" /> Open to Work
                                                            </Badge>
                                                        )}
                                                        {(c.city || c.province) && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                                <MapPin className="size-3 text-brand-blue" />
                                                                {c.city ?? '-'}
                                                                {c.province && `, ${c.province}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Profile completion bar */}
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-medium text-muted-foreground">Kelengkapan Profil</span>
                                                    <span className="font-mono tabular-nums text-brand-navy">
                                                        {c.profile_completion}%
                                                    </span>
                                                </div>
                                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                    <div
                                                        className={cn(
                                                            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-[width] duration-500',
                                                            tone.bar,
                                                        )}
                                                        style={{ width: `${Math.min(100, Math.max(0, c.profile_completion))}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Salary */}
                                            {(c.expected_salary_min || c.expected_salary_max) && (
                                                <div className="rounded-xl border border-brand-blue/15 bg-gradient-to-r from-brand-blue/5 to-brand-cyan/5 p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Wallet className="size-4 text-brand-blue" />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                                                                Ekspektasi Gaji
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-bold text-brand-navy">
                                                            {compactIdr(c.expected_salary_min) ?? '?'}
                                                            {c.expected_salary_max && (
                                                                <>
                                                                    <span className="mx-1 text-muted-foreground">–</span>
                                                                    {compactIdr(c.expected_salary_max)}
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Skills */}
                                            {c.skills.length > 0 && (
                                                <div>
                                                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                                                        <span className="font-bold uppercase tracking-wider text-brand-blue">
                                                            Keahlian
                                                        </span>
                                                        <span className="text-muted-foreground">{c.skills_count} skill</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {c.skills.map((s) => (
                                                            <Badge
                                                                key={s.id}
                                                                variant="outline"
                                                                className="border-brand-blue/15 bg-brand-blue/5 text-xs font-medium text-brand-blue"
                                                            >
                                                                {s.name}
                                                            </Badge>
                                                        ))}
                                                        {c.skills_count > c.skills.length && (
                                                            <Badge variant="outline" className="text-xs text-muted-foreground">
                                                                +{c.skills_count - c.skills.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Action buttons row */}
                                            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                                                <Button
                                                    asChild
                                                    size="sm"
                                                    className="bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                                                >
                                                    <Link href={`/employer/talent-search/${c.id}`}>
                                                        <Eye className="size-3.5" /> Lihat Profil
                                                    </Link>
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant={c.is_saved ? 'default' : 'outline'}
                                                    onClick={() => toggleSave(c)}
                                                    className={cn(
                                                        c.is_saved &&
                                                            'border-brand-blue/30 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15',
                                                    )}
                                                >
                                                    {c.is_saved ? (
                                                        <>
                                                            <BookmarkCheck className="size-3.5" /> Tersimpan
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Bookmark className="size-3.5" /> Simpan
                                                        </>
                                                    )}
                                                </Button>

                                                {waPhone && (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-emerald-500/30 text-emerald-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-800"
                                                    >
                                                        <a
                                                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Halo ${c.name ?? ''}, saya ingin terhubung dari KarirConnect.`)}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            <MessageCircle className="size-3.5" /> WhatsApp
                                                        </a>
                                                    </Button>
                                                )}

                                                {c.email && (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-brand-blue/30 text-brand-blue hover:border-brand-blue/50 hover:bg-brand-blue/10"
                                                    >
                                                        <a href={`mailto:${c.email}?subject=${encodeURIComponent('KarirConnect — Peluang Karier')}`}>
                                                            <Mail className="size-3.5" /> Email
                                                        </a>
                                                    </Button>
                                                )}

                                                {c.linkedin_url && (
                                                    <Button asChild size="sm" variant="outline">
                                                        <a href={c.linkedin_url} target="_blank" rel="noreferrer" aria-label="LinkedIn">
                                                            <Linkedin className="size-3.5" />
                                                        </a>
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}
