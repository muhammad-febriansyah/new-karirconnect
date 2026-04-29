import { Head, useForm } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import type { RouteDefinition } from '@/wayfinder';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';

type SelectOption = {
    value: string;
    label: string;
    province_id?: number;
};

type JobRecord = {
    id: number;
    job_category_id: number;
    title: string;
    slug: string;
    description: string | null;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
    employment_type: string | null;
    work_arrangement: string | null;
    experience_level: string | null;
    min_education: string | null;
    salary_min: number | null;
    salary_max: number | null;
    is_salary_visible: boolean;
    province_id: number | null;
    city_id: number | null;
    status: string | null;
    application_deadline: string | null;
    is_anonymous: boolean;
    is_featured: boolean;
    ai_match_threshold: number | null;
    auto_invite_ai_interview: boolean;
    skill_ids: number[];
};

type Options = {
    jobCategories: SelectOption[];
    skills: SelectOption[];
    provinces: SelectOption[];
    cities: SelectOption[];
    employmentTypes: SelectOption[];
    workArrangements: SelectOption[];
    experienceLevels: SelectOption[];
    educationLevels: SelectOption[];
    statusOptions: SelectOption[];
};

type Props = {
    headTitle: string;
    title: string;
    description: string;
    submitLabel: string;
    action: RouteDefinition<'post' | 'put' | 'patch'>;
    options: Options;
    job?: JobRecord | null;
};

