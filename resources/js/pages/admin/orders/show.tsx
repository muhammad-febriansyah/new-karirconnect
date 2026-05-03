import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Order = {
    reference: string;
    company_name: string | null;
    user_name: string | null;
    user_email: string | null;
    description: string;
    amount_idr: number;
    currency: string;
    status: string;
    item_type: string;
    payment_provider: string;
    payment_reference: string | null;
    metadata: Record<string, unknown> | null;
    paid_at: string | null;
    expires_at: string | null;
    created_at: string | null;
};

type Transaction = {
    provider: string;
    gateway_reference: string | null;
    payment_method: string | null;
    amount_idr: number;
    status: string | null;
    settled_at: string | null;
    created_at: string | null;
};

type Props = { order: Order; transactions: Transaction[] };

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function AdminOrderShow({ order, transactions }: Props) {
    return (
        <>
            <Head title={`Order ${order.reference}`} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`Order ${order.reference}`}
                    description={order.description}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/admin/orders"><ArrowLeft className="size-4" /> Kembali</Link>
                        </Button>
                    }
                />

                <Card>
                    <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                        <div><div className="text-sm text-muted-foreground">Status</div><Badge>{formatStatus(order.status)}</Badge></div>
                        <div><div className="text-sm text-muted-foreground">Tipe</div><Badge variant="secondary">{formatStatus(order.item_type)}</Badge></div>
                        <div><div className="text-sm text-muted-foreground">Jumlah</div><div className="text-xl font-bold">{idr(order.amount_idr)}</div></div>
                        <div><div className="text-sm text-muted-foreground">Perusahaan</div><div>{order.company_name ?? '-'}</div></div>
                        <div><div className="text-sm text-muted-foreground">User</div><div>{order.user_name} ({order.user_email})</div></div>
                        <div><div className="text-sm text-muted-foreground">Provider</div><div>{order.payment_provider}</div></div>
                        <div><div className="text-sm text-muted-foreground">Dibayar</div><div>{order.paid_at ? formatDateTime(order.paid_at) : '-'}</div></div>
                        <div><div className="text-sm text-muted-foreground">Dibuat</div><div>{order.created_at ? formatDateTime(order.created_at) : '-'}</div></div>
                        <div><div className="text-sm text-muted-foreground">Kedaluwarsa</div><div>{order.expires_at ? formatDateTime(order.expires_at) : '-'}</div></div>
                    </CardContent>
                </Card>

                <Section title="Transaksi">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Provider</TableHead>
                                <TableHead>Referensi Gateway</TableHead>
                                <TableHead>Metode</TableHead>
                                <TableHead>Jumlah</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Settled</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 && (
                                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Tidak ada transaksi.</TableCell></TableRow>
                            )}
                            {transactions.map((t, i) => (
                                <TableRow key={i}>
                                    <TableCell className="capitalize">{t.provider}</TableCell>
                                    <TableCell className="font-mono text-xs">{t.gateway_reference ?? '-'}</TableCell>
                                    <TableCell>{t.payment_method ?? '-'}</TableCell>
                                    <TableCell>{idr(t.amount_idr)}</TableCell>
                                    <TableCell><Badge variant="secondary">{formatStatus(t.status)}</Badge></TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{t.settled_at ? formatDateTime(t.settled_at) : '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Section>
            </div>
        </>
    );
}
