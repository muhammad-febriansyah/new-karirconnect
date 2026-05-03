import { usePage } from '@inertiajs/react';
import { ChevronDown, Search } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { getRoleMeta } from '@/lib/role-meta';
import { cn } from '@/lib/utils';
import type { SharedPageProps, UserRole } from '@/types';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage<SharedPageProps>().props;
    const getInitials = useInitials();
    const meta = getRoleMeta(auth.user?.role as UserRole | undefined);

    return (
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-6">
            {/* brand accent line at top — matches logo blue→cyan */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-blue/0 via-brand-blue to-brand-cyan/0" />

            <div className="flex min-w-0 flex-1 items-center gap-2">
                <SidebarTrigger
                    className={cn(
                        'size-9 rounded-lg border border-border/40 bg-muted/30 text-muted-foreground',
                        'transition-all hover:border-brand-blue/30 hover:bg-brand-blue/5 hover:text-brand-blue',
                    )}
                />
                <Separator orientation="vertical" className="hidden h-6 md:block" />
                <div className="min-w-0 flex-1">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            {/* Search bar */}
            <div className="group relative hidden w-full max-w-md md:flex">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand-blue" />
                <Input
                    type="search"
                    placeholder="Cari halaman, menu, atau data…"
                    className={cn(
                        'h-10 rounded-xl border-border/50 bg-muted/30 pl-10 pr-16 shadow-none',
                        'transition-all duration-200',
                        'placeholder:text-muted-foreground/60',
                        'focus-visible:border-brand-blue/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-brand-blue/15',
                        'hover:border-border hover:bg-muted/50',
                    )}
                />
                <kbd className={cn(
                    'pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-0.5',
                    'rounded-md border border-border/60 bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground',
                    'shadow-sm md:inline-flex',
                )}>
                    <span className="text-[11px] leading-none">⌘</span>
                    <span className="leading-none">K</span>
                </kbd>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
                <div className="rounded-lg border border-border/40 bg-muted/30 transition-colors hover:border-brand-blue/30 hover:bg-brand-blue/5">
                    <NotificationBell />
                </div>

                <Separator orientation="vertical" className="mx-0.5 hidden h-6 lg:block" />

                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className={cn(
                                    'group/userbtn h-11 gap-2.5 rounded-xl border border-transparent px-1.5 transition-all',
                                    'hover:border-brand-blue/20 hover:bg-brand-blue/5',
                                    'data-[state=open]:border-brand-blue/30 data-[state=open]:bg-brand-blue/8 data-[state=open]:shadow-sm',
                                    'lg:pr-3',
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="size-8 rounded-full ring-2 ring-background">
                                        <AvatarImage src={auth.user.avatar_url ?? undefined} alt={auth.user.name} />
                                        <AvatarFallback className="rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan text-xs font-bold text-white">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute right-0 bottom-0 size-2 rounded-full border-2 border-background bg-emerald-500" />
                                </div>
                                <div className="hidden min-w-0 text-left lg:flex lg:flex-col lg:gap-px">
                                    <div className="truncate text-sm font-semibold leading-none text-brand-navy">{auth.user.name}</div>
                                    <span className={cn(
                                        'inline-flex h-3.5 w-fit items-center rounded px-1 text-[9px] font-bold uppercase tracking-wider',
                                        meta.chipClass,
                                    )}>
                                        {meta.label}
                                    </span>
                                </div>
                                <ChevronDown className="hidden size-4 text-muted-foreground transition-transform group-data-[state=open]/userbtn:rotate-180 lg:block" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 rounded-xl" align="end">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
