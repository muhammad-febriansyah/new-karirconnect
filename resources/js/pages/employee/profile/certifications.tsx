import CertificationController from '@/actions/App/Http/Controllers/Employee/CertificationController';
import { ProfileRecordPage } from '@/components/employee/profile-record-page';
import { ProfileTabs } from '@/components/employee/profile-tabs';

type CertificationItem = {
    id: number;
    name: string | null;
    issuer: string | null;
    credential_id: string | null;
    credential_url: string | null;
    issued_date: string | null;
    expires_date: string | null;
};

export default function EmployeeCertifications({ items }: { items: CertificationItem[] }) {
    return (
        <ProfileRecordPage
            title="Sertifikasi"
            description="Kelola sertifikasi, lisensi, atau credential profesional Anda."
            topContent={<ProfileTabs />}
            items={items}
            actions={CertificationController}
            emptyMessage="Belum ada sertifikasi."
            fields={[
                { name: 'name', label: 'Nama Sertifikasi', required: true, placeholder: 'AWS Certified Developer' },
                { name: 'issuer', label: 'Penerbit', required: true, placeholder: 'Amazon Web Services' },
                { name: 'credential_id', label: 'Credential ID', placeholder: 'AWS-12345' },
                { name: 'credential_url', label: 'Credential URL', type: 'url', placeholder: 'https://...' },
                { name: 'issued_date', label: 'Tanggal Terbit', type: 'date' },
                { name: 'expires_date', label: 'Tanggal Kedaluwarsa', type: 'date' },
            ]}
        />
    );
}

EmployeeCertifications.layout = {
    breadcrumbs: [
        {
            title: 'Sertifikasi',
            href: CertificationController.index().url,
        },
    ],
};
