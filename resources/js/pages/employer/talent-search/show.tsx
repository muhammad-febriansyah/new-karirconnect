import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Award,
    BadgeCheck,
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Building2,
    Calendar,
    Check,
    ExternalLink,
    Github,
    GraduationCap,
    Inbox,
    Linkedin,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Send,
    Sparkles,
    UserCircle2,
    Wallet,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { TextareaField } from '@/components/form/textarea-field';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useInitials } from '@/hooks/use-initials';
import { formatStatus } from '@/lib/format-status';
import { cn } from '@/lib/utils';

type Education = {
    id?: number;
    institution?: string;
    level?: string;
    major?: string;
    start_year?: number | string;
    end_year?: number | string;
};

type WorkExperience = {
    id?: number;
    company_name?: string;
    position?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
};

type Certification = {
    id?: number;
    name?: string;
    issuer?: string;
    issued_date?: string;
};

type Profile = {
    id: number;
    user_id: number | null;
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
    educations: Education[];
    work_experiences: WorkExperience[];
    certifications: Certification[];
};

type Props = {
    profile: Profile;
    isSaved: boolean;
};

const idr = (v: number | null) =>
    v ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v) : null;

const compactIdr = (v: number | null) => {
    if (!v) return null;
    if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
    return `Rp ${v}`;
};

const toWaPhone = (raw: string | null): string | null => {
    if (!raw) return null;
    let p = raw.replace(/[\s\-+()]/g, '');
    if (p.startsWith('0')) p = `62${p.slice(1)}`;
    return p;
};

const formatMonthYear = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
};

const formatPeriod = (start?: string, end?: string): string | null => {
    const s = formatMonthYear(start);
    if (!s) return null;
    const e = formatMonthYear(end) ?? 'Sekarang';
    return `${s} – ${e}`;
};

const yearsBetween = (start?: string, end?: string): string | null => {
    if (!start) return null;
    const startMs = new Date(start).getTime();
    if (Number.isNaN(startMs)) return null;
    const endMs = end ? new Date(end).getTime() : Date.now();
    const months = Math.max(0, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24 * 30.44)));
    if (months < 1) return null;
    if (months < 12) return `${months} bln`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem === 0 ? `${years} thn` : `${years} thn ${rem} bln`;
};

type TabKey = 'profil' | 'pengalaman' | 'pendidikan' | 'sertifikasi';

