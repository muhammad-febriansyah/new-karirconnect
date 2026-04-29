import { LayoutGrid, Settings as SettingsIcon } from 'lucide-react';
import { dashboard } from '@/routes';
import { edit as adminSettingsEdit } from '@/routes/admin/settings';
import type { NavItem } from '@/types';

export const adminMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Pengaturan Sistem',
        href: adminSettingsEdit(),
        icon: SettingsIcon,
    },
];
