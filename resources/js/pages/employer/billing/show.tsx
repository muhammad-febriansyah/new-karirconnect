import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import BillingController from '@/actions/App/Http/Controllers/Employer/BillingController';
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
    description: string;
    amount_idr: number;
    currency: string;
    status: string;
    item_type: string;
    payment_url: string | null;
    payment_reference: string | null;
    created_at: string | null;
    paid_at: string | null;
    expires_at: string | null;
};

type Transaction = {
    provider: string;
    gateway_reference: string | null;
    payment_method: string | null;
    amount_idr: number;
    status: string | null;
    settled_at: string | null;
};

type Props = {
    order: Order;
    transactions: Transaction[];
};

const idr = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function EmployerBillingShow({ order, transactions }: Props) {
    return (
        <>
            <Head title={`Order ${order.reference}`} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`Order ${order.reference}`}
                    description={order.description}
                    actions={
                        <Button asChild variant="outline">
                            <Link href={BillingController.index().url}><ArrowLeft className="size-4" /> Kembali</Link>
                        </Button>
                    }
                />

                <Card>
                    <CardContent className="grid gap-4 p-4 md:grid-cols-3">
                        <div>
                            <div className="text-sm text-muted-foreground">Status</div>
                            <Badge>{formatStatus(order.status)}</Badge>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Jumlah</div>
                            <div className="text-xl font-bold">{idr(order.amount_idr)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Tipe</div>
                            <Badge variant="secondary">{formatStatus(order.item_type)}</Badge>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Dibuat</div>
                            <div className="text-sm">{order.created_at ? formatDateTime(order.created_at) : '-'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Dibayar</div>
                            <div className="text-sm">{order.paid_at ? formatDateTime(order.paid_at) : '-'}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Kedaluwarsa</div>
                            <div className="text-sm">{order.expires_at ? formatDateTime(order.expires_at) : '-'}</div>
                        </div>
                    </CardContent>
                </Card>

                {order.payment_url && order.status !== 'paid' && (
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <div>
                                <div className="font-semibold">Selesaikan pembayaran</div>
                                <div className="text-sm text-muted-foreground">Klik tombol untuk dialihkan ke halaman pembayaran Duitku.</div>
                            </div>
                            <Button asChild>
                                <a href={order.payment_url} target="_blank" rel="noreferrer">
                                    Bayar Sekarang <ExternalLink className="size-4" />
                                </a>
                            </Button>
                        </CardContent>
                    </Card>
                )}

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
                                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">Belum ada transaksi.</TableCell></TableRow>
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
