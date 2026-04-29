import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, Bookmark, BookmarkCheck, Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Profile = {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    headline: string | null;
    about: string | null;
    current_position: string | null;
    experience_level: string | null;
    expected_salary_min: number | null;
    expected_salary_max: number | null;
    is_open_to_work: boolean;
    province: string | null;
    city: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    portfolio_url: string | null;
    skills: Array<{ id: number; name: string }>;
    educations: Array<Record<string, unknown>>;
    work_experiences: Array<Record<string, unknown>>;
    certifications: Array<Record<string, unknown>>;
};

type Props = {
    profile: Profile;
    isSaved: boolean;
};

const idr = (v: number | null) => (v ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v) : '-');

export default function EmployerTalentShow({ profile, isSaved }: Props) {
    const { data, setData, post, reset, processing, errors } = useForm({
        subject: '',
        body: '',
    });

    const sendOutreach = (e: FormEvent) => {
        e.preventDefault();
        post(`/employer/talent-search/${profile.id}/outreach`, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const toggleSave = () => {
        if (isSaved) {
            router.delete(`/employer/talent-search/${profile.id}/save`, { preserveScroll: true });
        } else {
            router.post(`/employer/talent-search/${profile.id}/save`, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title={profile.name ?? 'Kandidat'} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={profile.name ?? 'Kandidat'}
                    description={profile.headline ?? profile.current_position ?? ''}
                    actions={
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link href="/employer/talent-search"><ArrowLeft className="size-4" /> Kembali</Link>
                            </Button>
                            <Button variant={isSaved ? 'default' : 'outline'} onClick={toggleSave}>
                                {isSaved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                                {isSaved ? 'Tersimpan' : 'Simpan'}
                            </Button>
                        </div>
                    }
                />

                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="md:col-span-2">
                        <CardContent className="space-y-4 p-4">
                            <div className="flex items-center gap-4">
                                <Avatar className="size-16">
                                    <AvatarImage src={profile.avatar_url ?? undefined} />
                                    <AvatarFallback>{(profile.name ?? '?').charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="text-xl font-bold">{profile.name}</div>
                                    <div className="text-sm text-muted-foreground">{profile.current_position ?? '-'}</div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {profile.experience_level && <Badge variant="secondary" className="capitalize">{profile.experience_level}</Badge>}
                                        {profile.is_open_to_work && <Badge>Open to Work</Badge>}
                                        {profile.city && <Badge variant="outline">{profile.city}{profile.province ? `, ${profile.province}` : ''}</Badge>}
                                    </div>
                                </div>
                            </div>
                            {profile.about && (
                                <div>
                                    <div className="text-sm font-semibold">Tentang</div>
                                    <p className="text-sm text-muted-foreground">{profile.about}</p>
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-semibold">Skills</div>
                                <div className="flex flex-wrap gap-1">
                                    {profile.skills.map((s) => (<Badge key={s.id} variant="outline">{s.name}</Badge>))}
                                </div>
                            </div>
                            <div className="grid gap-2 text-sm sm:grid-cols-2">
                                <div>Email: {profile.email ?? '-'}</div>
                                <div>HP: {profile.phone ?? '-'}</div>
                                <div>Ekspektasi: {idr(profile.expected_salary_min)} - {idr(profile.expected_salary_max)}</div>
                                <div>LinkedIn: {profile.linkedin_url ?? '-'}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="space-y-2 p-4">
                            <div className="text-sm font-semibold">Kirim Pesan</div>
                            <form onSubmit={sendOutreach} className="space-y-2">
                                <Input
                                    placeholder="Subjek"
                                    value={data.subject}
                                    onChange={(e) => setData('subject', e.target.value)}
                                />
                                {errors.subject && <div className="text-xs text-destructive">{errors.subject}</div>}
                                <Textarea
                                    placeholder="Tulis pesan personal..."
                                    value={data.body}
                                    rows={6}
                                    onChange={(e) => setData('body', e.target.value)}
                                />
                                {errors.body && <div className="text-xs text-destructive">{errors.body}</div>}
                                <Button type="submit" disabled={processing} className="w-full">
                                    <Send className="size-4" /> Kirim
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                <Section title="Pengalaman Kerja">
                    {profile.work_experiences.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada pengalaman tercatat.</p>
                    ) : (
                        <div className="space-y-2">
                            {profile.work_experiences.map((w, i) => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <div className="font-semibold">{String(w.position ?? '-')}</div>
                                        <div className="text-sm text-muted-foreground">{String(w.company_name ?? '-')}</div>
                                        <div className="text-xs">{String(w.start_date ?? '')} - {String(w.end_date ?? 'Sekarang')}</div>
                                        {w.description ? <p className="mt-1 text-sm">{String(w.description)}</p> : null}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Pendidikan">
                    {profile.educations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada pendidikan tercatat.</p>
                    ) : (
                        <div className="space-y-2">
                            {profile.educations.map((e, i) => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <div className="font-semibold">{String(e.institution ?? '-')}</div>
                                        <div className="text-sm text-muted-foreground">{String(e.level ?? '')} {e.major ? `· ${String(e.major)}` : ''}</div>
                                        <div className="text-xs">{String(e.start_year ?? '')} - {String(e.end_year ?? 'Sekarang')}</div>
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
