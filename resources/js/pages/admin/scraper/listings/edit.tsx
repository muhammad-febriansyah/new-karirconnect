import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Info, Save } from 'lucide-react';
import { useMemo } from 'react';
import type { FormEvent } from 'react';
import ScrapedJobListingController from '@/actions/App/Http/Controllers/Admin/Scraper/ScrapedJobListingController';
import { DatePickerField } from '@/components/form/date-picker-field';
import { InputField } from '@/components/form/input-field';
import { MoneyInput } from '@/components/form/money-input';
import { RichTextEditor } from '@/components/form/rich-text-editor';
import { SelectField } from '@/components/form/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatDateTime } from '@/lib/format-date';
import type { Option } from '@/types/scraper';

type Listing = {
    id: number;
    title: string;
    company: string | null;
    job_category_id: string;
    employment_type: string;
    work_arrangement: string;
    experience_level: string;
    min_education: string;
    province_id: string;
    city_id: string;
    location_text: string;
    salary_min: number | null;
    salary_max: number | null;
    salary_currency: string;
    is_salary_visible: boolean;
    application_deadline: string | null;
    apply_url: string;
    contact_email: string;
    description: string;
    responsibilities: string;
    requirements: string;
    benefits: string;
    published_job: { slug: string; status: string | null } | null;
    edited_at: string | null;
    edited_by: string | null;
};

type Props = {
    listing: Listing;
    options: {
        categories: Option[];
        employmentTypes: Option[];
        workArrangements: Option[];
        experienceLevels: Option[];
        educationLevels: Option[];
        provinces: Option[];
        cities: Array<Option & { province_id: string }>;
    };
};

// Radix Select cannot hold an empty value, so "none" stands for "not set".
const NONE = 'none';
const withNone = (options: Option[], label = 'Tidak disebut') => [
    { value: NONE, label },
    ...options,
];
const toSelect = (value: string) => (value === '' ? NONE : value);
const fromSelect = (value: string) => (value === NONE ? '' : value);

