import { Link, usePage } from '@inertiajs/react';
import AppLogo from '@/components/app-logo';
import { adminMainNavSections } from '@/components/role-sidebars/admin-sidebar';
import { employeeMainNavSections } from '@/components/role-sidebars/employee-sidebar';
import { employerMainNavSections } from '@/components/role-sidebars/employer-sidebar';
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
import { getRoleMeta } from '@/lib/role-meta';
import { cn } from '@/lib/utils';
import type { NavSection, UserRole } from '@/types';

const navByRole: Record<string, NavSection[]> = {
    admin: adminMainNavSections,
    employer: employerMainNavSections,
    employee: employeeMainNavSections,
};

export function AppSidebar() {
    const { auth } = usePage().props;
    const role =
        ((auth as { user?: { role?: UserRole } } | undefined)?.user?.role as UserRole | undefined) ??
        'employee';
    const sections = navByRole[role] ?? employeeMainNavSections;
    const meta = getRoleMeta(role);

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r border-sidebar-border/60">
            {/* Decorative brand gradient at top — matches logo blue→cyan */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-brand-blue/12 via-brand-cyan/8 to-transparent group-data-[collapsible=icon]:hidden" />

            <SidebarHeader className="relative gap-0 border-b border-sidebar-border/40 px-3 pt-3 pb-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-auto rounded-xl py-2 hover:bg-white/60 dark:hover:bg-white/5"
                        >
                            <Link href={dashboard()} prefetch className="flex items-center gap-2.5">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="mt-2.5 flex items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:hidden">
                    <span className={cn('inline-flex h-5 items-center rounded-md px-1.5 text-[10px] font-bold uppercase tracking-[0.1em]', meta.chipClass)}>
                        {meta.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-sidebar-foreground/60">
                        <span className="relative flex size-1.5">
                            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Online
                    </span>
                </div>
            </SidebarHeader>

            <SidebarContent className="relative gap-0 px-1 py-2">
                <NavMain sections={sections} />
            </SidebarContent>

            <SidebarFooter className="relative border-t border-sidebar-border/40 p-2">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
