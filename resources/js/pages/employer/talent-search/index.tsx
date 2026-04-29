import { Head, Link, router, useForm } from '@inertiajs/react';
import { Bookmark, BookmarkCheck, MapPin, Search, Sparkles, UserSearch } from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ResultItem = {
    id: number;
    name: string | null;
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

const idr = (v: number | null) => (v ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v) : null);

export default function EmployerTalentSearchIndex({ filters, results }: Props) {
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
                            <Link href="/employer/talent-search/saved"><Bookmark className="size-4" /> Tersimpan</Link>
                        </Button>
                    }
                />

                <Section>
                    <Card>
                        <CardContent className="p-4">
                            <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
                                <Input
                                    placeholder="Kata kunci (jabatan, skill, headline)"
                                    value={data.keyword}
                                    onChange={(e) => setData('keyword', e.target.value)}
                                    className="md:col-span-2"
                                />
                                <Select value={data.experience_level} onValueChange={(v) => setData('experience_level', v)}>
                                    <SelectTrigger><SelectValue placeholder="Level pengalaman" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="entry">Entry</SelectItem>
                                        <SelectItem value="junior">Junior</SelectItem>
                                        <SelectItem value="mid">Mid</SelectItem>
                                        <SelectItem value="senior">Senior</SelectItem>
                                        <SelectItem value="lead">Lead</SelectItem>
                                        <SelectItem value="executive">Executive</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    placeholder="Maks ekspektasi gaji (IDR)"
                                    value={data.salary_max as number | string}
                                    onChange={(e) => setData('salary_max', e.target.value as unknown as number)}
                                />
                                <Select value={data.sort} onValueChange={(v) => setData('sort', v)}>
                                    <SelectTrigger><SelectValue placeholder="Urutkan" /></SelectTrigger>
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
                                <Button type="submit" disabled={processing}>
                                    <Search className="size-4" /> Cari
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </Section>

                <Section title={`${results.data.length} dari halaman ${results.current_page}/${results.last_page}`}>
                    {results.data.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                                <UserSearch className="size-8" />
                                <div>Tidak ada kandidat yang cocok dengan filter Anda.</div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {results.data.map((c) => (
                                <Card key={c.id}>
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar>
                                                <AvatarImage src={c.avatar_url ?? undefined} />
                                                <AvatarFallback>{(c.name ?? '?').charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="font-semibold">
                                                            <Link href={`/employer/talent-search/${c.id}`}>{c.name ?? 'Anonim'}</Link>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{c.headline ?? c.current_position ?? '-'}</div>
                                                    </div>
                                                    <Button size="icon" variant="ghost" onClick={() => toggleSave(c)}>
                                                        {c.is_saved ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
                                                    </Button>
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                    {c.experience_level && <Badge variant="secondary" className="capitalize">{c.experience_level}</Badge>}
                                                    {c.is_open_to_work && <Badge><Sparkles className="mr-1 size-3" /> Open to Work</Badge>}
                                                    {c.city && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="size-3" /> {c.city}{c.province ? `, ${c.province}` : ''}
                                                        </span>
                                                    )}
                                                    {c.expected_salary_min && (
                                                        <span>Ekspektasi: {idr(c.expected_salary_min)}{c.expected_salary_max ? ` - ${idr(c.expected_salary_max)}` : ''}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {c.skills.map((s) => (<Badge key={s.id} variant="outline">{s.name}</Badge>))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}
