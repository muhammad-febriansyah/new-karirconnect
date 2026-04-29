import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import { EmployerJobForm } from '@/components/employer/job-form';

type Props = {
    job: Parameters<typeof EmployerJobForm>[0]['job'];
    options: Parameters<typeof EmployerJobForm>[0]['options'];
};

export default function EmployerJobEdit({ job, options }: Props) {
    return (
        <EmployerJobForm
            headTitle={`Ubah ${job?.title ?? 'Lowongan'}`}
            title={`Ubah ${job?.title ?? 'Lowongan'}`}
            description="Perbarui detail lowongan dan status publikasinya."
            submitLabel="Perbarui Lowongan"
            action={JobController.update(job?.slug ?? '')}
            options={options}
            job={job}
        />
    );
}

EmployerJobEdit.layout = {
    breadcrumbs: [
        {
            title: 'Lowongan',
            href: JobController.index().url,
        },
    ],
};
