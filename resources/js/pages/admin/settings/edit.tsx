import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, Mail, Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { FileUploadField } from '@/components/form/file-upload-field';
import { FormField } from '@/components/form/form-field';
import { ImageUploadField } from '@/components/form/image-upload-field';
import { InputField } from '@/components/form/input-field';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { update as adminSettingsUpdate, group as adminSettingsGroupRoute } from '@/routes/admin/settings';

type SettingType = 'string' | 'text' | 'int' | 'float' | 'bool' | 'json' | 'file' | 'password';

type SettingItem = {
    key: string;
    type: SettingType;
    label: string;
    description: string | null;
    is_public: boolean;
    value: string | number | boolean | string[] | null;
    value_url: string | null;
};

type GroupOption = {
    key: string;
    label: string;
};

type Props = {
    currentGroup: string;
    groups: GroupOption[];
    settings: SettingItem[];
};

type FormShape = {
    group: string;
    values: Record<string, string | number | boolean | null>;
    files: Record<string, File | null>;
};

const RICH_TEXT_KEYS: Record<string, true> = {
    terms_body: true,
    privacy_body: true,
    cookie_body: true,
};

const GROUP_NOTES: Record<string, string> = {
    general: 'Atur identitas dasar aplikasi, kanal kontak, dan preferensi regional yang dipakai di seluruh platform.',
    branding: 'Kelola aset visual utama seperti logo, favicon, dan elemen branding publik lainnya.',
    seo: 'Tentukan metadata SEO, OG image, dan identitas pelacakan untuk halaman publik.',
    ai: 'Konfigurasikan provider AI, model, dan batas token untuk fitur coaching serta interview.',
    payment: 'Simpan kredensial dan endpoint gateway pembayaran yang dipakai saat checkout.',
    email: 'Atur pengiriman email sistem, alamat pengirim, dan detail SMTP.',
    security: 'Konfigurasikan proteksi anti-spam seperti Google reCAPTCHA v3 untuk form publik.',
    feature_flags: 'Aktifkan atau nonaktifkan fitur utama tanpa perlu deploy ulang.',
    legal: 'Kelola konten legal yang ditampilkan ke pengguna akhir.',
};

