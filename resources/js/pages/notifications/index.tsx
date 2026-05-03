import { Head, Link, router } from '@inertiajs/react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { ActionButton, ActionGroup } from '@/components/ui/action-button';
import { Badge } from '@/components/ui/badge';
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
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const markRead = (id: string) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    const remove = (id: string) => {
        router.delete(`/notifications/${id}`, { preserveScroll: true });
        setDeletingId(null);
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
                            <ActionButton intent="approve" onClick={markAll}>
                                <Check className="size-4" /> Tandai semua dibaca
                            </ActionButton>
                        ) : null
                    }
                />

                <Section>
                    {notifications.data.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="Belum ada notifikasi"
                            description="Notifikasi terbaru dari aktivitas akun Anda akan muncul di sini."
                        />
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
                                        <ActionGroup className="justify-start sm:justify-end">
                                            {n.action_url && (
                                                <ActionButton asChild intent="detail" onClick={() => markRead(n.id)}>
                                                    <Link href={n.action_url}>Buka</Link>
                                                </ActionButton>
                                            )}
                                            {!n.read_at && (
                                                <ActionButton intent="approve" onClick={() => markRead(n.id)}>
                                                    <Check className="size-4" /> Tandai Dibaca
                                                </ActionButton>
                                            )}
                                            <ActionButton intent="delete" onClick={() => setDeletingId(n.id)}>
                                                <Trash2 className="size-4" /> Hapus
                                            </ActionButton>
                                        </ActionGroup>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={deletingId !== null}
                onOpenChange={(open) => !open && setDeletingId(null)}
                title="Hapus notifikasi?"
                description="Notifikasi ini akan dihapus dari daftar Anda."
                confirmLabel="Hapus"
                confirmIcon={Trash2}
                variant="destructive"
                onConfirm={() => deletingId && remove(deletingId)}
            />
        </>
    );
}
