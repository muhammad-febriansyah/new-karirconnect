import EducationController from '@/actions/App/Http/Controllers/Employee/EducationController';
import { ProfileRecordPage } from '@/components/employee/profile-record-page';

type EducationItem = {
    id: number;
    level: string | null;
    institution: string | null;
    major: string | null;
    gpa: number | null;
    start_year: number | null;
    end_year: number | null;
    description: string | null;
};

export default function EmployeeEducations({ items }: { items: EducationItem[] }) {
    return (
        <ProfileRecordPage
            title="Pendidikan"
            description="Kelola riwayat pendidikan formal Anda."
            items={items}
            actions={EducationController}
            emptyMessage="Belum ada riwayat pendidikan."
            fields={[
                { name: 'level', label: 'Jenjang', required: true, placeholder: 'S1' },
                { name: 'institution', label: 'Institusi', required: true, placeholder: 'Universitas Indonesia' },
                { name: 'major', label: 'Jurusan', placeholder: 'Teknik Informatika' },
                { name: 'gpa', label: 'IPK', type: 'number', placeholder: '3.75' },
                { name: 'start_year', label: 'Tahun Mulai', type: 'number', required: true, placeholder: '2018' },
                { name: 'end_year', label: 'Tahun Selesai', type: 'number', placeholder: '2022' },
                { name: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Aktivitas, fokus studi, atau pencapaian penting.' },
            ]}
        />
    );
}

EmployeeEducations.layout = {
    breadcrumbs: [
        {
            title: 'Pendidikan',
            href: EducationController.index().url,
        },
    ],
};
