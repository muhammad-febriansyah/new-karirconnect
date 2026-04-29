import IndustryController from '@/actions/App/Http/Controllers/Admin/IndustryController';
import { LookupResourcePage } from '@/components/admin/lookup-resource-page';

type Props = {
    items: Array<{
        id: number;
        name: string;
        slug: string;
        description: string | null;
        is_active: boolean;
        sort_order: number;
    }>;
};

export default function IndustryIndex({ items }: Props) {
    return (
        <LookupResourcePage
            title="Industri"
            description="Kelola daftar industri untuk profil perusahaan dan filter pencarian."
            items={items}
            controller={IndustryController}
            emptyMessage="Belum ada data industri."
            fields={[
                { name: 'name', label: 'Nama', placeholder: 'Teknologi Informasi', required: true },
                { name: 'slug', label: 'Slug', placeholder: 'teknologi-informasi', description: 'Opsional. Akan digenerate otomatis jika kosong.' },
                { name: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Dipakai untuk menjelaskan cakupan industri ini.' },
                { name: 'sort_order', label: 'Urutan', type: 'number', description: 'Angka kecil akan tampil lebih dulu.' },
            ]}
        />
    );
}

IndustryIndex.layout = {
    breadcrumbs: [
        {
            title: 'Industri',
            href: IndustryController.index().url,
        },
    ],
};
