import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, ShieldAlert, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { destroy as purgeShowcaseData } from '@/routes/admin/showcase-data';

type Suspect = {
    id: number;
    email: string;
    role: string;
    created_at: string | null;
};

type Preview = {
    employers: number;
    candidates: number;
    companies: number;
    jobs: number;
    applications: number;
    applications_from_real_candidates: number;
    company_names: string[];
    suspects: Suspect[];
};

type RecentPurge = {
    id: number;
    actor: string;
    ip_address: string | null;
    created_at: string | null;
};

type Props = {
    preview: Preview;
    confirmationPhrase: string;
    recentPurges: RecentPurge[];
};

function formatDateTime(iso: string | null): string {
    if (!iso) {
        return '-';
    }

    return new Date(iso).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export default function AdminShowcaseDataIndex({
    preview,
    confirmationPhrase,
    recentPurges,
}: Props) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const form = useForm({ confirmation: '' });

    const hasData = preview.employers > 0 || preview.candidates > 0;
    const collateral = preview.applications_from_real_candidates;
    const isPhraseCorrect = form.data.confirmation === confirmationPhrase;

    const rows: Array<{ label: string; value: number; danger?: boolean }> = [
        { label: 'Akun employer dummy', value: preview.employers },
        { label: 'Akun kandidat dummy', value: preview.candidates },
        { label: 'Perusahaan dummy', value: preview.companies },
        { label: 'Lowongan dummy (ikut terhapus)', value: preview.jobs },
        { label: 'Lamaran pada lowongan dummy', value: preview.applications },
        {
            label: 'Lamaran dari kandidat asli',
            value: collateral,
            danger: collateral > 0,
        },
    ];

    function submit() {
        form.delete(purgeShowcaseData().url, {
            preserveScroll: true,
            onSuccess: () => {
                setIsConfirmOpen(false);
                form.reset();
            },
        });
    }

    return (
        <>
            <Head title="Data Showcase" />

            <PageHeader
                title="Data Showcase"
                description="Hapus data demo bawaan seeder tanpa menyentuh data asli yang sudah masuk."
            />

            <Section className="space-y-6">
                <Card className="border-destructive/40 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="size-5 shrink-0" />
                            Penghapusan permanen
                        </CardTitle>
                        <CardDescription className="text-destructive/90">
                            Baris yang dihapus tidak bisa dikembalikan dari
                            dalam aplikasi. Export database dulu lewat menu
                            Export Database sebelum menjalankan ini.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-destructive/90">
                        <p>
                            Yang dihapus hanya baris yang dibuat seeder,
                            dikenali dari:
                        </p>
                        <ul className="list-inside list-disc space-y-1">
                            <li>
                                akun employer dengan email{' '}
                                <code className="font-mono text-xs">
                                    hr@&lt;domain&gt;
                                </code>{' '}
                                dari 30 domain seeder
                            </li>
                            <li>
                                akun kandidat{' '}
                                <code className="font-mono text-xs">
                                    kandidat&lt;N&gt;@karirkonek.test
                                </code>
                            </li>
                            <li>
                                perusahaan yang dimiliki akun employer di atas
                            </li>
                        </ul>
                        <p>
                            Akun yang emailnya cocok tapi passwordnya sudah
                            diganti dilewati, karena kemungkinan itu orang asli.
                            Data lookup (kota, provinsi, skill, industri, paket
                            langganan, pengaturan) tidak disentuh.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Yang akan dihapus</CardTitle>
                        <CardDescription>
                            Dihitung ulang setiap halaman ini dibuka.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!hasData ? (
                            <div className="flex items-center gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                <p className="text-muted-foreground">
                                    Tidak ada data showcase yang tersisa.
                                    Database sudah bersih.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr
                                                    key={row.label}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="py-2 pr-4">
                                                        {row.label}
                                                    </td>
                                                    <td
                                                        className={`py-2 text-right font-mono tabular-nums ${
                                                            row.danger
                                                                ? 'font-semibold text-destructive'
                                                                : ''
                                                        }`}
                                                    >
                                                        {row.value}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {collateral > 0 && (
                                    <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                                        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                                        <div className="space-y-1">
                                            <p className="font-medium text-destructive">
                                                {collateral} lamaran milik
                                                kandidat asli akan ikut terhapus
                                            </p>
                                            <p className="text-muted-foreground">
                                                Lamaran itu menempel pada
                                                lowongan dummy, jadi hilang
                                                bersama lowongannya. Export
                                                database dulu kalau riwayatnya
                                                masih dibutuhkan.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {preview.company_names.length > 0 && (
                                    <div>
                                        <p className="pb-2 text-xs text-muted-foreground">
                                            Perusahaan yang dihapus
                                        </p>
                                        <p className="text-sm leading-relaxed">
                                            {preview.company_names.join(', ')}
                                        </p>
                                    </div>
                                )}

                                <div className="pt-1">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => setIsConfirmOpen(true)}
                                    >
                                        <Trash2 className="size-4" />
                                        Hapus Data Showcase
                                    </Button>
                                    <p className="pt-2 text-xs text-muted-foreground">
                                        Anda akan diminta memasukkan ulang
                                        password. Dibatasi 3 percobaan per jam,
                                        dan setiap penghapusan tercatat di audit
                                        log.
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {preview.suspects.length > 0 && (
                    <Card className="border-amber-500/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TriangleAlert className="size-5 shrink-0 text-amber-600" />
                                Dilewati, perlu diperiksa manual
                            </CardTitle>
                            <CardDescription>
                                Email cocok pola dummy tapi passwordnya sudah
                                diganti. Kemungkinan besar ini akun asli yang
                                kebetulan memakai alamat tersebut, jadi tidak
                                ikut dihapus.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs text-muted-foreground">
                                            <th className="pr-4 pb-2 font-medium">
                                                Email
                                            </th>
                                            <th className="pr-4 pb-2 font-medium">
                                                Peran
                                            </th>
                                            <th className="pb-2 font-medium">
                                                Dibuat
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.suspects.map((suspect) => (
                                            <tr
                                                key={suspect.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-2 pr-4 font-mono text-xs">
                                                    {suspect.email}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {suspect.role}
                                                </td>
                                                <td className="py-2 whitespace-nowrap">
                                                    {formatDateTime(
                                                        suspect.created_at,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Riwayat penghapusan</CardTitle>
                        <CardDescription>
                            Kalau ada baris yang tidak Anda kenali, itu tanda
                            akun admin bocor — segera ganti password semua
                            admin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentPurges.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Belum pernah dijalankan.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left text-xs text-muted-foreground">
                                            <th className="pr-4 pb-2 font-medium">
                                                Waktu
                                            </th>
                                            <th className="pr-4 pb-2 font-medium">
                                                Oleh
                                            </th>
                                            <th className="pb-2 font-medium">
                                                IP
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentPurges.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-2 pr-4 whitespace-nowrap">
                                                    {formatDateTime(
                                                        item.created_at,
                                                    )}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {item.actor}
                                                </td>
                                                <td className="py-2 font-mono text-xs">
                                                    {item.ip_address ?? '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </Section>

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Hapus data showcase?</DialogTitle>
                        <DialogDescription>
                            {preview.companies} perusahaan, {preview.jobs}{' '}
                            lowongan, dan{' '}
                            {preview.employers + preview.candidates} akun akan
                            dihapus permanen
                            {collateral > 0
                                ? `, termasuk ${collateral} lamaran milik kandidat asli`
                                : ''}
                            . Tindakan ini tercatat atas nama akun Anda.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="confirmation">
                            Ketik{' '}
                            <span className="font-mono font-semibold">
                                {confirmationPhrase}
                            </span>{' '}
                            untuk melanjutkan
                        </Label>
                        <Input
                            id="confirmation"
                            value={form.data.confirmation}
                            onChange={(event) =>
                                form.setData('confirmation', event.target.value)
                            }
                            autoComplete="off"
                            placeholder={confirmationPhrase}
                        />
                        {form.errors.confirmation && (
                            <p className="text-sm text-destructive">
                                {form.errors.confirmation}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsConfirmOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!isPhraseCorrect || form.processing}
                            onClick={submit}
                        >
                            <Trash2 className="size-4" />
                            {form.processing
                                ? 'Menghapus...'
                                : 'Ya, hapus sekarang'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
