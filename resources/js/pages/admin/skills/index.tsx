import SkillController from '@/actions/App/Http/Controllers/Admin/SkillController';
import { LookupResourcePage } from '@/components/admin/lookup-resource-page';

type Props = {
    items: Array<{
        id: number;
        name: string;
        slug: string;
        category: string | null;
        description: string | null;
        is_active: boolean;
    }>;
};

export default function SkillIndex({ items }: Props) {
    return (
        <LookupResourcePage
            title="Skill"
            description="Kelola bank skill umum dan skill teknis untuk profil kandidat dan lowongan."
            items={items}
            controller={SkillController}
            emptyMessage="Belum ada data skill."
            fields={[
                { name: 'name', label: 'Nama', placeholder: 'Laravel', required: true },
                { name: 'slug', label: 'Slug', placeholder: 'laravel', description: 'Opsional. Akan digenerate otomatis jika kosong.' },
                { name: 'category', label: 'Kategori', placeholder: 'Backend', description: 'Contoh: Frontend, Backend, Cloud, Design.' },
                { name: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Penjelasan singkat untuk skill ini.' },
            ]}
        />
    );
}

SkillIndex.layout = {
    breadcrumbs: [
        {
            title: 'Skill',
            href: SkillController.index().url,
        },
    ],
};
