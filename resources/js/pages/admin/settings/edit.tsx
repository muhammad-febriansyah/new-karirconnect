import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent } from 'react';
import { FileUploadField } from '@/components/form/file-upload-field';
import { FormField } from '@/components/form/form-field';
import { ImageUploadField } from '@/components/form/image-upload-field';
import { InputField } from '@/components/form/input-field';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function AdminSettingsEdit({ currentGroup, groups, settings }: Props) {
    const initialValues: Record<string, string | number | boolean | null> = {};
    for (const s of settings) {
        if (s.type === 'file') continue;
        initialValues[s.key] = s.value as string | number | boolean | null;
    }

    const form = useForm<FormShape>({
        group: currentGroup,
        values: initialValues,
        files: {},
    });

    const setValue = (key: string, value: string | number | boolean | null) => {
        form.setData('values', { ...form.data.values, [key]: value });
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
                    <Section
                        title={groups.find((g) => g.key === currentGroup)?.label ?? 'Pengaturan'}
                        description="Field bertanda Public akan dipakai di seluruh frontend (logo, meta, dll)."
                    >
                        <div className="grid gap-5 md:grid-cols-2">
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

                    <div className="flex justify-end gap-2">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            Simpan Pengaturan
                        </Button>
                    </div>
                </form>
            </div>
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
    const isImageGroup = ['logo_path', 'logo_dark_path', 'favicon_path', 'login_background_path', 'og_image_path'].includes(
        setting.key,
    );

    if (setting.type === 'bool') {
        return (
            <FormField
                label={setting.label}
                description={setting.description ?? undefined}
                error={error}
                className="md:col-span-2 flex flex-col gap-2"
            >
                <div className="flex items-center justify-between rounded-md border bg-muted/30 p-3">
                    <span className="text-sm text-muted-foreground">{setting.description}</span>
                    <Switch
                        checked={Boolean(value)}
                        onCheckedChange={(checked) => onValueChange(checked)}
                    />
                </div>
            </FormField>
        );
    }

    if (setting.type === 'file') {
        if (isImageGroup) {
            return (
                <ImageUploadField
                    label={setting.label}
                    description={setting.description ?? undefined}
                    error={error}
                    value={file}
                    existingUrl={setting.value_url}
                    onChange={onFileChange}
                />
            );
        }
        return (
            <FileUploadField
                label={setting.label}
                description={setting.description ?? undefined}
                error={error}
                value={file ?? (typeof setting.value === 'string' ? setting.value : null)}
                existingLabel={typeof setting.value === 'string' ? setting.value.split('/').pop() : undefined}
                onChange={onFileChange}
            />
        );
    }

    if (setting.type === 'text' && RICH_TEXT_KEYS[setting.key]) {
        return (
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
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
            <InputField
                label={setting.label}
                description={
                    value === '__keep__'
                        ? 'Sudah tersimpan. Kosongkan & ketik baru untuk mengganti.'
                        : (setting.description ?? undefined)
                }
                error={error}
                type="password"
                autoComplete="new-password"
                placeholder={value === '__keep__' ? '••••••••••••••••' : 'Masukkan secret…'}
                value={value === '__keep__' ? '' : ((value as string) ?? '')}
                onChange={(event) => onValueChange(event.target.value)}
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