export default function EmployerTalentShow({ profile, isSaved }: Props) {
    const getInitials = useInitials();
    const [tab, setTab] = useState<TabKey>('profil');

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

    const startChat = () => {
        if (profile.user_id === null) return;
        router.post(
            '/conversations/start',
            { user_id: profile.user_id, subject: `Lowongan untuk ${profile.name ?? 'Anda'}` },
            { preserveScroll: false },
        );
    };

    const waPhone = toWaPhone(profile.phone);
    const expectedSalary =
        profile.expected_salary_min || profile.expected_salary_max
            ? `${compactIdr(profile.expected_salary_min) ?? '?'}${profile.expected_salary_max ? ` – ${compactIdr(profile.expected_salary_max)}` : ''}`
            : null;

    const tabs: Array<{ key: TabKey; label: string; icon: typeof UserCircle2; count?: number }> = [
        { key: 'profil', label: 'Profil', icon: UserCircle2 },
        { key: 'pengalaman', label: 'Pengalaman', icon: Briefcase, count: profile.work_experiences.length },
        { key: 'pendidikan', label: 'Pendidikan', icon: GraduationCap, count: profile.educations.length },
        ...(profile.certifications.length > 0
            ? [{ key: 'sertifikasi' as TabKey, label: 'Sertifikasi', icon: Award, count: profile.certifications.length }]
            : []),
    ];

    return (
        <>
            <Head title={profile.name ?? 'Kandidat'} />
            <div className="space-y-5 p-4 sm:p-6">
                {/* ===== Hero ===== */}
                <Card className="relative overflow-hidden border-brand-blue/15">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-brand-blue/12 via-brand-cyan/10 to-transparent"
                    />
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-brand-cyan/15 blur-3xl"
                    />
                    <CardContent className="relative space-y-5 p-5 sm:p-6">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                            <div className="relative shrink-0">
                                <Avatar className="size-20 ring-4 ring-background sm:size-24">
                                    <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name ?? ''} />
                                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-cyan text-xl font-bold text-white">
                                        {getInitials(profile.name ?? '?')}
                                    </AvatarFallback>
                                </Avatar>
                                {profile.is_open_to_work && (
                                    <span
                                        title="Open to Work"
                                        className="absolute -bottom-0.5 right-0 inline-flex size-6 items-center justify-center rounded-full border-2 border-background bg-emerald-500 text-white"
                                    >
                                        <Check className="size-3.5" />
                                    </span>
                                )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2.5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h1 className="truncate text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                                            {profile.name ?? 'Anonim'}
                                        </h1>
                                        {(profile.headline || profile.current_position) && (
                                            <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                                                {profile.headline ?? profile.current_position}
                                            </p>
                                        )}
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="shrink-0">
                                        <Link href="/employer/talent-search">
                                            <ArrowLeft className="size-3.5" /> Kembali
                                        </Link>
                                    </Button>
                                </div>

                                {/* Meta strip */}
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                                    {profile.experience_level && (
                                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                            <Briefcase className="size-3.5 text-brand-blue" />
                                            {formatStatus(profile.experience_level)}
                                        </span>
                                    )}
                                    {(profile.city || profile.province) && (
                                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                            <MapPin className="size-3.5 text-brand-blue" />
                                            {profile.city ?? '-'}
                                            {profile.province && `, ${profile.province}`}
                                        </span>
                                    )}
                                    {profile.is_open_to_work && (
                                        <Badge className="border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-700" variant="outline">
                                            <Sparkles className="size-3" /> Open to Work
                                        </Badge>
                                    )}
                                    {expectedSalary && (
                                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                            <Wallet className="size-3.5 text-brand-blue" />
                                            Ekspektasi <strong className="text-brand-navy">{expectedSalary}</strong>
                                        </span>
                                    )}
                                </div>

                                {/* Action toolbar */}
                                <div className="flex flex-wrap gap-2 pt-1.5">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={isSaved ? 'default' : 'outline'}
                                        onClick={toggleSave}
                                        className={cn(
                                            isSaved &&
                                                'border-brand-blue/30 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/15',
                                        )}
                                    >
                                        {isSaved ? (
                                            <>
                                                <BookmarkCheck className="size-3.5" /> Tersimpan
                                            </>
                                        ) : (
                                            <>
                                                <Bookmark className="size-3.5" /> Simpan
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={startChat}
                                        disabled={profile.user_id === null}
                                        className="bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                                    >
                                        <MessageCircle className="size-3.5" /> Mulai Chat
                                    </Button>

                                    {waPhone && (
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="border-emerald-500/30 text-emerald-700 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-800"
                                        >
                                            <a
                                                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Halo ${profile.name ?? ''}, saya ingin terhubung dari KarirConnect.`)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <MessageCircle className="size-3.5" /> WhatsApp
                                            </a>
                                        </Button>
                                    )}

                                    {profile.email && (
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="border-brand-blue/30 text-brand-blue hover:border-brand-blue/50 hover:bg-brand-blue/10"
                                        >
                                            <a href={`mailto:${profile.email}?subject=${encodeURIComponent('KarirConnect — Peluang Karier')}`}>
                                                <Mail className="size-3.5" /> Email
                                            </a>
                                        </Button>
                                    )}

                                    {profile.linkedin_url && (
                                        <Button asChild size="sm" variant="outline">
                                            <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                                                <Linkedin className="size-3.5" /> LinkedIn
                                            </a>
                                        </Button>
                                    )}
                                    {profile.github_url && (
                                        <Button asChild size="sm" variant="outline">
                                            <a href={profile.github_url} target="_blank" rel="noreferrer">
                                                <Github className="size-3.5" /> GitHub
                                            </a>
                                        </Button>
                                    )}
                                    {profile.portfolio_url && (
                                        <Button asChild size="sm" variant="outline">
                                            <a href={profile.portfolio_url} target="_blank" rel="noreferrer">
                                                <ExternalLink className="size-3.5" /> Portfolio
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ===== Body grid ===== */}
                <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                    <div className="space-y-5">
                        {/* Tabs */}
                        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/60 bg-muted/30 p-1.5">
                            {tabs.map((t) => {
                                const active = t.key === tab;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setTab(t.key)}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                                            active
                                                ? 'bg-gradient-to-r from-brand-blue to-brand-cyan text-white shadow-sm'
                                                : 'text-muted-foreground hover:bg-background hover:text-brand-navy',
                                        )}
                                    >
                                        <t.icon className="size-4" />
                                        {t.label}
                                        {typeof t.count === 'number' && t.count > 0 && (
                                            <span
                                                className={cn(
                                                    'rounded px-1.5 text-[10px] font-bold',
                                                    active ? 'bg-white/20 text-white' : 'bg-brand-blue/10 text-brand-blue',
                                                )}
                                            >
                                                {t.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Profil tab */}
                        {tab === 'profil' && (
                            <div className="space-y-4">
                                {profile.about ? (
                                    <Card>
                                        <CardContent className="p-5">
                                            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                                <UserCircle2 className="size-3.5" /> Tentang Kandidat
                                            </h3>
                                            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                                                {profile.about}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <EmptyHint icon={UserCircle2} message="Kandidat belum mengisi ringkasan." />
                                )}

                                {profile.skills.length > 0 && (
                                    <Card>
                                        <CardContent className="space-y-3 p-5">
                                            <div className="flex items-center justify-between">
                                                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                                    <Sparkles className="size-3.5" /> Keahlian
                                                </h3>
                                                <span className="text-xs text-muted-foreground">{profile.skills.length} skill</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {profile.skills.map((s) => (
                                                    <Badge
                                                        key={s.id}
                                                        variant="outline"
                                                        className="border-brand-blue/15 bg-brand-blue/8 font-medium text-brand-blue"
                                                    >
                                                        {s.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Contact card */}
                                <Card>
                                    <CardContent className="space-y-2.5 p-5">
                                        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                            <Mail className="size-3.5" /> Kontak
                                        </h3>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <ContactRow
                                                icon={Mail}
                                                label="Email"
                                                value={profile.email}
                                                href={profile.email ? `mailto:${profile.email}` : null}
                                            />
                                            <ContactRow
                                                icon={Phone}
                                                label="HP / WhatsApp"
                                                value={profile.phone}
                                                href={waPhone ? `https://wa.me/${waPhone}` : null}
                                            />
                                            <ContactRow
                                                icon={Linkedin}
                                                label="LinkedIn"
                                                value={profile.linkedin_url ? prettyHost(profile.linkedin_url) : null}
                                                href={profile.linkedin_url}
                                            />
                                            <ContactRow
                                                icon={Github}
                                                label="GitHub"
                                                value={profile.github_url ? prettyHost(profile.github_url) : null}
                                                href={profile.github_url}
                                            />
                                            <ContactRow
                                                icon={ExternalLink}
                                                label="Portfolio"
                                                value={profile.portfolio_url ? prettyHost(profile.portfolio_url) : null}
                                                href={profile.portfolio_url}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Pengalaman tab */}
                        {tab === 'pengalaman' && (
                            <Card>
                                <CardContent className="p-5">
                                    {profile.work_experiences.length === 0 ? (
                                        <EmptyHint icon={Briefcase} message="Belum ada riwayat pengalaman kerja." bare />
                                    ) : (
                                        <ol className="relative ml-3 space-y-5 border-l-2 border-brand-blue/15 pl-6">
                                            {profile.work_experiences.map((exp, i) => (
                                                <li key={exp.id ?? i} className="relative">
                                                    <span className="absolute -left-[34px] top-1 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-sm ring-2 ring-background">
                                                        <Building2 className="size-3" />
                                                    </span>
                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-brand-navy">
                                                                {exp.position ?? '—'}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">{exp.company_name ?? '—'}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end text-right">
                                                            {formatPeriod(exp.start_date, exp.end_date) && (
                                                                <span className="text-xs font-medium text-brand-navy">
                                                                    {formatPeriod(exp.start_date, exp.end_date)}
                                                                </span>
                                                            )}
                                                            {yearsBetween(exp.start_date, exp.end_date) && (
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {yearsBetween(exp.start_date, exp.end_date)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {exp.description && (
                                                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                                            {exp.description}
                                                        </p>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Pendidikan tab */}
                        {tab === 'pendidikan' && (
                            <Card>
                                <CardContent className="p-5">
                                    {profile.educations.length === 0 ? (
                                        <EmptyHint icon={GraduationCap} message="Belum ada riwayat pendidikan." bare />
                                    ) : (
                                        <ol className="relative ml-3 space-y-5 border-l-2 border-brand-blue/15 pl-6">
                                            {profile.educations.map((edu, i) => (
                                                <li key={edu.id ?? i} className="relative">
                                                    <span className="absolute -left-[34px] top-1 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-sm ring-2 ring-background">
                                                        <GraduationCap className="size-3" />
                                                    </span>
                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                        <div>
                                                            <h4 className="text-sm font-bold text-brand-navy">
                                                                {edu.institution ?? '—'}
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground">
                                                                {[edu.level, edu.major].filter(Boolean).join(' · ') || '—'}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-medium text-brand-navy">
                                                            {[edu.start_year, edu.end_year ?? 'Sekarang'].filter(Boolean).join(' – ')}
                                                        </span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Sertifikasi tab */}
                        {tab === 'sertifikasi' && (
                            <Card>
                                <CardContent className="p-5">
                                    {profile.certifications.length === 0 ? (
                                        <EmptyHint icon={Award} message="Belum ada sertifikasi." bare />
                                    ) : (
                                        <ul className="grid gap-3 sm:grid-cols-2">
                                            {profile.certifications.map((cert, i) => (
                                                <li
                                                    key={cert.id ?? i}
                                                    className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 p-3"
                                                >
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
                                                        <BadgeCheck className="size-4" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="truncate text-sm font-bold text-brand-navy">
                                                            {cert.name ?? '—'}
                                                        </h4>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {cert.issuer ?? '—'}
                                                        </p>
                                                        {formatMonthYear(cert.issued_date) && (
                                                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                                <Calendar className="mr-1 inline size-3" />
                                                                {formatMonthYear(cert.issued_date)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* ===== Sidebar ===== */}
                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        {/* Outreach */}
                        <Card className="overflow-hidden border-brand-blue/15">
                            <div className="bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent px-4 py-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    <Send className="size-3.5" /> Kirim Pesan Personal
                                </div>
                            </div>
                            <CardContent className="space-y-3 p-4">
                                <form onSubmit={sendOutreach} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Subjek
                                        </label>
                                        <Input
                                            placeholder={`Peluang ${profile.headline ?? 'kerja'} di tim kami`}
                                            value={data.subject}
                                            onChange={(e) => setData('subject', e.target.value)}
                                        />
                                        {errors.subject && <p className="text-[11px] text-rose-600">{errors.subject}</p>}
                                    </div>
                                    <TextareaField
                                        label="Pesan"
                                        rows={6}
                                        placeholder={`Halo ${profile.name ?? ''}, kami tertarik dengan profil Anda…`}
                                        value={data.body}
                                        onChange={(e) => setData('body', e.target.value)}
                                        error={errors.body}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full bg-gradient-to-r from-brand-blue to-brand-cyan font-semibold shadow-sm hover:brightness-105"
                                    >
                                        <Send className="size-4" /> Kirim Pesan
                                    </Button>
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                                        Pesan akan dikirim via Inbox KarirConnect. Hindari kontak yang spammy.
                                    </p>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Quick stats */}
                        <Card>
                            <CardContent className="space-y-3 p-4 text-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                                    Ringkasan Profil
                                </h3>
                                <DetailRow icon={Briefcase} label="Pengalaman" value={`${profile.work_experiences.length} posisi`} />
                                <DetailRow icon={GraduationCap} label="Pendidikan" value={`${profile.educations.length} riwayat`} />
                                <DetailRow icon={Award} label="Sertifikasi" value={`${profile.certifications.length} sertifikat`} />
                                <DetailRow icon={Sparkles} label="Skill" value={`${profile.skills.length} keahlian`} />
                            </CardContent>
                        </Card>

                        {/* Salary expectation card */}
                        {expectedSalary && (
                            <Card className="border-brand-blue/15 bg-gradient-to-br from-brand-blue/5 to-brand-cyan/5">
                                <CardContent className="space-y-1.5 p-4">
                                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                                        <Wallet className="size-3.5" /> Ekspektasi Gaji
                                    </h3>
                                    <div className="text-lg font-bold text-brand-navy">{expectedSalary}</div>
                                    {profile.expected_salary_min && profile.expected_salary_max && (
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                            Range lengkap: {idr(profile.expected_salary_min)} – {idr(profile.expected_salary_max)}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}

function ContactRow({
    icon: Icon,
    label,
    value,
    href,
}: {
    icon: typeof Mail;
    label: string;
    value: string | null;
    href: string | null;
}) {
    const inner = (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-blue/10 text-brand-blue">
                <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className={cn('truncate text-xs font-medium', value ? 'text-brand-navy' : 'text-muted-foreground')}>
                    {value ?? '—'}
                </div>
            </div>
        </div>
    );
    if (!value || !href) return inner;
    return (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
            {inner}
        </a>
    );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Icon className="size-3.5" /> {label}
            </span>
            <span className="font-medium text-brand-navy">{value}</span>
        </div>
    );
}

function EmptyHint({
    icon: Icon,
    message,
    bare = false,
}: {
    icon: typeof Inbox;
    message: string;
    bare?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-center gap-3 text-sm text-muted-foreground',
                bare ? 'justify-center py-6 text-center' : 'rounded-xl border border-dashed border-border/60 bg-muted/20 p-5',
            )}
        >
            <Icon className="size-4 text-brand-blue" />
            <span>{message}</span>
        </div>
    );
}

function prettyHost(url: string): string {
    try {
        const u = new URL(url);
        return (u.hostname + u.pathname).replace(/^www\./, '').replace(/\/$/, '');
    } catch {
        return url;
    }
}
