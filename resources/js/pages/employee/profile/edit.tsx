import { Head, useForm } from '@inertiajs/react';
import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Employee/ProfileController';
import { ProfileTabs } from '@/components/employee/profile-tabs';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import InputError from '@/components/input-error';

type Option = {
    value: string;
    label: string;
};

type Profile = {
    headline: string | null;
    about: string | null;
    date_of_birth: string | null;
    gender: string | null;
    province_id: number | null;
    city_id: number | null;
    current_position: string | null;
    experience_level: string | null;
    portfolio_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    is_open_to_work: boolean;
    visibility: string;
};

type City = {
    id: number;
    province_id: number;
    name: string;
};

type Props = {
    profile: Profile;
    avatarUrl: string | null;
    provinces: Array<{ id: number; name: string }>;
    cities: City[];
    genderOptions: Option[];
    experienceLevelOptions: Option[];
    visibilityOptions: Option[];
};

export default function EmployeeProfileEdit({
    profile,
    avatarUrl,
    provinces,
    cities,
    genderOptions,
    experienceLevelOptions,
    visibilityOptions,
}: Props) {
    const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const form = useForm<{
        avatar: File | null;
        headline: string;
        about: string;
        date_of_birth: string;
        gender: string;
        province_id: string;
        city_id: string;
        current_position: string;
        experience_level: string;
        portfolio_url: string;
        linkedin_url: string;
        github_url: string;
        is_open_to_work: boolean;
        visibility: string;
    }>({
        avatar: null,
        headline: profile.headline ?? '',
        about: profile.about ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        gender: profile.gender ?? '',
        province_id: profile.province_id ? String(profile.province_id) : '',
        city_id: profile.city_id ? String(profile.city_id) : '',
        current_position: profile.current_position ?? '',
        experience_level: profile.experience_level ?? '',
        portfolio_url: profile.portfolio_url ?? '',
        linkedin_url: profile.linkedin_url ?? '',
        github_url: profile.github_url ?? '',
        is_open_to_work: profile.is_open_to_work,
        visibility: profile.visibility,
    });

    const cityOptions = cities
        .filter((city) => !form.data.province_id || String(city.province_id) === form.data.province_id)
        .map((city) => ({
            value: String(city.id),
            label: city.name,
        }));

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        form.setData('avatar', file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    return (
        <>
            <Head title="Profil Kandidat" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Profil Kandidat"
                    description="Lengkapi profil dasar agar lamaran dan talent profile Anda lebih mudah ditemukan recruiter."
                />
                <ProfileTabs />

                <Section>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.submit(ProfileController.update());
                        }}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <div className="md:col-span-2 flex items-center gap-5 rounded-md border p-4">
                            <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-border">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Foto profil" className="size-full object-cover" />
                                ) : (
                                    <Camera className="size-7 text-muted-foreground" />
                                )}
                            </span>
                            <div className="space-y-2">
                                <span className="block text-sm font-medium">Foto Profil</span>
                                <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
                                    <Camera className="size-4" /> {avatarPreview ? 'Ganti foto' : 'Unggah foto'}
                                </Button>
                                <p className="text-xs text-muted-foreground">JPG, PNG, atau WEBP. Maks 4 MB.</p>
                                <InputError message={form.errors.avatar} />
                            </div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        <InputField
                            label="Headline"
                            value={form.data.headline}
                            onChange={(event) => form.setData('headline', event.target.value)}
                            error={form.errors.headline}
                            placeholder="Backend Engineer | Laravel | React"
                        />
                        <InputField
                            label="Posisi Saat Ini (jika sedang aktif bekerja)"
                            description="Kosongkan jika Anda sedang tidak aktif bekerja."
                            value={form.data.current_position}
                            onChange={(event) => form.setData('current_position', event.target.value)}
                            error={form.errors.current_position}
                            placeholder="Backend Engineer"
                        />

                        <div className="md:col-span-2">
                            <TextareaField
                                label="Tentang Saya"
                                value={form.data.about}
                                onChange={(event) => form.setData('about', event.target.value)}
                                error={form.errors.about}
                                rows={5}
                                placeholder="Ringkas pengalaman, fokus skill, dan tujuan karir Anda."
                            />
                        </div>

                        <InputField
                            label="Tanggal Lahir"
                            type="date"
                            value={form.data.date_of_birth}
                            onChange={(event) => form.setData('date_of_birth', event.target.value)}
                            error={form.errors.date_of_birth}
                        />
                        <SelectField
                            label="Gender"
                            value={form.data.gender}
                            onValueChange={(value) => form.setData('gender', value)}
                            options={genderOptions}
                            error={form.errors.gender}
                        />

                        <SelectField
                            label="Provinsi"
                            value={form.data.province_id}
                            onValueChange={(value) => {
                                form.setData('province_id', value);
                                form.setData('city_id', '');
                            }}
                            options={provinces.map((province) => ({
                                value: String(province.id),
                                label: province.name,
                            }))}
                            error={form.errors.province_id}
                        />
                        <SelectField
                            label="Kota"
                            value={form.data.city_id}
                            onValueChange={(value) => form.setData('city_id', value)}
                            options={cityOptions}
                            error={form.errors.city_id}
                        />

                        <SelectField
                            label="Level Pengalaman"
                            value={form.data.experience_level}
                            onValueChange={(value) => form.setData('experience_level', value)}
                            options={experienceLevelOptions}
                            error={form.errors.experience_level}
                        />
                        <SelectField
                            label="Visibilitas"
                            value={form.data.visibility}
                            onValueChange={(value) => form.setData('visibility', value)}
                            options={visibilityOptions}
                            error={form.errors.visibility}
                        />

                        <InputField
                            label="Portfolio URL"
                            type="url"
                            value={form.data.portfolio_url}
                            onChange={(event) => form.setData('portfolio_url', event.target.value)}
                            error={form.errors.portfolio_url}
                        />
                        <InputField
                            label="LinkedIn URL"
                            type="url"
                            value={form.data.linkedin_url}
                            onChange={(event) => form.setData('linkedin_url', event.target.value)}
                            error={form.errors.linkedin_url}
                        />
                        <InputField
                            label="GitHub URL"
                            type="url"
                            value={form.data.github_url}
                            onChange={(event) => form.setData('github_url', event.target.value)}
                            error={form.errors.github_url}
                        />

                        <div className="md:col-span-2">
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_open_to_work}
                                    onChange={(event) => form.setData('is_open_to_work', event.target.checked)}
                                    className="size-4 rounded border-input"
                                />
                                <span className="text-sm">Terbuka untuk peluang kerja baru</span>
                            </label>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                Simpan Profil
                            </Button>
                        </div>
                    </form>
                </Section>
            </div>
        </>
    );
}

EmployeeProfileEdit.layout = {
    breadcrumbs: [
        {
            title: 'Profil Kandidat',
            href: ProfileController.edit().url,
        },
    ],
};
