import { BriefcaseBusiness, Building2, LayoutGrid, Settings as SettingsIcon, ShieldCheck, Tag } from 'lucide-react';
import CompanyController from '@/actions/App/Http/Controllers/Admin/CompanyController';
import CompanyVerificationController from '@/actions/App/Http/Controllers/Admin/CompanyVerificationController';
import JobController from '@/actions/App/Http/Controllers/Admin/JobController';
import { dashboard } from '@/routes';
import { edit as adminSettingsEdit } from '@/routes/admin/settings';
import { index as jobCategoriesIndex } from '@/routes/admin/job-categories';
import { index as skillsIndex } from '@/routes/admin/skills';
import type { NavItem } from '@/types';

export const adminMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Perusahaan',
        href: CompanyController.index().url,
        icon: Building2,
    },
    {
        title: 'Verifikasi Perusahaan',
        href: CompanyVerificationController.index().url,
        icon: ShieldCheck,
    },
    {
        title: 'Lowongan',
        href: JobController.index().url,
        icon: BriefcaseBusiness,
    },
    {
        title: 'Kategori Pekerjaan',
        href: jobCategoriesIndex().url,
        icon: Tag,
    },
    {
        title: 'Skill',
        href: skillsIndex().url,
        icon: Tag,
    },
    {
        title: 'Pengaturan Sistem',
        href: adminSettingsEdit().url,
        icon: SettingsIcon,
    },
];
