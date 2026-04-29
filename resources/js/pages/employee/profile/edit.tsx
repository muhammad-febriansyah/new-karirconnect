import { Head, useForm } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Employee/ProfileController';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';

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
    expected_salary_min: number | null;
    expected_salary_max: number | null;
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
    provinces: Array<{ id: number; name: string }>;
    cities: City[];
    genderOptions: Option[];
    experienceLevelOptions: Option[];
    visibilityOptions: Option[];
};

export default function EmployeeProfileEdit({
    profile,
    provinces,
    cities,
    genderOptions,
    experienceLevelOptions,
    visibilityOptions,
}: Props) {
    const form = useForm({
        headline: profile.headline ?? '',
        about: profile.about ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        gender: profile.gender ?? '',
        province_id: profile.province_id ? String(profile.province_id) : '',
        city_id: profile.city_id ? String(profile.city_id) : '',
        current_position: profile.current_position ?? '',
        expected_salary_min: profile.expected_salary_min ? String(profile.expected_salary_min) : '',
        expected_salary_max: profile.expected_salary_max ? String(profile.expected_salary_max) : '',
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

    return (
        <>
            <Head title="Profil Kandidat" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Profil Kandidat"
                    description="Lengkapi profil dasar agar lamaran dan talent profile Anda lebih mudah ditemukan recruiter."
                />

                <Section>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.submit(ProfileController.update());
                        }}
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <InputField
                            label="Headline"
                            value={form.data.headline}
                            onChange={(event) => form.setData('headline', event.target.value)}
                            error={form.errors.headline}
                            placeholder="Backend Engineer | Laravel | React"
                        />
                        <InputField
                            label="Posisi Saat Ini"
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

                        <InputField
                            label="Ekspektasi Gaji Minimum"
                            type="number"
                            value={form.data.expected_salary_min}
                            onChange={(event) => form.setData('expected_salary_min', event.target.value)}
                            error={form.errors.expected_salary_min}
                            placeholder="6000000"
                        />
                        <InputField
                            label="Ekspektasi Gaji Maksimum"
                            type="number"
                            value={form.data.expected_salary_max}
                            onChange={(event) => form.setData('expected_salary_max', event.target.value)}
                            error={form.errors.expected_salary_max}
                            placeholder="10000000"
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
