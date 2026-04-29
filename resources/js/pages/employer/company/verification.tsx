import { Head, useForm } from '@inertiajs/react';
import { Eye, FileCheck, Loader2, Upload } from 'lucide-react';
import { type FormEvent } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { FileUploadField } from '@/components/form/file-upload-field';
import { SelectField } from '@/components/form/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { store as verificationStore } from '@/routes/employer/company/verification';

type Document = {
    id: number;
    document_type: string;
    original_name: string | null;
    status: string | null;
    review_note: string | null;
    uploaded_at: string;
    reviewed_at: string | null;
    file_url: string | null;
};

type Props = {
    company: { id: number; name: string; verification_status: string | null } | null;
    documents: Document[];
};

const DOCUMENT_TYPES = [
    { value: 'nib', label: 'NIB' },
    { value: 'akta', label: 'Akta Pendirian' },
    { value: 'npwp', label: 'NPWP' },
    { value: 'siup', label: 'SIUP' },
    { value: 'tdp', label: 'TDP' },
    { value: 'other', label: 'Lainnya' },
];

const STATUS_TONE: Record<string, 'success' | 'warning' | 'destructive' | 'muted'> = {
    approved: 'success',
    pending: 'warning',
    rejected: 'destructive',
};

export default function VerificationPage({ company, documents }: Props) {
    const form = useForm<{ document_type: string; file: File | null }>({
        document_type: '',
        file: null,
    });

    if (!company) {
        return (
            <>
                <Head title="Verifikasi Perusahaan" />
                <div className="space-y-6 p-4 sm:p-6">
                    <PageHeader title="Verifikasi Perusahaan" />
                    <EmptyState
                        title="Perusahaan belum terdaftar"
                        description="Daftarkan perusahaan Anda terlebih dahulu di menu Profil Perusahaan."
                    />
                </div>
            </>
        );
    }

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(verificationStore().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <>
            <Head title="Verifikasi Perusahaan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Verifikasi Perusahaan"
                    description="Unggah dokumen legal untuk mendapatkan lencana 'Verified' yang meningkatkan kepercayaan kandidat."
                    actions={
                        <StatusBadge tone={company.verification_status === 'verified' ? 'success' : 'muted'}>
                            {company.verification_status}
                        </StatusBadge>
                    }
                />

                <Section title="Unggah Dokumen Baru">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <SelectField
                            label="Jenis Dokumen"
                            required
                            value={form.data.document_type}
                            onValueChange={(v) => form.setData('document_type', v)}
                            options={DOCUMENT_TYPES}
                            error={form.errors.document_type}
                        />
                        <FileUploadField
                            label="File (PDF / JPG / PNG, max 5MB)"
                            required
                            accept="application/pdf,image/png,image/jpeg"
                            value={form.data.file}
                            onChange={(f) => form.setData('file', f)}
                            error={form.errors.file}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                                Unggah Dokumen
                            </Button>
                        </div>
                    </form>
                </Section>

                <Section title="Riwayat Dokumen">
                    {documents.length === 0 ? (
                        <EmptyState
                            icon={FileCheck}
                            title="Belum ada dokumen"
                            description="Mulai dengan mengunggah salah satu dokumen legal di atas."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Jenis</TableHead>
                                    <TableHead>Nama File</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Diunggah</TableHead>
                                    <TableHead>Catatan Admin</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium uppercase">{doc.document_type}</TableCell>
                                        <TableCell>{doc.original_name ?? '-'}</TableCell>
                                        <TableCell>
                                            <StatusBadge tone={STATUS_TONE[doc.status ?? 'pending'] ?? 'muted'}>
                                                {doc.status ?? '-'}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell>{formatDateTime(doc.uploaded_at)}</TableCell>
                                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                                            {doc.review_note ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {doc.file_url && (
                                                <Button asChild variant="ghost" size="sm">
                                                    <a href={doc.file_url} target="_blank" rel="noreferrer">
                                                        <Eye className="size-4" /> Lihat
                                                    </a>
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Section>
            </div>
        </>
    );
}
