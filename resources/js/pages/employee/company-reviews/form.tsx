import { Head, useForm } from '@inertiajs/react';
import { Save, Star } from 'lucide-react';
import type { FormEvent } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Company = { id: number; name: string; slug: string; logo_path: string | null };

type Review = {
    id: number;
    title: string;
    rating: number;
    rating_management: number | null;
    rating_culture: number | null;
    rating_compensation: number | null;
    rating_growth: number | null;
    rating_balance: number | null;
    pros: string | null;
    cons: string | null;
    advice_to_management: string | null;
    employment_status: string;
    employment_type: string | null;
    job_title: string | null;
    would_recommend: boolean;
    is_anonymous: boolean;
};

type Props = { company: Company; review: Review | null };

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star`}>
                <Star className={`size-5 ${n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
            </button>
        ))}
    </div>
);

export default function EmployeeCompanyReviewForm({ company, review }: Props) {
    const isEdit = review !== null;
    const ratingFields = [
        ['rating_management', 'Manajemen'],
        ['rating_culture', 'Kultur'],
        ['rating_compensation', 'Kompensasi'],
        ['rating_growth', 'Pertumbuhan'],
        ['rating_balance', 'Work-Life Balance'],
    ] as const;

    const { data, setData, post, patch, processing, errors } = useForm({
        title: review?.title ?? '',
        rating: review?.rating ?? 0,
        rating_management: review?.rating_management ?? 0,
        rating_culture: review?.rating_culture ?? 0,
        rating_compensation: review?.rating_compensation ?? 0,
        rating_growth: review?.rating_growth ?? 0,
        rating_balance: review?.rating_balance ?? 0,
        pros: review?.pros ?? '',
        cons: review?.cons ?? '',
        advice_to_management: review?.advice_to_management ?? '',
        employment_status: review?.employment_status ?? 'current',
        employment_type: review?.employment_type ?? 'full_time',
        job_title: review?.job_title ?? '',
        would_recommend: review?.would_recommend ?? true,
        is_anonymous: review?.is_anonymous ?? true,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();

        if (isEdit && review) {
            patch(`/employee/company-reviews/${review.id}`);
        } else {
            post(`/employee/company-reviews/companies/${company.slug}`);
        }
    };

    return (
        <>
            <Head title={`Review ${company.name}`} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`${isEdit ? 'Edit Review' : 'Tulis Review'} - ${company.name}`}
                    description="Review jujur membantu kandidat lain mengambil keputusan."
                />

                <form onSubmit={submit} className="space-y-5">
                    <Section title="Penilaian Utama">
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <Label className="leading-none">Judul Review</Label>
                                <Input value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder="Ringkas pengalaman Anda..." />
                                {errors.title && <div className="text-xs text-destructive">{errors.title}</div>}
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Rating Keseluruhan (1-5)</Label>
                                <StarPicker value={data.rating} onChange={(v) => setData('rating', v)} />
                                {errors.rating && <div className="text-xs text-destructive">{errors.rating}</div>}
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {ratingFields.map(([key, label]) => (
                                    <div key={key} className="space-y-2.5">
                                        <Label className="leading-none">{label}</Label>
                                        <StarPicker value={data[key]} onChange={(value) => setData(key, value)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>

                    <Section title="Cerita Anda">
                        <div className="space-y-5">
                            <div className="space-y-2.5">
                                <Label className="leading-none">Hal Positif</Label>
                                <Textarea rows={4} value={data.pros ?? ''} onChange={(e) => setData('pros', e.target.value)} />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Hal yang Bisa Diperbaiki</Label>
                                <Textarea rows={4} value={data.cons ?? ''} onChange={(e) => setData('cons', e.target.value)} />
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Saran untuk Manajemen</Label>
                                <Textarea rows={3} value={data.advice_to_management ?? ''} onChange={(e) => setData('advice_to_management', e.target.value)} />
                            </div>
                        </div>
                    </Section>

                    <Section title="Konteks">
                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2.5">
                                <Label className="leading-none">Status Kerja</Label>
                                <Select value={data.employment_status} onValueChange={(v) => setData('employment_status', v)}>
                                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih status kerja" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="current">Karyawan saat ini</SelectItem>
                                        <SelectItem value="former">Mantan karyawan</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2.5">
                                <Label className="leading-none">Posisi</Label>
                                <Input value={data.job_title ?? ''} onChange={(e) => setData('job_title', e.target.value)} />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.would_recommend} onChange={(e) => setData('would_recommend', e.target.checked)} />
                                Saya merekomendasikan tempat kerja ini
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={data.is_anonymous} onChange={(e) => setData('is_anonymous', e.target.checked)} />
                                Posting sebagai anonim
                            </label>
                        </div>
                    </Section>

                    <Button type="submit" disabled={processing}>
                        <Save className="size-4" /> {isEdit ? 'Update' : 'Kirim'} Review
                    </Button>
                </form>
            </div>
        </>
    );
}
