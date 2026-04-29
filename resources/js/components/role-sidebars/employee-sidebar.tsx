import { LayoutGrid } from 'lucide-react';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export const employeeMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];
