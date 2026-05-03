import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { useIsMobile } from '@/hooks/use-mobile';
import { getRoleMeta } from '@/lib/role-meta';
import { cn } from '@/lib/utils';
import type { SharedPageProps, UserRole } from '@/types';

export function NavUser() {
    const { auth } = usePage<SharedPageProps>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    const getInitials = useInitials();

    if (!auth.user) {
        return null;
    }

    const meta = getRoleMeta(auth.user.role as UserRole | undefined);

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className={cn(
                                'group/user h-auto rounded-xl border border-transparent py-2 transition-all',
                                'hover:border-brand-blue/20 hover:bg-gradient-to-r hover:from-brand-blue/5 hover:to-transparent',
                                'data-[state=open]:border-brand-blue/30 data-[state=open]:bg-brand-blue/5 data-[state=open]:shadow-sm',
                            )}
                            data-test="sidebar-menu-button"
                        >
                            <div className="relative shrink-0">
                                <Avatar className="size-9 rounded-full ring-2 ring-background">
                                    <AvatarImage src={auth.user.avatar_url ?? undefined} alt={auth.user.name} />
                                    <AvatarFallback className="rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
                            </div>
                            <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                                <span className="truncate text-sm font-semibold text-brand-navy">{auth.user.name}</span>
                                <span className={cn(
                                    'mt-0.5 inline-flex w-fit items-center rounded px-1.5 py-px text-[9.5px] font-bold uppercase tracking-wider',
                                    meta.chipClass,
                                )}>
                                    {meta.label}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/40 transition-colors group-hover/user:text-brand-blue group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
