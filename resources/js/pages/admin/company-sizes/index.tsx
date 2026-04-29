import CompanySizeController from '@/actions/App/Http/Controllers/Admin/CompanySizeController';
import { LookupResourcePage } from '@/components/admin/lookup-resource-page';

type Props = {
    items: Array<{
        id: number;
        name: string;
        slug: string;
        employee_range: string;
        is_active: boolean;
        sort_order: number;
    }>;
};

export default function CompanySizeIndex({ items }: Props) {
    return (
        <LookupResourcePage
            title="Ukuran Perusahaan"
            description="Kelola rentang jumlah karyawan yang dipakai di profil perusahaan."
            items={items}
            controller={CompanySizeController}
            emptyMessage="Belum ada data ukuran perusahaan."
            fields={[
                { name: 'name', label: 'Label', placeholder: '11-50 Karyawan', required: true },
                { name: 'slug', label: 'Slug', placeholder: '11-50-karyawan', description: 'Opsional. Akan digenerate otomatis jika kosong.' },
                { name: 'employee_range', label: 'Rentang', placeholder: '11-50', required: true, description: 'Nilai ringkas yang disimpan sebagai referensi.' },
                { name: 'sort_order', label: 'Urutan', type: 'number', description: 'Angka kecil akan tampil lebih dulu.' },
            ]}
        />
    );
}

CompanySizeIndex.layout = {
    breadcrumbs: [
        {
            title: 'Ukuran Perusahaan',
            href: CompanySizeController.index().url,
        },
    ],
};
