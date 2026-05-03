import WorkExperienceController from '@/actions/App/Http/Controllers/Employee/WorkExperienceController';
import { ProfileRecordPage } from '@/components/employee/profile-record-page';
import { ProfileTabs } from '@/components/employee/profile-tabs';

type WorkExperienceItem = {
    id: number;
    company_name: string | null;
    position: string | null;
    employment_type: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
};

export default function EmployeeWorkExperiences({ items }: { items: WorkExperienceItem[] }) {
    return (
        <ProfileRecordPage
            title="Pengalaman Kerja"
            description="Simpan pengalaman profesional yang relevan dengan target karir Anda."
            topContent={<ProfileTabs />}
            items={items}
            actions={WorkExperienceController}
            emptyMessage="Belum ada pengalaman kerja."
            fields={[
                { name: 'company_name', label: 'Perusahaan', required: true, placeholder: 'PT Karir Connect' },
                { name: 'position', label: 'Posisi', required: true, placeholder: 'Backend Engineer' },
                {
                    name: 'employment_type',
                    label: 'Tipe Kerja',
                    type: 'select',
                    options: [
                        { value: 'full_time', label: 'Full-time' },
                        { value: 'part_time', label: 'Part-time' },
                        { value: 'contract', label: 'Kontrak' },
                        { value: 'internship', label: 'Magang' },
                        { value: 'freelance', label: 'Freelance' },
                    ],
                },
                { name: 'start_date', label: 'Tanggal Mulai', type: 'date', required: true },
                { name: 'end_date', label: 'Tanggal Selesai', type: 'date' },
                { name: 'is_current', label: 'Masih Bekerja', type: 'checkbox' },
                { name: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Tanggung jawab utama dan hasil kerja.' },
            ]}
        />
    );
}

EmployeeWorkExperiences.layout = {
    breadcrumbs: [
        {
            title: 'Pengalaman Kerja',
            href: WorkExperienceController.index().url,
        },
    ],
};