export default function AdminSettingsEdit({ currentGroup, groups, settings }: Props) {
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
    const initialValues: Record<string, string | number | boolean | null> = {};

    for (const s of settings) {
        if (s.type === 'file') {
            continue;
        }

        initialValues[s.key] = s.value as string | number | boolean | null;
    }

    const form = useForm<FormShape>({
        group: currentGroup,
        values: initialValues,
        files: {},
    });
    const testEmailForm = useForm<{ recipient_email: string }>({
        recipient_email: '',
    });

    const setValue = (key: string, value: string | number | boolean | null) => {
        form.setData('values', { ...form.data.values, [key]: value });
    };

    const submitTestEmail = (event: FormEvent) => {
        event.preventDefault();

        testEmailForm.post('/admin/settings/test-email', {
            preserveScroll: true,
            onSuccess: () => {
                setIsTestDialogOpen(false);
                testEmailForm.reset();
            },
        });
    };

    const setFile = (key: string, file: File | null) => {
        form.setData('files', { ...form.data.files, [key]: file });
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(adminSettingsUpdate().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setData('files', {});
            },
        });
    };

    return (
        <>
            <Head title="Pengaturan Sistem" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Pengaturan Sistem"
                    description="Kelola branding, SEO, integrasi AI, payment gateway, dan feature flag KarirConnect."
                    actions={currentGroup === 'email' ? (
                        <Button type="button" variant="outline" onClick={() => setIsTestDialogOpen(true)}>
                            <Mail className="size-4" />
                            Test Email
                        </Button>
                    ) : undefined}
                />

                <Tabs value={currentGroup}>
                    <TabsList className="flex w-full flex-wrap justify-start overflow-x-auto">
                        {groups.map((group) => (
                            <TabsTrigger key={group.key} value={group.key} asChild>
                                <Link href={adminSettingsGroupRoute(group.key).url} prefetch>
                                    {group.label}
                                </Link>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="overflow-hidden border-border/70 shadow-sm">
                        <CardHeader className="border-b bg-muted/20">
                            <CardTitle>{groups.find((g) => g.key === currentGroup)?.label ?? 'Pengaturan'}</CardTitle>
                            <CardDescription>
                                {GROUP_NOTES[currentGroup] ?? 'Kelola konfigurasi sistem pada grup ini.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 p-4 sm:p-6">
                            <Section
                                title="Konfigurasi"
                                description="Field bertanda public dipakai di seluruh frontend seperti branding, meta, dan kontak publik."
                            >
                                <div className="grid gap-5 xl:grid-cols-2">
                                    {settings.map((setting) => (
                                        <SettingControl
                                            key={setting.key}
                                            setting={setting}
                                            value={form.data.values[setting.key] ?? null}
                                            file={form.data.files[setting.key] ?? null}
                                            error={
                                                form.errors[`values.${setting.key}` as keyof typeof form.errors] as string | undefined
                                            }
                                            onValueChange={(v) => setValue(setting.key, v)}
                                            onFileChange={(f) => setFile(setting.key, f)}
                                        />
                                    ))}
                                </div>
                            </Section>
                        </CardContent>
                    </Card>

                    <div className="sticky bottom-4 z-10 flex justify-end">
                        <div className="flex items-center gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
                            <Button type="submit" disabled={form.processing} size="lg">
                                {form.processing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                Simpan Pengaturan
                            </Button>
                        </div>
                    </div>
                </form>
            </div>

            <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Test Email SMTP</DialogTitle>
                        <DialogDescription>
                            Masukkan alamat email tujuan untuk menguji konfigurasi email saat ini.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitTestEmail} className="space-y-4">
                        <InputField
                            label="Email Tujuan"
                            type="email"
                            required
                            placeholder="nama@domain.com"
                            value={testEmailForm.data.recipient_email}
                            onChange={(event) => testEmailForm.setData('recipient_email', event.target.value)}
                            error={testEmailForm.errors.recipient_email}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTestDialogOpen(false)}>
                                Batal
                            </Button>
                            <Button type="submit" disabled={testEmailForm.processing}>
                                {testEmailForm.processing ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                                Kirim Test
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function SettingControl({
    setting,
    value,
    file,
    error,
    onValueChange,
    onFileChange,
}: {
    setting: SettingItem;
    value: string | number | boolean | null;
    file: File | null;
    error?: string;
    onValueChange: (value: string | number | boolean | null) => void;
    onFileChange: (file: File | null) => void;
}) {
    const isImageGroup = ['logo_path', 'favicon_path', 'login_background_path', 'og_image_path'].includes(
        setting.key,
    );

    if (setting.type === 'bool') {
        const isOn = Boolean(value);

        return (
            <label
                className="group xl:col-span-2 flex cursor-pointer items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
            >
                <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium leading-none">{setting.label}</span>
                        <Badge
                            variant={isOn ? 'default' : 'outline'}
                            className="h-5 px-1.5 text-[10px] font-medium"
                        >
                            {isOn ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                    </div>
                    {setting.description && (
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                    )}
                    {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
                <Switch
                    checked={isOn}
                    onCheckedChange={(checked) => onValueChange(checked)}
                />
            </label>
        );
    }

    if (setting.type === 'file') {
        if (isImageGroup) {
            return (
                <div className="xl:col-span-2">
                    <ImageUploadField
                        label={setting.label}
                        description={setting.description ?? undefined}
                        error={error}
                        value={file}
                        existingUrl={setting.value_url}
                        onChange={onFileChange}
                    />
                </div>
            );
        }

        return (
            <div className="xl:col-span-2">
                <FileUploadField
                    label={setting.label}
                    description={setting.description ?? undefined}
                    error={error}
                    value={file ?? (typeof setting.value === 'string' ? setting.value : null)}
                    existingLabel={typeof setting.value === 'string' ? setting.value.split('/').pop() : undefined}
                    onChange={onFileChange}
                />
            </div>
        );
    }

    if (setting.type === 'text' && RICH_TEXT_KEYS[setting.key]) {
        return (
            <div className="xl:col-span-2">
                <RichTextEditor
                    label={setting.label}
                    description={setting.description ?? undefined}
                    error={error}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(html) => onValueChange(html)}
                />
            </div>
        );
    }

    if (setting.type === 'text') {
        return (
            <div className="xl:col-span-2">
                <TextareaField
                    label={setting.label}
                    description={setting.description ?? undefined}
                    error={error}
                    value={value === null || value === undefined ? '' : String(value)}
                    onChange={(event) => onValueChange(event.target.value)}
                    rows={4}
                    placeholder={`Contoh: ${setting.label}…`}
                />
            </div>
        );
    }

    if (setting.type === 'password') {
        return (
            <PasswordSettingField
                label={setting.label}
                description={setting.description ?? undefined}
                error={error}
                value={typeof value === 'string' ? value : ''}
                onChange={(next) => onValueChange(next)}
            />
        );
    }

    if (setting.type === 'int' || setting.type === 'float') {
        return (
            <InputField
                label={setting.label}
                description={setting.description ?? undefined}
                error={error}
                type="number"
                step={setting.type === 'float' ? '0.01' : '1'}
                value={value === null || value === undefined ? '' : String(value)}
                onChange={(event) => onValueChange(event.target.value === '' ? null : Number(event.target.value))}
                placeholder="0"
            />
        );
    }

    return (
        <InputField
            label={setting.label}
            description={setting.description ?? undefined}
            error={error}
            value={value === null || value === undefined ? '' : String(value)}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={`Masukkan ${setting.label.toLowerCase()}…`}
        />
    );
}

function PasswordSettingField({
    label,
    description,
    error,
    value,
    onChange,
}: {
    label: string;
    description?: string;
    error?: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <FormField label={label} description={description} error={error}>
            <div className="relative">
                <Input
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    spellCheck={false}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={`Masukkan ${label.toLowerCase()}…`}
                    className={cn(
                        'pr-10',
                        !visible && value.length > 0 && 'tracking-[0.2em]',
                    )}
                />
                <button
                    type="button"
                    onClick={() => setVisible((prev) => !prev)}
                    aria-label={visible ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                    tabIndex={-1}
                >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>
        </FormField>
    );
}
