import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { InputField } from '@/components/form/input-field';
import { MoneyInput } from '@/components/form/money-input';
import { SelectField } from '@/components/form/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

type Option = { value: string; label: string };

type Plan = {
    id: number;
    name: string;
    slug: string;
    tier: string;
    price_idr: number;
    billing_period_days: number;
    job_post_quota: number;
    featured_credits: number;
    ai_interview_credits: number;
    features: string[];
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
} | null;

type Props = {
    mode: 'create' | 'edit';
    plan: Plan;
    tierOptions: Option[];
};

export default function AdminPricingPlanForm({ mode, plan, tierOptions }: Props) {
    const isEdit = mode === 'edit';
    const [features, setFeatures] = useState<string[]>(plan?.features?.length ? plan.features : ['']);

    const { data, setData, processing, errors } = useForm({
        name: plan?.name ?? '',
        slug: plan?.slug ?? '',
        tier: plan?.tier ?? 'starter',
        price_idr: plan?.price_idr ?? 0,
        billing_period_days: plan?.billing_period_days ?? 30,
        job_post_quota: plan?.job_post_quota ?? 0,
        featured_credits: plan?.featured_credits ?? 0,
        ai_interview_credits: plan?.ai_interview_credits ?? 0,
        is_active: plan?.is_active ?? true,
        is_featured: plan?.is_featured ?? false,
        sort_order: plan?.sort_order ?? 0,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const payload = { ...data, features: features.filter((f) => f.trim() !== '') };
        if (isEdit && plan) {
            router.patch(`/admin/pricing-plans/${plan.id}`, payload);
        } else {
            router.post('/admin/pricing-plans', payload);
        }
    };

    const updateFeature = (index: number, value: string) => {
        setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)));
    };

    const addFeature = () => setFeatures((prev) => [...prev, '']);
    const removeFeature = (index: number) => setFeatures((prev) => prev.filter((_, i) => i !== index));

    return (
        <>
            <Head title={isEdit ? `Edit ${plan?.name ?? 'Paket'}` : 'Tambah Paket'} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={isEdit ? `Edit Paket: ${plan?.name ?? '-'}` : 'Tambah Paket Berlangganan'}
                    description="Tentukan harga, kuota, dan fitur yang ditawarkan."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/admin/pricing-plans">
                                <ArrowLeft className="size-4" /> Kembali
                            </Link>
                        </Button>
                    }
                />

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
                    <div className="space-y-4">
                        <Section title="Identitas Paket">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <InputField
                                    id="name"
                                    label="Nama paket"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Contoh: Pro Bulanan"
                                    error={errors.name}
                                />
                                <InputField
                                    id="slug"
                                    label="Slug"
                                    required
                                    value={data.slug}
                                    onChange={(e) => setData('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                    placeholder="pro-bulanan"
                                    description="Hanya huruf kecil, angka, dan tanda hubung."
                                    error={errors.slug}
                                />
                                <SelectField
                                    id="tier"
                                    label="Tier"
                                    required
                                    value={data.tier}
                                    onValueChange={(v) => setData('tier', v)}
                                    options={tierOptions}
                                    error={errors.tier}
                                />
                                <InputField
                                    id="sort_order"
                                    label="Urutan tampil"
                                    type="number"
                                    min={0}
                                    value={data.sort_order}
                                    onChange={(e) => setData('sort_order', Number(e.target.value))}
                                    description="Angka kecil tampil duluan di halaman pricing."
                                    error={errors.sort_order}
                                />
                            </div>
                        </Section>

                        <Section title="Harga & Periode">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium" htmlFor="price_idr">Harga (IDR)</label>
                                    <MoneyInput
                                        value={data.price_idr}
                                        onChange={(v) => setData('price_idr', v ?? 0)}
                                        placeholder="Rp 0"
                                    />
                                    {errors.price_idr && <p className="text-xs text-destructive">{errors.price_idr}</p>}
                                    <p className="text-xs text-muted-foreground">Isi 0 untuk paket Free.</p>
                                </div>
                                <InputField
                                    id="billing_period_days"
                                    label="Periode tagihan (hari)"
                                    type="number"
                                    required
                                    min={1}
                                    value={data.billing_period_days}
                                    onChange={(e) => setData('billing_period_days', Number(e.target.value))}
                                    description="30 hari = bulanan, 365 hari = tahunan."
                                    error={errors.billing_period_days}
                                />
                            </div>
                        </Section>

                        <Section title="Kuota & Kredit">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <InputField
                                    id="job_post_quota"
                                    label="Job posts"
                                    type="number"
                                    required
                                    min={0}
                                    value={data.job_post_quota}
                                    onChange={(e) => setData('job_post_quota', Number(e.target.value))}
                                    error={errors.job_post_quota}
                                />
                                <InputField
                                    id="featured_credits"
                                    label="Featured credits"
                                    type="number"
                                    required
                                    min={0}
                                    value={data.featured_credits}
                                    onChange={(e) => setData('featured_credits', Number(e.target.value))}
                                    error={errors.featured_credits}
                                />
                                <InputField
                                    id="ai_interview_credits"
                                    label="AI interview credits"
                                    type="number"
                                    required
                                    min={0}
                                    value={data.ai_interview_credits}
                                    onChange={(e) => setData('ai_interview_credits', Number(e.target.value))}
                                    error={errors.ai_interview_credits}
                                />
                            </div>
                        </Section>

                        <Section title="Daftar Fitur">
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    Kalimat pendek yang ditampilkan di halaman pricing. Maksimal 200 karakter per item.
                                </p>
                                <div className="space-y-2">
                                    {features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <CheckCircle2 className="size-4 shrink-0 text-primary" />
                                            <Input
                                                value={feature}
                                                onChange={(e) => updateFeature(idx, e.target.value)}
                                                placeholder="Akses tak terbatas ke pencarian kandidat"
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removeFeature(idx)}
                                                className="text-muted-foreground hover:text-destructive"
                                                aria-label="Hapus fitur"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                                    <Plus className="size-4" /> Tambah fitur
                                </Button>
                            </div>
                        </Section>
                    </div>

                    <aside className="space-y-4">
                        <Card>
                            <CardContent className="space-y-4 p-5">
                                <h3 className="text-sm font-semibold">Status & Visibilitas</h3>
                                <ToggleRow
                                    label="Aktif"
                                    description="Paket yang nonaktif tidak muncul di halaman pricing publik."
                                    checked={data.is_active}
                                    onCheckedChange={(c) => setData('is_active', c)}
                                />
                                <ToggleRow
                                    label="Tandai sebagai Unggulan"
                                    description="Tampilan paket ini akan diberi border highlight + badge."
                                    checked={data.is_featured}
                                    onCheckedChange={(c) => setData('is_featured', c)}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-5">
                                <Button type="submit" disabled={processing} className="w-full">
                                    <Save className="size-4" />
                                    {isEdit ? 'Simpan Perubahan' : 'Buat Paket'}
                                </Button>
                            </CardContent>
                        </Card>
                    </aside>
                </form>
            </div>
        </>
    );
}

function ToggleRow({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (c: boolean) => void }) {
    return (
        <div className="flex items-start justify-between gap-3 rounded-md border bg-muted/30 p-3">
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{label}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}