export function EmployerJobForm({ headTitle, title, description, submitLabel, action, options, job = null }: Props) {
    const form = useForm({
        job_category_id: job?.job_category_id ? String(job.job_category_id) : '',
        title: job?.title ?? '',
        slug: job?.slug ?? '',
        description: job?.description ?? '',
        responsibilities: job?.responsibilities ?? '',
        requirements: job?.requirements ?? '',
        benefits: job?.benefits ?? '',
        employment_type: job?.employment_type ?? 'full_time',
        work_arrangement: job?.work_arrangement ?? 'hybrid',
        experience_level: job?.experience_level ?? 'mid',
        min_education: job?.min_education ?? '',
        salary_min: job?.salary_min ? String(job.salary_min) : '',
        salary_max: job?.salary_max ? String(job.salary_max) : '',
        is_salary_visible: job?.is_salary_visible ?? true,
        province_id: job?.province_id ? String(job.province_id) : '',
        city_id: job?.city_id ? String(job.city_id) : '',
        status: job?.status ?? 'draft',
        application_deadline: job?.application_deadline ?? '',
        is_anonymous: job?.is_anonymous ?? false,
        is_featured: job?.is_featured ?? false,
        ai_match_threshold: job?.ai_match_threshold ? String(job.ai_match_threshold) : '',
        auto_invite_ai_interview: job?.auto_invite_ai_interview ?? false,
        skill_ids: job?.skill_ids.map(String) ?? [],
    });

    const cityOptions = options.cities.filter((city) => !form.data.province_id || String(city.province_id) === form.data.province_id);

    return (
        <>
            <Head title={headTitle} />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader title={title} description={description} />

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.submit(action, {
                            preserveScroll: true,
                        });
                    }}
                    className="space-y-6"
                >
                    <Section title="Informasi Dasar">
                        <div className="grid gap-5 md:grid-cols-2">
                            <InputField
                                label="Judul Lowongan"
                                required
                                value={form.data.title}
                                onChange={(event) => form.setData('title', event.target.value)}
                                error={form.errors.title}
                            />
                            <InputField
                                label="Slug"
                                value={form.data.slug}
                                onChange={(event) => form.setData('slug', event.target.value)}
                                error={form.errors.slug}
                            />
                            <SelectField
                                label="Kategori"
                                value={form.data.job_category_id}
                                onValueChange={(value) => form.setData('job_category_id', value)}
                                options={options.jobCategories}
                                error={form.errors.job_category_id}
                            />
                            <SelectField
                                label="Status"
                                value={form.data.status}
                                onValueChange={(value) => form.setData('status', value)}
                                options={options.statusOptions}
                                error={form.errors.status}
                            />
                            <SelectField
                                label="Tipe Kerja"
                                value={form.data.employment_type}
                                onValueChange={(value) => form.setData('employment_type', value)}
                                options={options.employmentTypes}
                                error={form.errors.employment_type}
                            />
                            <SelectField
                                label="Pengaturan Kerja"
                                value={form.data.work_arrangement}
                                onValueChange={(value) => form.setData('work_arrangement', value)}
                                options={options.workArrangements}
                                error={form.errors.work_arrangement}
                            />
                            <SelectField
                                label="Level Pengalaman"
                                value={form.data.experience_level}
                                onValueChange={(value) => form.setData('experience_level', value)}
                                options={options.experienceLevels}
                                error={form.errors.experience_level}
                            />
                            <SelectField
                                label="Pendidikan Minimum"
                                value={form.data.min_education}
                                onValueChange={(value) => form.setData('min_education', value)}
                                options={options.educationLevels}
                                error={form.errors.min_education}
                            />
                            <InputField
                                label="Deadline Lamaran"
                                type="date"
                                value={form.data.application_deadline}
                                onChange={(event) => form.setData('application_deadline', event.target.value)}
                                error={form.errors.application_deadline}
                            />
                            <InputField
                                label="Ambang AI Match"
                                type="number"
                                value={form.data.ai_match_threshold}
                                onChange={(event) => form.setData('ai_match_threshold', event.target.value)}
                                error={form.errors.ai_match_threshold}
                            />
                        </div>
                    </Section>

                    <Section title="Deskripsi">
                        <div className="space-y-5">
                            <TextareaField
                                label="Deskripsi"
                                rows={5}
                                value={form.data.description}
                                onChange={(event) => form.setData('description', event.target.value)}
                                error={form.errors.description}
                            />
                            <TextareaField
                                label="Tanggung Jawab"
                                rows={4}
                                value={form.data.responsibilities}
                                onChange={(event) => form.setData('responsibilities', event.target.value)}
                                error={form.errors.responsibilities}
                            />
                            <TextareaField
                                label="Persyaratan"
                                rows={4}
                                value={form.data.requirements}
                                onChange={(event) => form.setData('requirements', event.target.value)}
                                error={form.errors.requirements}
                            />
                            <TextareaField
                                label="Benefit"
                                rows={4}
                                value={form.data.benefits}
                                onChange={(event) => form.setData('benefits', event.target.value)}
                                error={form.errors.benefits}
                            />
                        </div>
                    </Section>

                    <Section title="Lokasi & Kompensasi">
                        <div className="grid gap-5 md:grid-cols-2">
                            <InputField
                                label="Gaji Minimum"
                                type="number"
                                value={form.data.salary_min}
                                onChange={(event) => form.setData('salary_min', event.target.value)}
                                error={form.errors.salary_min}
                            />
                            <InputField
                                label="Gaji Maksimum"
                                type="number"
                                value={form.data.salary_max}
                                onChange={(event) => form.setData('salary_max', event.target.value)}
                                error={form.errors.salary_max}
                            />
                            <SelectField
                                label="Provinsi"
                                value={form.data.province_id}
                                onValueChange={(value) => {
                                    form.setData('province_id', value);
                                    form.setData('city_id', '');
                                }}
                                options={options.provinces}
                                error={form.errors.province_id}
                            />
                            <SelectField
                                label="Kota"
                                value={form.data.city_id}
                                onValueChange={(value) => form.setData('city_id', value)}
                                options={cityOptions}
                                error={form.errors.city_id}
                            />
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_salary_visible}
                                    onChange={(event) => form.setData('is_salary_visible', event.target.checked)}
                                    className="size-4 rounded border-input"
                                />
                                Tampilkan rentang gaji
                            </label>
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_anonymous}
                                    onChange={(event) => form.setData('is_anonymous', event.target.checked)}
                                    className="size-4 rounded border-input"
                                />
                                Sembunyikan identitas perusahaan
                            </label>
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_featured}
                                    onChange={(event) => form.setData('is_featured', event.target.checked)}
                                    className="size-4 rounded border-input"
                                />
                                Tandai sebagai featured
                            </label>
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.data.auto_invite_ai_interview}
                                    onChange={(event) => form.setData('auto_invite_ai_interview', event.target.checked)}
                                    className="size-4 rounded border-input"
                                />
                                Auto invite AI interview
                            </label>
                        </div>
                    </Section>

                    <Section title="Skill">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {options.skills.map((skill) => {
                                const checked = form.data.skill_ids.includes(skill.value);

                                return (
                                    <label key={skill.value} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) =>
                                                form.setData(
                                                    'skill_ids',
                                                    event.target.checked
                                                        ? [...form.data.skill_ids, skill.value]
                                                        : form.data.skill_ids.filter((item) => item !== skill.value),
                                                )
                                            }
                                            className="size-4 rounded border-input"
                                        />
                                        {skill.label}
                                    </label>
                                );
                            })}
                        </div>
                    </Section>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
