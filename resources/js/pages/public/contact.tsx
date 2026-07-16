import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    HeadphonesIcon,
    MessageSquare,
    Send,
    Sparkles,
    Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { store as contactStore } from '@/routes/public/contact';
import type { SharedPageProps } from '@/types/shared';

const SUBJECTS = [
    {
        key: 'support',
        label: 'Bantuan Akun',
        description: 'Login, profil, lamaran, atau notifikasi.',
        icon: HeadphonesIcon,
        tone: 'bg-brand-blue/10 text-brand-blue',
    },
    {
        key: 'employer',
        label: 'Untuk Perusahaan',
        description: 'Posting lowongan, paket employer, verifikasi.',
        icon: Users,
        tone: 'bg-emerald-100 text-emerald-700',
    },
    {
        key: 'partnership',
        label: 'Kerja Sama',
        description: 'Integrasi, partnership, atau media.',
        icon: Sparkles,
        tone: 'bg-violet-100 text-violet-700',
    },
    {
        key: 'feedback',
        label: 'Saran & Bug',
        description: 'Laporan masalah atau ide perbaikan.',
        icon: MessageSquare,
        tone: 'bg-amber-100 text-amber-700',
    },
];

const FAQ_ITEMS = [
    {
        q: 'Berapa lama tim akan merespons?',
        a: 'Mayoritas pesan dijawab dalam 1×24 jam pada hari kerja. Permintaan kerja sama dapat memerlukan waktu lebih lama.',
    },
    {
        q: 'Apakah saya bisa langsung bertemu tim?',
        a: 'Bisa — untuk diskusi enterprise atau partnership, kami siap menjadwalkan call atau pertemuan tatap muka.',
    },
    {
        q: 'Bagaimana melaporkan lowongan palsu?',
        a: 'Pilih subjek "Saran & Bug" dan sertakan link lowongan. Tim moderasi akan menindaklanjuti dalam 4 jam kerja.',
    },
];

export default function PublicContact() {
    const { flash } = usePage<SharedPageProps>().props;
    const [showSuccess, setShowSuccess] = useState(false);

    const form = useForm({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    useEffect(() => {
        if (flash?.success) {
            setShowSuccess(true);
            const timer = setTimeout(() => setShowSuccess(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [flash?.success]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(contactStore().url, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('name', 'email', 'subject', 'message');
            },
        });
    };

    return (
        <>
            <Head title="Kontak — KarirConnect" />

            <div className="space-y-12 sm:space-y-16">
                {/* Breadcrumb */}
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href={home().url}>Beranda</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Kontak</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                {/* ===== Hero ===== */}
                <section className="space-y-5">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                        <HeadphonesIcon className="size-3" /> Kami siap membantu
                    </span>
                    <h1 className="max-w-3xl text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                        Hubungi tim KarirConnect
                    </h1>
                    <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                        Punya pertanyaan, ingin kerja sama, atau perlu bantuan akun? Pilih cara
                        terbaik untuk menghubungi tim kami — kami biasanya merespons dalam beberapa
                        jam pada hari kerja.
                    </p>
                </section>

                {/* ===== Contact form ===== */}
                <section>
                    {/* Form card */}
                    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-border/60 bg-card p-6 shadow-xs sm:p-8">
                        <div className="flex items-start gap-3">
                            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                <Send className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                    Kirim pesan ke tim kami
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Pilih topik yang sesuai supaya pesan Anda diteruskan ke tim yang
                                    tepat.
                                </p>
                            </div>
                        </div>

                        {/* Subject quick-picks */}
                        <div className="mt-6 grid gap-2 sm:grid-cols-2">
                            {SUBJECTS.map((s) => {
                                const active = form.data.subject === s.label;
                                return (
                                    <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => form.setData('subject', s.label)}
                                        className={cn(
                                            'group relative flex items-start gap-3 overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5',
                                            active
                                                ? 'border-brand-blue/40 bg-brand-blue/5 shadow-xs ring-1 ring-brand-blue/20'
                                                : 'border-border/60 bg-card hover:border-brand-blue/30',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                                                active ? 'bg-brand-blue text-white' : s.tone,
                                            )}
                                        >
                                            <s.icon className="size-4" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={cn(
                                                    'text-sm font-semibold',
                                                    active
                                                        ? 'text-brand-blue'
                                                        : 'text-foreground',
                                                )}
                                            >
                                                {s.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {s.description}
                                            </p>
                                        </div>
                                        {active && (
                                            <CheckCircle2 className="absolute right-2 top-2 size-4 text-brand-blue" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InputField
                                    label="Nama Lengkap"
                                    placeholder="Nama Anda"
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    error={form.errors.name}
                                    required
                                />
                                <InputField
                                    label="Email"
                                    type="email"
                                    placeholder="anda@email.com"
                                    value={form.data.email}
                                    onChange={(event) => form.setData('email', event.target.value)}
                                    error={form.errors.email}
                                    required
                                />
                            </div>
                            <InputField
                                label="Subjek"
                                placeholder="Atau pilih topik di atas"
                                value={form.data.subject}
                                onChange={(event) => form.setData('subject', event.target.value)}
                                error={form.errors.subject}
                                required
                            />
                            <TextareaField
                                label="Pesan"
                                placeholder="Tuliskan pertanyaan, masukan, atau detail kerja sama Anda…"
                                rows={7}
                                value={form.data.message}
                                onChange={(event) => form.setData('message', event.target.value)}
                                error={form.errors.message}
                                required
                            />

                            {showSuccess && flash?.success && (
                                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                    <p>{flash.success}</p>
                                </div>
                            )}

                            <div className="flex flex-col items-stretch gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Dengan mengirim, Anda menyetujui{' '}
                                    <Link
                                        href="/privacy-policy"
                                        className="text-brand-blue hover:underline"
                                    >
                                        Kebijakan Privasi
                                    </Link>{' '}
                                    kami.
                                </p>
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={form.processing}
                                    className="h-11 rounded-xl bg-brand-blue px-6 hover:bg-brand-blue/90"
                                >
                                    {form.processing ? (
                                        <>
                                            <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Mengirim...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="size-4" /> Kirim Pesan
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </section>

                {/* ===== Mini FAQ ===== */}
                <section className="space-y-6">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/5 px-2.5 py-1 text-xs font-medium text-brand-blue">
                                <MessageSquare className="size-3" /> Pertanyaan umum
                            </span>
                            <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                Sebelum Anda mengirim pesan
                            </h2>
                        </div>
                        <Link
                            href="/faq"
                            className="text-sm font-medium text-brand-blue hover:underline"
                        >
                            Lihat semua FAQ →
                        </Link>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        {FAQ_ITEMS.map((item, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs transition-all hover:border-brand-blue/30 hover:shadow-md"
                            >
                                <p className="text-sm font-semibold text-foreground">{item.q}</p>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                    {item.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}
