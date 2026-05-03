import { Link, router, usePage } from '@inertiajs/react';
import {
    Badge as BadgeIcon,
    Bell,
    BellRing,
    Briefcase,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    type LucideIcon,
    MessageCircle,
    Sparkles,
} from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, LucideIcon> = {
    'message-circle': MessageCircle,
    badge: BadgeIcon,
    briefcase: Briefcase,
    calendar: CalendarClock,
    check: CheckCircle2,
    payment: CreditCard,
    sparkles: Sparkles,
};

const ICON_TONE: Record<string, string> = {
    'message-circle': 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/40',
    badge: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-950/40',
    briefcase: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
    calendar: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40',
    check: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40',
    payment: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40',
    sparkles: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-100 dark:bg-fuchsia-950/40',
};

type Recent = {
    id: string;
    title: string;
    body: string;
    action_url: string | null;
    icon: string;
    created_at: string | null;
};

type SharedNotificationCenter = {
    unread_count: number;
    recent: Recent[];
};

export function NotificationBell() {
    const { props } = usePage<{ notificationCenter?: SharedNotificationCenter }>();
    const center = props.notificationCenter ?? { unread_count: 0, recent: [] };
    const Icon = center.unread_count > 0 ? BellRing : Bell;

    const markAllRead = () => {
        router.post('/notifications/mark-all-read', {}, { preserveScroll: true });
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Icon className="size-5" />
                    {center.unread_count > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full p-0 text-[10px]">
                            {center.unread_count > 9 ? '9+' : center.unread_count}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="flex max-h-[min(calc(100vh-7rem),32rem)] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden p-0"
            >
                <div className="flex shrink-0 items-center justify-between border-b px-3 py-2">
                    <div className="text-sm font-semibold">Notifikasi</div>
                    {center.unread_count > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead}>Tandai semua dibaca</Button>
                    )}
                </div>
                <ScrollArea className="min-h-0 flex-1">
                    {center.recent.length === 0 ? (
                        <div className="p-4">
                            <EmptyState
                                icon={Bell}
                                title="Tidak ada notifikasi baru"
                                description="Saat ada update penting, ringkasannya akan muncul di sini."
                            />
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {center.recent.map((n) => {
                                const ItemIcon = ICON_MAP[n.icon] ?? Bell;
                                const tone = ICON_TONE[n.icon] ?? 'text-muted-foreground bg-muted';

                                return (
                                    <li key={n.id} className="hover:bg-muted/40">
                                        <Link
                                            href={n.action_url ?? '/notifications'}
                                            className="flex items-start gap-3 px-3 py-2.5"
                                            onClick={() =>
                                                router.post(
                                                    `/notifications/${n.id}/read`,
                                                    {},
                                                    { preserveScroll: true, preserveState: true },
                                                )
                                            }
                                        >
                                            <span
                                                className={cn(
                                                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                                                    tone,
                                                )}
                                                aria-hidden
                                            >
                                                <ItemIcon className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="break-words text-sm font-medium">{n.title}</div>
                                                <div className="line-clamp-2 break-words text-xs text-muted-foreground">
                                                    {n.body}
                                                </div>
                                                {n.created_at && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        {formatDateTime(n.created_at)}
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>
                <div className="shrink-0 border-t bg-popover p-2">
                    <Button asChild variant="ghost" size="sm" className="w-full">
                        <Link href="/notifications">Lihat semua</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
