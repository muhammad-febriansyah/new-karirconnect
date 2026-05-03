import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavSection } from '@/types';

export function NavMain({ sections = [] }: { sections: NavSection[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            {sections.map((section, index) => (
                <SidebarGroup
                    key={section.label ?? `section-${index}`}
                    className={cn('px-2 py-0', index > 0 && 'mt-4')}
                >
                    {section.label && (
                        <SidebarGroupLabel className="mb-1.5 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/40 group-data-[collapsible=icon]:hidden">
                            <span>{section.label}</span>
                            <span className="h-px flex-1 bg-gradient-to-r from-sidebar-border/60 to-transparent" />
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu className="gap-0.5">
                        {section.items.map((item) => {
                            const active = isCurrentUrl(item.href);

                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={active}
                                        tooltip={{ children: item.title }}
                                        className={cn(
                                            'group/item relative h-10 rounded-xl px-2.5 text-[13px] font-medium transition-all duration-200',
                                            // Inactive icon style
                                            '[&>svg]:size-[16px] [&>svg]:shrink-0 [&>svg]:transition-all',
                                            '[&>svg]:text-sidebar-foreground/55',
                                            // Hover (inactive only)
                                            'hover:bg-gradient-to-r hover:from-brand-blue/8 hover:to-transparent',
                                            'hover:text-brand-blue',
                                            'hover:[&>svg]:text-brand-blue',
                                            // Active state — bold gradient + indicator
                                            'data-[active=true]:bg-gradient-to-r data-[active=true]:from-brand-blue data-[active=true]:to-brand-cyan',
                                            'data-[active=true]:text-white data-[active=true]:font-semibold',
                                            'data-[active=true]:shadow-md data-[active=true]:shadow-brand-blue/30',
                                            'data-[active=true]:[&>svg]:text-white',
                                            // Subtle inner highlight for active
                                            'data-[active=true]:ring-1 data-[active=true]:ring-inset data-[active=true]:ring-white/20',
                                        )}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon && <item.icon />}
                                            <span className="truncate">{item.title}</span>
                                            {active && (
                                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80 group-data-[collapsible=icon]:hidden" />
                                            )}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
