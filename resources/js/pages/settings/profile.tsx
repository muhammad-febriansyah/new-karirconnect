import { Form, Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    Camera,
    KeyRound,
    Languages,
    LockKeyhole,
    Mail,
    MapPin,
    Phone,
    Save,
    ShieldCheck,
    Upload,
    UserRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentType, FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { edit, update } from '@/routes/profile';
import { update as updatePassword } from '@/routes/user-password';
import { send } from '@/routes/verification';
import type { SharedPageProps } from '@/types';

type FieldShellProps = {
    icon: ComponentType<{ className?: string }>;
    label: string;
    htmlFor: string;
    error?: string;
    children: ReactNode;
    className?: string;
};

function FieldShell({
    icon: Icon,
    label,
    htmlFor,
    error,
    children,
    className,
}: FieldShellProps) {
    return (
        <div className={className}>
            <Label
                htmlFor={htmlFor}
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-navy"
            >
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-brand-blue/8 text-brand-blue">
                    <Icon className="size-4" />
                </span>
                {label}
            </Label>
            {children}
            <InputError className="mt-1.5" message={error} />
        </div>
    );
}

const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    employer: 'Perekrut',
    employee: 'Pencari kerja',
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedPageProps>().props;
    const user = auth.user;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const passwordInput = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const form = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        address: user?.address ?? '',
        locale: user?.locale ?? 'id',
        avatar: null as File | null,
    });

    useEffect(() => {
        return () => {
            if (avatarPreview) {
                URL.revokeObjectURL(avatarPreview);
            }
        };
    }, [avatarPreview]);

    const avatarSrc = avatarPreview ?? user?.avatar_url ?? null;
    const initials = (user?.name ?? 'U')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();

    const handleAvatarChange = (file: File | null) => {
        if (!file) {
            return;
        }

        const maxSize = 2 * 1024 * 1024;

        if (!file.type.startsWith('image/')) {
            toast.error('File tidak valid', {
                description: 'Avatar harus berupa file gambar.',
            });

            return;
        }

        if (file.size > maxSize) {
            toast.error('Ukuran terlalu besar', {
                description: 'Maksimal ukuran avatar adalah 2MB.',
            });

            return;
        }

        if (avatarPreview) {
            URL.revokeObjectURL(avatarPreview);
        }

        setAvatarPreview(URL.createObjectURL(file));
        form.setData('avatar', file);
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        form.post(update.url(), {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    if (!user) {
        return null;
    }

    return (
        <>
            <Head title="Pengaturan profil" />

            <h1 className="sr-only">Pengaturan profil</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Informasi profil"
                    description="Perbarui data akun sesuai tabel pengguna"
                />

                <form
                    onSubmit={submit}
                    className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
                >
                    <div className="border-b border-border/70 bg-gradient-to-r from-brand-blue/8 via-brand-cyan/8 to-transparent px-5 py-5">
                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative shrink-0">
                                    <Avatar className="size-24 border-4 border-background shadow-md ring-1 ring-brand-blue/15">
                                        <AvatarImage
                                            src={avatarSrc ?? undefined}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-cyan text-xl font-bold text-white">
                                            {initials || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className="absolute -right-1 -bottom-1 inline-flex size-9 items-center justify-center rounded-full border-2 border-background bg-brand-blue text-white shadow transition hover:bg-brand-blue/90"
                                        aria-label="Ganti avatar"
                                    >
                                        <Camera className="size-4" />
                                    </button>
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-lg font-bold text-brand-navy">
                                        {user.name}
                                    </p>
                                    <p className="truncate text-sm text-muted-foreground">
                                        {user.email}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Avatar mendukung PNG, JPG, atau WebP
                                        dengan ukuran maksimal 2MB.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                        handleAvatarChange(
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="bg-background"
                                >
                                    <Upload className="mr-2 size-4" />
                                    Ganti avatar
                                </Button>
                                <InputError
                                    className="mt-2"
                                    message={form.errors.avatar}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 p-5 md:grid-cols-2">
                        <FieldShell
                            icon={UserRound}
                            label="Nama"
                            htmlFor="name"
                            error={form.errors.name}
                        >
                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                                required
                                autoComplete="name"
                                placeholder="Nama lengkap"
                                className="h-11"
                            />
                        </FieldShell>

                        <FieldShell
                            icon={Mail}
                            label="Alamat email"
                            htmlFor="email"
                            error={form.errors.email}
                        >
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                                required
                                autoComplete="username"
                                placeholder="alamat@email.com"
                                className="h-11"
                            />
                        </FieldShell>

                        <FieldShell
                            icon={Phone}
                            label="Nomor telepon"
                            htmlFor="phone"
                            error={form.errors.phone}
                        >
                            <Input
                                id="phone"
                                value={form.data.phone}
                                onChange={(e) =>
                                    form.setData('phone', e.target.value)
                                }
                                autoComplete="tel"
                                placeholder="08xxxxxxxxxx"
                                className="h-11"
                            />
                        </FieldShell>

                        <FieldShell
                            icon={Languages}
                            label="Bahasa"
                            htmlFor="locale"
                            error={form.errors.locale}
                        >
                            <select
                                id="locale"
                                value={form.data.locale}
                                onChange={(e) =>
                                    form.setData(
                                        'locale',
                                        e.target.value as 'id' | 'en',
                                    )
                                }
                                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <option value="id">
                                    Bahasa Indonesia (id)
                                </option>
                                <option value="en">Bahasa Inggris (en)</option>
                            </select>
                        </FieldShell>

                        <FieldShell
                            icon={ShieldCheck}
                            label="Peran"
                            htmlFor="role"
                        >
                            <Input
                                id="role"
                                value={roleLabels[user.role] ?? user.role}
                                readOnly
                                className="h-11 bg-muted/50 text-muted-foreground"
                            />
                        </FieldShell>

                        <FieldShell
                            icon={ShieldCheck}
                            label="Status akun"
                            htmlFor="is_active"
                        >
                            <Input
                                id="is_active"
                                value={
                                    user.is_active === false
                                        ? 'Tidak aktif'
                                        : 'Aktif'
                                }
                                readOnly
                                className="h-11 bg-muted/50 text-muted-foreground"
                            />
                        </FieldShell>

                        <FieldShell
                            icon={MapPin}
                            label="Alamat"
                            htmlFor="address"
                            error={form.errors.address}
                            className="md:col-span-2"
                        >
                            <Textarea
                                id="address"
                                value={form.data.address}
                                onChange={(e) =>
                                    form.setData('address', e.target.value)
                                }
                                placeholder="Alamat lengkap"
                                rows={4}
                                className="resize-none"
                            />
                        </FieldShell>

                        {mustVerifyEmail && user.email_verified_at === null && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 md:col-span-2">
                                Alamat email Anda belum diverifikasi.{' '}
                                <Link
                                    href={send()}
                                    as="button"
                                    className="font-semibold underline underline-offset-4"
                                >
                                    Kirim ulang email verifikasi.
                                </Link>
                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 font-medium">
                                        Tautan verifikasi baru sudah dikirim ke
                                        email Anda.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            {form.progress
                                ? `Mengunggah avatar... ${form.progress.percentage}%`
                                : 'Perubahan akan disimpan ke profil akun Anda.'}
                        </p>
                        <Button
                            disabled={form.processing}
                            data-test="update-profile-button"
                            className="w-full sm:w-auto"
                        >
                            <Save className="mr-2 size-4" />
                            Simpan perubahan
                        </Button>
                    </div>
                </form>

                <div className="space-y-3">
                    <Heading
                        variant="small"
                        title="Ubah kata sandi"
                        description="Gunakan kata sandi baru yang kuat untuk menjaga keamanan akun Anda"
                    />

                    <Form
                        action={updatePassword()}
                        options={{
                            preserveScroll: true,
                        }}
                        resetOnError={[
                            'current_password',
                            'password',
                            'password_confirmation',
                        ]}
                        resetOnSuccess
                        onError={(errors) => {
                            if (errors.current_password) {
                                currentPasswordInput.current?.focus();
                            }

                            if (errors.password) {
                                passwordInput.current?.focus();
                            }
                        }}
                        className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
                    >
                        {({ errors, processing }) => (
                            <>
                                <div className="border-b border-border/70 bg-gradient-to-r from-brand-navy/6 via-brand-blue/6 to-transparent px-5 py-5">
                                    <div className="flex items-start gap-4">
                                        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                            <LockKeyhole className="size-5" />
                                        </span>
                                        <div>
                                            <p className="font-bold text-brand-navy">
                                                Keamanan akun
                                            </p>
                                            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                                Setelah kata sandi diganti,
                                                gunakan kata sandi baru saat
                                                login berikutnya.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-5 p-5 md:grid-cols-2">
                                    <FieldShell
                                        icon={LockKeyhole}
                                        label="Kata sandi saat ini"
                                        htmlFor="current_password"
                                        error={errors.current_password}
                                    >
                                        <PasswordInput
                                            id="current_password"
                                            ref={currentPasswordInput}
                                            name="current_password"
                                            autoComplete="current-password"
                                            placeholder="Masukkan kata sandi saat ini"
                                            className="h-11"
                                        />
                                    </FieldShell>

                                    <FieldShell
                                        icon={KeyRound}
                                        label="Kata sandi baru"
                                        htmlFor="password"
                                        error={errors.password}
                                    >
                                        <PasswordInput
                                            id="password"
                                            ref={passwordInput}
                                            name="password"
                                            autoComplete="new-password"
                                            placeholder="Masukkan kata sandi baru"
                                            className="h-11"
                                        />
                                    </FieldShell>

                                    <FieldShell
                                        icon={KeyRound}
                                        label="Konfirmasi kata sandi baru"
                                        htmlFor="password_confirmation"
                                        error={errors.password_confirmation}
                                        className="md:col-span-2"
                                    >
                                        <PasswordInput
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                            placeholder="Ulangi kata sandi baru"
                                            className="h-11"
                                        />
                                    </FieldShell>
                                </div>

                                <div className="flex flex-col gap-3 border-t border-border/70 bg-muted/25 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Form akan dikosongkan otomatis setelah
                                        kata sandi berhasil diperbarui.
                                    </p>
                                    <Button
                                        disabled={processing}
                                        data-test="update-password-button"
                                        className="w-full sm:w-auto"
                                    >
                                        <Save className="mr-2 size-4" />
                                        Simpan kata sandi
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'Pengaturan profil',
            href: edit(),
        },
    ],
};
