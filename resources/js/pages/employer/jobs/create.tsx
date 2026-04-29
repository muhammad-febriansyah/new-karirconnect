import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import { EmployerJobForm } from '@/components/employer/job-form';

export default function EmployerJobCreate({ options }: { options: Parameters<typeof EmployerJobForm>[0]['options'] }) {
    return (
        <EmployerJobForm
            headTitle="Buat Lowongan"
            title="Buat Lowongan"
            description="Susun detail lowongan, skill yang dicari, dan konfigurasi dasar sebelum dipublikasikan."
            submitLabel="Simpan Lowongan"
            action={JobController.store()}
            options={options}
        />
    );
}

EmployerJobCreate.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
        {
            title: 'Buat',
            href: JobController.create().url,
        },
    ],
};
