import JobCategoryController from '@/actions/App/Http/Controllers/Admin/JobCategoryController';
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

export default function JobCategoryIndex({ items }: Props) {
    return (
        <LookupResourcePage
            title="Kategori Lowongan"
            description="Kelola kategori lowongan utama untuk form employer dan halaman publik."
            items={items}
            controller={JobCategoryController}
            emptyMessage="Belum ada kategori lowongan."
            fields={[
                { name: 'name', label: 'Nama', placeholder: 'Software Engineering', required: true },
                { name: 'slug', label: 'Slug', placeholder: 'software-engineering', description: 'Opsional. Akan digenerate otomatis jika kosong.' },
                { name: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Kategori untuk role engineering, platform, dan mobile.' },
                { name: 'sort_order', label: 'Urutan', type: 'number', description: 'Angka kecil akan tampil lebih dulu.' },
            ]}
        />
    );
}

JobCategoryIndex.layout = {
    breadcrumbs: [
        {
            title: 'Kategori Lowongan',
            href: JobCategoryController.index().url,
        },
    ],
};