export default function EditExternalListing({ listing, options }: Props) {
    const form = useForm({
        title: listing.title,
        job_category_id: listing.job_category_id,
        employment_type: listing.employment_type,
        work_arrangement: listing.work_arrangement,
        experience_level: listing.experience_level,
        min_education: listing.min_education,
        province_id: listing.province_id,
        city_id: listing.city_id,
        location_text: listing.location_text,
        salary_min: listing.salary_min,
        salary_max: listing.salary_max,
        salary_currency: listing.salary_currency,
        is_salary_visible: listing.is_salary_visible,
        application_deadline: listing.application_deadline ?? '',
        apply_url: listing.apply_url,
        contact_email: listing.contact_email,
        description: listing.description,
        responsibilities: listing.responsibilities,
        requirements: listing.requirements,
        benefits: listing.benefits,
    });
    const { data, setData, errors, processing } = form;

    const cities = useMemo(
        () =>
            options.cities.filter(
                (city) =>
                    data.province_id === '' ||
                    city.province_id === data.province_id,
            ),
        [options.cities, data.province_id],
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(ScrapedJobListingController.update(listing.id).url, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Edit ${listing.title}`} />

            <form onSubmit={submit} className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Edit lowongan"
                    description={
                        listing.company
                            ? `${listing.company} · data hasil scrape`
                            : 'Data hasil scrape'
                    }
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link
                                    href={
                                        ScrapedJobListingController.show(
                                            listing.id,
                                        ).url
                                    }
                                >
                                    <ArrowLeft className="size-4" /> Batal
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Save className="size-4" />{' '}
                                {processing ? 'Menyimpan…' : 'Simpan'}
                            </Button>
                        </>
                    }
                />

                <Alert>
                    <Info className="size-4" />
                    <AlertDescription>
                        Setelah disimpan, crawl berikutnya tidak lagi menimpa
                        isi lowongan ini.
                        {listing.published_job &&
                            ' Lowongan ini sudah tayang di portal; perubahan juga diterapkan ke sana.'}
                        {listing.edited_at &&
                            ` Terakhir diedit ${formatDateTime(listing.edited_at)}${listing.edited_by ? ` oleh ${listing.edited_by}` : ''}.`}
                    </AlertDescription>
                </Alert>

                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <Section title="Informasi utama">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <InputField
                                        id="title"
                                        label="Judul"
                                        required
                                        value={data.title}
                                        onChange={(event) =>
                                            setData('title', event.target.value)
                                        }
                                        error={errors.title}
                                    />
                                </div>
                                <SelectField
                                    id="job_category_id"
                                    label="Kategori"
                                    value={toSelect(data.job_category_id)}
                                    onValueChange={(value) =>
                                        setData(
                                            'job_category_id',
                                            fromSelect(value),
                                        )
                                    }
                                    options={withNone(
                                        options.categories,
                                        'Belum terpetakan',
                                    )}
                                    error={errors.job_category_id}
                                />
                                <SelectField
                                    id="employment_type"
                                    label="Tipe pekerjaan"
                                    value={toSelect(data.employment_type)}
                                    onValueChange={(value) =>
                                        setData(
                                            'employment_type',
                                            fromSelect(value),
                                        )
                                    }
                                    options={withNone(options.employmentTypes)}
                                    error={errors.employment_type}
                                />
                                <SelectField
                                    id="work_arrangement"
                                    label="Sistem kerja"
                                    value={toSelect(data.work_arrangement)}
                                    onValueChange={(value) =>
                                        setData(
                                            'work_arrangement',
                                            fromSelect(value),
                                        )
                                    }
                                    options={withNone(options.workArrangements)}
                                    error={errors.work_arrangement}
                                />
                                <SelectField
                                    id="experience_level"
                                    label="Level"
                                    value={toSelect(data.experience_level)}
                                    onValueChange={(value) =>
                                        setData(
                                            'experience_level',
                                            fromSelect(value),
                                        )
                                    }
                                    options={withNone(options.experienceLevels)}
                                    error={errors.experience_level}
                                />
                                <SelectField
                                    id="min_education"
                                    label="Pendidikan minimal"
                                    value={toSelect(data.min_education)}
                                    onValueChange={(value) =>
                                        setData(
                                            'min_education',
                                            fromSelect(value),
                                        )
                                    }
                                    options={withNone(options.educationLevels)}
                                    error={errors.min_education}
                                />
                                <DatePickerField
                                    id="application_deadline"
                                    label="Batas lamaran"
                                    value={data.application_deadline || null}
                                    onChange={(value) =>
                                        setData('application_deadline', value)
                                    }
                                    error={errors.application_deadline}
                                />
                            </div>
                        </Section>

                        <Section title="Isi lowongan">
                            <div className="space-y-5">
                                <RichTextEditor
                                    label="Deskripsi"
                                    value={data.description}
                                    onChange={(html) =>
                                        setData('description', html)
                                    }
                                    error={errors.description}
                                />
                                <RichTextEditor
                                    label="Tanggung jawab"
                                    value={data.responsibilities}
                                    onChange={(html) =>
                                        setData('responsibilities', html)
                                    }
                                    error={errors.responsibilities}
                                />
                                <RichTextEditor
                                    label="Kualifikasi"
                                    value={data.requirements}
                                    onChange={(html) =>
                                        setData('requirements', html)
                                    }
                                    error={errors.requirements}
                                />
                                <RichTextEditor
                                    label="Benefit"
                                    value={data.benefits}
                                    onChange={(html) =>
                                        setData('benefits', html)
                                    }
                                    error={errors.benefits}
                                />
                            </div>
                        </Section>
                    </div>

                    <div className="space-y-6">
                        <Section title="Lokasi">
                            <div className="space-y-4">
                                <SelectField
                                    id="province_id"
                                    label="Provinsi"
                                    value={toSelect(data.province_id)}
                                    onValueChange={(value) =>
                                        form.setData((current) => ({
                                            ...current,
                                            province_id: fromSelect(value),
                                            city_id: '',
                                        }))
                                    }
                                    options={withNone(options.provinces)}
                                    error={errors.province_id}
                                />
                                <SelectField
                                    id="city_id"
                                    label="Kota"
                                    value={toSelect(data.city_id)}
                                    onValueChange={(value) =>
                                        setData('city_id', fromSelect(value))
                                    }
                                    options={withNone(cities)}
                                    error={errors.city_id}
                                />
                                <InputField
                                    id="location_text"
                                    label="Lokasi asli dari sumber"
                                    value={data.location_text}
                                    onChange={(event) =>
                                        setData(
                                            'location_text',
                                            event.target.value,
                                        )
                                    }
                                    error={errors.location_text}
                                    placeholder="Jakarta Selatan, Indonesia"
                                />
                            </div>
                        </Section>

                        <Section title="Gaji">
                            <div className="space-y-4">
                                <MoneyInput
                                    id="salary_min"
                                    label="Minimum"
                                    value={data.salary_min}
                                    onChange={(value) =>
                                        setData('salary_min', value)
                                    }
                                    error={errors.salary_min}
                                />
                                <MoneyInput
                                    id="salary_max"
                                    label="Maksimum"
                                    value={data.salary_max}
                                    onChange={(value) =>
                                        setData('salary_max', value)
                                    }
                                    error={errors.salary_max}
                                />
                                <InputField
                                    id="salary_currency"
                                    label="Mata uang"
                                    maxLength={3}
                                    value={data.salary_currency}
                                    onChange={(event) =>
                                        setData(
                                            'salary_currency',
                                            event.target.value.toUpperCase(),
                                        )
                                    }
                                    error={errors.salary_currency}
                                    placeholder="IDR"
                                />
                                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                                    <Label htmlFor="is_salary_visible">
                                        Tampilkan gaji
                                    </Label>
                                    <Switch
                                        id="is_salary_visible"
                                        checked={data.is_salary_visible}
                                        onCheckedChange={(checked) =>
                                            setData(
                                                'is_salary_visible',
                                                checked,
                                            )
                                        }
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section title="Lamaran">
                            <div className="space-y-4">
                                <InputField
                                    id="apply_url"
                                    label="Link lamaran"
                                    type="url"
                                    required
                                    value={data.apply_url}
                                    onChange={(event) =>
                                        setData('apply_url', event.target.value)
                                    }
                                    error={errors.apply_url}
                                />
                                <InputField
                                    id="contact_email"
                                    label="Email lamaran di iklan"
                                    type="email"
                                    value={data.contact_email}
                                    onChange={(event) =>
                                        setData(
                                            'contact_email',
                                            event.target.value,
                                        )
                                    }
                                    error={errors.contact_email}
                                    description="Untuk meneruskan lamaran lewat email, isi Email rekrutmen perusahaan di halaman detail."
                                    placeholder="hrd@perusahaan.co.id"
                                />
                            </div>
                        </Section>
                    </div>
                </div>
            </form>
        </>
    );
}

EditExternalListing.layout = {
    breadcrumbs: [
        {
            title: 'Jobs Eksternal',
            href: ScrapedJobListingController.index().url,
        },
    ],
};
