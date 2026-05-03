import { Form, Head } from '@inertiajs/react';
import { ArrowRight, AtSign, KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <>
            <Head title="Log in" />

            {status && (
                <div className="mb-5 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 text-center text-sm font-medium text-emerald-700">
                    {status}
                </div>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="email"
                                    className="text-xs font-semibold uppercase tracking-wider text-brand-navy/80"
                                >
                                    Alamat Email
                                </Label>
                                <div className="relative">
                                    <AtSign className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoFocus
                                        tabIndex={1}
                                        autoComplete="email"
                                        placeholder="kamu@perusahaan.com"
                                        className={cn(
                                            'h-12 rounded-xl border-border/60 bg-background pl-11 text-sm shadow-sm',
                                            'transition-all duration-150',
                                            'placeholder:text-muted-foreground/50',
                                            'focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15',
                                            'hover:border-border',
                                        )}
                                    />
                                </div>
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label
                                        htmlFor="password"
                                        className="text-xs font-semibold uppercase tracking-wider text-brand-navy/80"
                                    >
                                        Kata Sandi
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="text-xs font-medium text-brand-blue hover:text-brand-blue/80"
                                            tabIndex={5}
                                        >
                                            Lupa kata sandi?
                                        </TextLink>
                                    )}
                                </div>
                                <div className="relative">
                                    <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        required
                                        tabIndex={2}
                                        autoComplete="current-password"
                                        placeholder="Masukkan kata sandi"
                                        className={cn(
                                            'h-12 rounded-xl border-border/60 bg-background pl-11 text-sm shadow-sm',
                                            'transition-all duration-150',
                                            'placeholder:text-muted-foreground/50',
                                            'focus-visible:border-brand-blue/60 focus-visible:ring-4 focus-visible:ring-brand-blue/15',
                                            'hover:border-border',
                                        )}
                                    />
                                </div>
                                <InputError message={errors.password} />
                            </div>

                            <label
                                htmlFor="remember"
                                className={cn(
                                    'group flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3',
                                    'transition-all hover:border-brand-blue/30 hover:bg-brand-blue/5',
                                    'has-[[data-state=checked]]:border-brand-blue/40 has-[[data-state=checked]]:bg-brand-blue/8',
                                )}
                            >
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                    className="data-[state=checked]:border-brand-blue data-[state=checked]:bg-brand-blue"
                                />
                                <div className="flex flex-col leading-tight">
                                    <span className="text-sm font-medium text-brand-navy">
                                        Ingat saya di perangkat ini
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        Tetap masuk selama 30 hari ke depan.
                                    </span>
                                </div>
                            </label>

                            <Button
                                type="submit"
                                className={cn(
                                    'group/btn relative mt-1 h-12 w-full overflow-hidden rounded-xl text-sm font-semibold',
                                    'bg-gradient-to-r from-brand-blue via-brand-blue to-brand-cyan',
                                    'shadow-lg shadow-brand-blue/25 transition-all',
                                    'hover:shadow-xl hover:shadow-brand-blue/30 hover:brightness-105',
                                    'active:scale-[0.99]',
                                )}
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity group-hover/btn:opacity-100" />
                                {processing ? (
                                    <>
                                        <Spinner />
                                        <span>Memproses…</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Masuk ke akun</span>
                                        <ArrowRight className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
                                    </>
                                )}
                            </Button>
                        </div>

                        {canRegister && (
                            <>
                                <div className="relative my-1 flex items-center gap-3">
                                    <span className="h-px flex-1 bg-border/60" />
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                                        atau
                                    </span>
                                    <span className="h-px flex-1 bg-border/60" />
                                </div>
                                <p className="text-center text-sm text-muted-foreground">
                                    Belum punya akun?{' '}
                                    <TextLink
                                        href={register()}
                                        className="font-semibold text-brand-blue hover:text-brand-blue/80"
                                        tabIndex={5}
                                    >
                                        Daftar sekarang
                                    </TextLink>
                                </p>
                            </>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Masuk ke akun Anda',
    description: 'Masukkan email dan kata sandi untuk melanjutkan ke dashboard Anda.',
};
