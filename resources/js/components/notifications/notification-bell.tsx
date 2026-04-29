import { Link, router, usePage } from '@inertiajs/react';
import { Bell, BellRing } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTime } from '@/lib/format-date';

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
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-3 py-2">
                    <div className="text-sm font-semibold">Notifikasi</div>
                    {center.unread_count > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead}>Tandai semua dibaca</Button>
                    )}
                </div>
                <ScrollArea className="max-h-80">
                    {center.recent.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada notifikasi baru.</div>
                    ) : (
                        <ul className="divide-y">
                            {center.recent.map((n) => (
                                <li key={n.id} className="space-y-1 px-3 py-2 hover:bg-muted/40">
                                    <Link
                                        href={n.action_url ?? '/notifications'}
                                        className="block"
                                        onClick={() => router.post(`/notifications/${n.id}/read`, {}, { preserveScroll: true, preserveState: true })}
                                    >
                                        <div className="text-sm font-medium">{n.title}</div>
                                        <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>
                                        {n.created_at && <div className="text-[10px] text-muted-foreground">{formatDateTime(n.created_at)}</div>}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </ScrollArea>
                <div className="border-t p-2">
                    <Button asChild variant="ghost" size="sm" className="w-full">
                        <Link href="/notifications">Lihat semua</Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
