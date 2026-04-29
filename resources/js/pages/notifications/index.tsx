import { Head, Link, router } from '@inertiajs/react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';

type NotificationItem = {
    id: string;
    type: string;
    title: string;
    body: string;
    action_url: string | null;
    icon: string;
    read_at: string | null;
    created_at: string | null;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Props = {
    notifications: Paginator<NotificationItem>;
    unreadCount: number;
};

export default function NotificationsIndex({ notifications, unreadCount }: Props) {
    const markRead = (id: string) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };
    const remove = (id: string) => {
        router.delete(`/notifications/${id}`, { preserveScroll: true });
    };
    const markAll = () => {
        router.post('/notifications/mark-all-read', {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Notifikasi" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Notifikasi"
                    description={`${unreadCount} belum dibaca`}
                    actions={
                        unreadCount > 0 ? (
                            <Button variant="outline" onClick={markAll}>
                                <Check className="size-4" /> Tandai semua dibaca
                            </Button>
                        ) : null
                    }
                />

                <Section>
                    {notifications.data.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                                <Bell className="size-8" />
                                <div>Belum ada notifikasi.</div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {notifications.data.map((n) => (
                                <Card key={n.id} className={n.read_at ? '' : 'border-primary/40 bg-primary/5'}>
                                    <CardContent className="flex items-start justify-between gap-4 p-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold">{n.title}</div>
                                                {!n.read_at && <Badge variant="secondary">Baru</Badge>}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{n.body}</div>
                                            {n.created_at && (
                                                <div className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            {n.action_url && (
                                                <Button asChild size="sm" variant="outline" onClick={() => markRead(n.id)}>
                                                    <Link href={n.action_url}>Buka</Link>
                                                </Button>
                                            )}
                                            {!n.read_at && (
                                                <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>
                                                    <Check className="size-4" />
                                                </Button>
                                            )}
                                            <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}
