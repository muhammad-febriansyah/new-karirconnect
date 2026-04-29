import { Form, Head } from '@inertiajs/react';
import SavedJobController from '@/actions/App/Http/Controllers/Employee/SavedJobController';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format-date';

type Props = {
    items: Array<{
        id: number;
        job: {
            id: number;
            title: string;
            status: string | null;
            employment_type: string | null;
            work_arrangement: string | null;
            company_name: string | null;
            category_name: string | null;
            city_name: string | null;
            application_deadline: string | null;
        };
        saved_at: string | null;
    }>;
};

export default function EmployeeSavedJobsIndex({ items }: Props) {
    return (
        <>
            <Head title="Lowongan Tersimpan" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Lowongan Tersimpan"
                    description="Kumpulan lowongan yang Anda tandai untuk ditinjau atau dilamar nanti."
                />

                <Section>
                    {items.length === 0 ? (
                        <EmptyState title="Belum ada lowongan tersimpan" description="Simpan lowongan yang relevan dari halaman publik saat modul browse sudah aktif." />
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-1">
                                        <div className="font-medium">{item.job.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {item.job.company_name ?? 'Perusahaan anonim'} • {item.job.category_name ?? '-'} • {item.job.city_name ?? 'Lokasi fleksibel'}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <StatusBadge tone={item.job.status === 'published' ? 'success' : 'secondary'}>
                                                {item.job.status}
                                            </StatusBadge>
                                            {item.job.employment_type && <StatusBadge tone="primary">{item.job.employment_type}</StatusBadge>}
                                            {item.job.work_arrangement && <StatusBadge tone="info">{item.job.work_arrangement}</StatusBadge>}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Deadline: {formatDate(item.job.application_deadline) || '-'}
                                        </div>
                                    </div>
                                    <Form {...SavedJobController.destroy.form(item.job.id)}>
                                        {({ processing }) => (
                                            <Button type="submit" variant="outline" disabled={processing}>
                                                Hapus
                                            </Button>
                                        )}
                                    </Form>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

EmployeeSavedJobsIndex.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan Tersimpan',
            href: SavedJobController.index().url,
        },
    ],
};
