import { Form, Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    BriefcaseBusiness,
    Building2,
    Mail,
    Sparkles,
    UserRoundSearch,
    Building,
} from 'lucide-react';
import { useEffect } from 'react';
import GoogleMark from '@/components/google-mark';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { AnalyticsEvent, trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    mode?: 'chooser' | 'form';
    role?: 'employee' | 'employer';
    roleLabel?: string;
    title?: string;
    description?: string;
    googleUrl?: string;
    loginUrl?: string;
    locale?: string;
    roleOptions?: Array<{
        label: string;
        description: string;
        href: string;
    }>;
};

const roleMeta = {
    employee: {
        badge: 'Jobseeker',
        nameLabel: 'Nama Lengkap',
        namePlaceholder: 'Nama lengkap Anda',
        emailPlaceholder: 'nama@email.com',
        icon: UserRoundSearch,
    },
    employer: {
        badge: 'Perusahaan Perekrut',
        nameLabel: 'Nama PIC',
        namePlaceholder: 'Nama PIC (penanggung jawab)',
        emailPlaceholder: 'hr@perusahaan.com',
        icon: Building2,
    },
} as const;

export default function Register({
    mode = 'chooser',
    roleOptions = [],
    role = 'employee',
    roleLabel,
    title,
    description,
    googleUrl,
    loginUrl = login().url,
    locale = 'id',
}: Props) {
    if (mode === 'chooser') {
        return (
            <>
                <Head title="Pilih Jenis Akun" />

                <div className="space-y-5">
                    <div className="space-y-2 text-center lg:text-left">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-brand-blue uppercase ring-1 ring-brand-blue/15">
                            <Sparkles className="size-3" />
                            Mulai sekarang
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight text-brand-navy">
                            Pilih jenis akun
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Gunakan alur pendaftaran yang sesuai agar dashboard
                            dan fitur Anda langsung tepat sasaran.
                        </p>
                    </div>

                    <div className="grid gap-3">
                        {roleOptions.map((option) => {
                            const Icon = option.label
                                .toLowerCase()
                                .includes('perusahaan')
                                ? BriefcaseBusiness
                                : UserRoundSearch;

                            return (
                                <Link
                                    key={option.href}
                                    href={option.href}
                                    className="group rounded-2xl border border-border/60 bg-background px-4 py-4 shadow-xs transition-all hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:shadow-md"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex size-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-white">
                                            <Icon className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="text-base font-semibold text-brand-navy">
                                                    {option.label}
                                                </span>
                                                <ArrowRight className="size-4 text-brand-blue transition-transform group-hover:translate-x-0.5" />
                                            </div>
                                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                                {option.description}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                        Sudah punya akun?{' '}
                        <TextLink
                            href={loginUrl}
                            className="font-semibold text-brand-blue hover:text-brand-blue/80"
                        >
                            Masuk di sini
                        </TextLink>
                    </p>
                </div>
            </>
        );
    }

    const meta = roleMeta[role];
    const RoleIcon = meta.icon;

    // The signup funnel. Page views say how many reached this form; these say
    // how many tried, how many got in, and what stopped the rest.
    useEffect(() => {
        trackEvent(AnalyticsEvent.RegisterStart, { role });
    }, [role]);

    return (
        <>
            <Head title={title ?? 'Register'} />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-6"
                onSubmit={() =>
                    trackEvent(AnalyticsEvent.RegisterSubmit, { role })
                }
                onSuccess={() =>
                    trackEvent(AnalyticsEvent.RegisterSuccess, { role })
                }
                onError={(errors) =>
                    trackEvent(AnalyticsEvent.RegisterFailed, {
                        role,
                        // Field names only. The values are the user's own
                        // credentials and must never reach Google.
                        reason: Object.keys(errors).join(','),
                    })
                }
            >
                {({ processing, errors }) => (
                    <>
                        {(title || description) && (
                            <div className="space-y-2 text-center lg:text-left">
                                {title && (
                                    <h2 className="text-2xl font-bold tracking-tight text-brand-navy">
                                        {title}
                                    </h2>
                                )}
                                {description && (
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}

                        {Object.keys(errors).length > 0 && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                            >
                                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        Pendaftaran gagal
                                    </p>
                                    <ul className="space-y-0.5 text-destructive/90">
                                        {[
                                            ...new Set(
                                                Object.values(errors).filter(
                                                    Boolean,
                                                ),
                                            ),
                                        ].map((message) => (
                                            <li key={message}>{message}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <input type="hidden" name="role" value={role} />
                        <input type="hidden" name="locale" value={locale} />

                        <div className="grid gap-5">
                            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-brand-blue/5 px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-xl bg-brand-blue text-white">
                                        <RoleIcon className="size-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold tracking-wider text-brand-blue/80 uppercase">
                                            Tipe akun
                                        </div>
                                        <div className="text-sm font-semibold text-brand-navy">
                                            {roleLabel ?? meta.badge}
                                        </div>
                                    </div>
                                </div>
                                <Link
                                    href="/register"
                                    className="text-xs font-semibold text-brand-blue transition-colors hover:text-brand-blue/80"
                                >
                                    Ganti
                                </Link>
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="name"
                                    className="text-xs font-semibold tracking-wider text-brand-navy/80 uppercase"
                                >
                                    {meta.nameLabel}
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder={meta.namePlaceholder}
                                    className="h-12 rounded-xl border-border/60 bg-background text-sm shadow-xs placeholder:text-muted-foreground/50 focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                                />
                                <InputError
                                    message={errors.name}
                                    className="mt-1"
                                />
                            </div>

                            {role === 'employer' && (
                                <div className="grid gap-2">
                                    <Label
                                        htmlFor="company_name"
                                        className="text-xs font-semibold tracking-wider text-brand-navy/80 uppercase"
                                    >
                                        Nama Perusahaan
                                    </Label>
                                    <div className="relative">
                                        <Building className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                        <Input
                                            id="company_name"
                                            type="text"
                                            required
                                            autoComplete="organization"
                                            name="company_name"
                                            placeholder="Nama perusahaan"
                                            className="h-12 rounded-xl border-border/60 bg-background pl-11 text-sm shadow-xs placeholder:text-muted-foreground/50 focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                                        />
                                    </div>
                                    <InputError message={errors.company_name} />
                                </div>
                            )}

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-semibold tracking-wider text-brand-navy/80 uppercase"
                                >
                                    Alamat Email
                                </Label>
                                <div className="relative">
                                    <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        tabIndex={2}
                                        autoComplete="email"
                                        name="email"
                                        placeholder={meta.emailPlaceholder}
                                        className="h-12 rounded-xl border-border/60 bg-background pl-11 text-sm shadow-xs placeholder:text-muted-foreground/50 focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password"
                                    className="text-xs font-semibold tracking-wider text-brand-navy/80 uppercase"
                                >
                                    Kata Sandi
                                </Label>
                                <PasswordInput
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Masukkan kata sandi"
                                    className="h-12 rounded-xl border-border/60 bg-background text-sm shadow-xs placeholder:text-muted-foreground/50 focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="password_confirmation"
                                    className="text-xs font-semibold tracking-wider text-brand-navy/80 uppercase"
                                >
                                    Konfirmasi Kata Sandi
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Ulangi kata sandi"
                                    className="h-12 rounded-xl border-border/60 bg-background text-sm shadow-xs placeholder:text-muted-foreground/50 focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15"
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className={cn(
                                    'group/btn relative mt-1 h-12 w-full overflow-hidden rounded-xl text-sm font-semibold',
                                    'bg-gradient-to-r from-brand-blue via-brand-blue to-brand-cyan',
                                    'shadow-lg shadow-brand-blue/25 transition-all',
                                    'hover:shadow-xl hover:shadow-brand-blue/30 hover:brightness-105',
                                )}
                                tabIndex={5}
                                data-test="register-user-button"
                                disabled={processing}
                            >
                                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                                {processing ? (
                                    <>
                                        <Spinner />
                                        <span>Memproses…</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Buat akun</span>
                                        <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                                    </>
                                )}
                            </Button>

                            {googleUrl && (
                                <>
                                    <a
                                        href={googleUrl}
                                        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border/60 bg-background text-sm font-semibold text-brand-navy shadow-xs transition-all hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue"
                                    >
                                        <GoogleMark className="size-4" />
                                        <span>Daftar dengan Google</span>
                                    </a>
                                    <InputError message={errors.google} />
                                </>
                            )}
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Sudah punya akun?{' '}
                            <TextLink href={loginUrl} tabIndex={6}>
                                Masuk
                            </TextLink>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

// The register pages render their own mode-specific heading (chooser vs form),
// so the shared auth layout heading is left empty to avoid a duplicate title.
Register.layout = {
    title: '',
    description: '',
};
