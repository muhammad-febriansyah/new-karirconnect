import { LayoutGrid } from 'lucide-react';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export const employerMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];
