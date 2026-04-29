import { Link, usePage } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { adminMainNavItems } from '@/components/role-sidebars/admin-sidebar';
import { employeeMainNavItems } from '@/components/role-sidebars/employee-sidebar';
import { employerMainNavItems } from '@/components/role-sidebars/employer-sidebar';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import type { Auth, NavItem } from '@/types';

const footerNavItems: NavItem[] = [
    {
        title: 'Dokumentasi',
        href: 'https://laravel.com/docs',
        icon: BookOpen,
    },
];

const navByRole: Record<string, NavItem[]> = {
    admin: adminMainNavItems,
    employer: employerMainNavItems,
    employee: employeeMainNavItems,
};

export function AppSidebar() {
    const { auth } = usePage().props as { auth: Auth };
    const role = auth.user?.role ?? 'employee';
    const items = navByRole[role] ?? employeeMainNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
