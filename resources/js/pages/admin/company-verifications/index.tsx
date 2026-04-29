import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle2, Eye, Loader2, XCircle } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { index as adminVerifIndex, review as adminVerifReview } from '@/routes/admin/company-verifications';

type Item = {
    id: number;
    company: { id: number; name: string };
    document_type: string;
    original_name: string | null;
    status: string;
    uploaded_at: string;
    uploader_name: string | null;
    file_url: string | null;
};

type Props = {
    items: { data: Item[]; total: number; from: number; to: number };
    filters: { status: string };
    statusOptions: { value: string; label: string }[];
};

export default function AdminVerificationsIndex({ items, filters, statusOptions }: Props) {
    const [reviewing, setReviewing] = useState<{ item: Item; decision: 'approve' | 'reject' } | null>(null);
    const reviewForm = useForm({ decision: 'approve', note: '' });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!reviewing) return;
        reviewForm.post(adminVerifReview(reviewing.item.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                reviewForm.reset();
                setReviewing(null);
            },
        });
    };

    return (
        <>
            <Head title="Verifikasi Perusahaan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Verifikasi Perusahaan"
                    description="Tinjau dokumen legal yang diunggah perusahaan untuk lencana 'Verified'."
                />

                <Section>
                    <div className="mb-4 flex items-center gap-2">
                        <select
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            value={filters.status}
                            onChange={(e) => router.get(adminVerifIndex().url, { status: e.target.value }, {
                                preserveScroll: true,
                                preserveState: true,
                                replace: true,
                            })}
                        >
                            <option value="">Semua Status</option>
                            {statusOptions.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {items.data.length === 0 ? (
                        <EmptyState title="Belum ada dokumen" description="Tidak ada dokumen yang menunggu review." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Perusahaan</TableHead>
                                    <TableHead>Dokumen</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Diunggah</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.data.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.company.name}</TableCell>
                                        <TableCell>
                                            <div className="font-medium uppercase">{item.document_type}</div>
                                            <div className="text-xs text-muted-foreground">{item.original_name ?? '-'}</div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge tone={item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'destructive' : 'warning'}>
                                                {item.status}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{formatDateTime(item.uploaded_at)}</div>
                                            <div className="text-xs text-muted-foreground">{item.uploader_name ?? '-'}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {item.file_url && (
                                                    <Button asChild size="sm" variant="ghost">
                                                        <a href={item.file_url} target="_blank" rel="noreferrer">
                                                            <Eye className="size-4" /> Lihat
                                                        </a>
                                                    </Button>
                                                )}
                                                {item.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                reviewForm.setData({ decision: 'approve', note: '' });
                                                                setReviewing({ item, decision: 'approve' });
                                                            }}
                                                        >
                                                            <CheckCircle2 className="size-4" /> Setujui
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                reviewForm.setData({ decision: 'reject', note: '' });
                                                                setReviewing({ item, decision: 'reject' });
                                                            }}
                                                        >
                                                            <XCircle className="size-4" /> Tolak
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Section>
            </div>

            <Dialog open={reviewing !== null} onOpenChange={(open) => !open && setReviewing(null)}>
                <DialogContent className="sm:max-w-md">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>
                                {reviewing?.decision === 'approve' ? 'Setujui Dokumen' : 'Tolak Dokumen'}
                            </DialogTitle>
                            <DialogDescription>
                                {reviewing?.decision === 'approve'
                                    ? 'Perusahaan akan mendapatkan lencana Verified.'
                                    : 'Perusahaan akan diberitahu untuk mengunggah ulang dokumen yang valid.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="my-4">
                            <TextareaField
                                label="Catatan (opsional)"
                                rows={3}
                                placeholder="Tambahkan catatan untuk perusahaan…"
                                value={reviewForm.data.note}
                                onChange={(e) => reviewForm.setData('note', e.target.value)}
                                error={reviewForm.errors.note}
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button type="button" variant="outline" onClick={() => setReviewing(null)}>
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant={reviewing?.decision === 'reject' ? 'destructive' : 'default'}
                                disabled={reviewForm.processing}
                            >
                                {reviewForm.processing ? <Loader2 className="size-4 animate-spin" /> : (
                                    reviewing?.decision === 'approve' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />
                                )}
                                {reviewing?.decision === 'approve' ? 'Setujui' : 'Tolak'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
