import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';
import { formatStatus } from '@/lib/format-status';

type Log = {
    id: number;
    user_name: string | null;
    user_email: string | null;
    feature: string | null;
    provider: string | null;
    model: string | null;
    status: string | null;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_cost_usd: string | null;
    latency_ms: number | null;
    error_message: string | null;
    input_json: Record<string, unknown> | null;
    output_json: Record<string, unknown> | null;
    created_at: string | null;
};

type Props = { log: Log };

export default function AdminAiAuditLogShow({ log }: Props) {
    return (
        <>
            <Head title={`AI Audit #${log.id}`} />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title={`AI Audit #${log.id}`}
                    description={`${formatStatus(log.feature)} · ${formatStatus(log.provider)}${log.model ? `/${log.model}` : ''}`}
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/admin/ai-audit-logs"><ArrowLeft className="size-4" /> Kembali</Link>
                        </Button>
                    }
                />

                <Card>
                    <CardContent className="grid gap-3 p-4 md:grid-cols-3">
                        <div><div className="text-sm text-muted-foreground">Status</div><Badge>{formatStatus(log.status)}</Badge></div>
                        <div><div className="text-sm text-muted-foreground">User</div><div>{log.user_name ?? '-'} ({log.user_email ?? '-'})</div></div>
                        <div><div className="text-sm text-muted-foreground">Waktu</div><div>{log.created_at ? formatDateTime(log.created_at) : '-'}</div></div>
                        <div><div className="text-sm text-muted-foreground">Prompt Tokens</div><div className="font-semibold">{log.prompt_tokens ?? 0}</div></div>
                        <div><div className="text-sm text-muted-foreground">Completion Tokens</div><div className="font-semibold">{log.completion_tokens ?? 0}</div></div>
                        <div><div className="text-sm text-muted-foreground">Latency</div><div className="font-semibold">{log.latency_ms ?? 0} ms</div></div>
                        <div><div className="text-sm text-muted-foreground">Cost</div><div className="font-semibold">${log.total_cost_usd ?? '0'}</div></div>
                        {log.error_message && (
                            <div className="md:col-span-3">
                                <div className="text-sm text-muted-foreground">Error</div>
                                <pre className="rounded bg-destructive/10 p-2 text-xs text-destructive whitespace-pre-wrap">{log.error_message}</pre>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Section title="Input Payload">
                    <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(log.input_json, null, 2)}</pre>
                </Section>

                <Section title="Output Payload">
                    <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-xs">{JSON.stringify(log.output_json, null, 2)}</pre>
                </Section>
            </div>
        </>
    );
}
