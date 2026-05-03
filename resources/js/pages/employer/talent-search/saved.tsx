import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, BookmarkCheck } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';

type SavedItem = {
    id: number;
    profile_id: number;
    name: string | null;
    avatar_url: string | null;
    headline: string | null;
    label: string | null;
    note: string | null;
    saved_at: string | null;
    saved_by: string | null;
    skills: Array<{ id: number; name: string }>;
};

type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
};

type Props = {
    saved: Paginator<SavedItem>;
};

export default function EmployerSavedCandidates({ saved }: Props) {
    return (
        <>
            <Head title="Kandidat Tersimpan" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Kandidat Tersimpan"
                    description="Kandidat yang Anda simpan dari Talent Search."
                    actions={
                        <Button asChild variant="outline">
                            <Link href="/employer/talent-search"><ArrowLeft className="size-4" /> Kembali</Link>
                        </Button>
                    }
                />

                <Section>
                    {saved.data.length === 0 ? (
                        <EmptyState
                            title="Belum ada kandidat tersimpan"
                            description="Simpan kandidat dari Talent Search untuk melihatnya lagi di sini."
                        />
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {saved.data.map((s) => (
                                <Card key={s.id}>
                                    <CardContent className="space-y-3 p-4">
                                        <div className="flex items-start gap-3">
                                            <Avatar>
                                                <AvatarImage src={s.avatar_url ?? undefined} />
                                                <AvatarFallback>{(s.name ?? '?').charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold">
                                                            <Link href={`/employer/talent-search/${s.profile_id}`}>{s.name ?? 'Kandidat'}</Link>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">{s.headline ?? '-'}</div>
                                                    </div>
                                                    <BookmarkCheck className="size-4 text-primary" />
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                                                    {s.label && <Badge variant="secondary">{s.label}</Badge>}
                                                    {s.saved_by && <span>Disimpan oleh {s.saved_by}</span>}
                                                    {s.saved_at && <span>· {formatDateTime(s.saved_at)}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {s.note && <p className="rounded bg-muted/40 p-2 text-sm">{s.note}</p>}
                                        <div className="flex flex-wrap gap-1">
                                            {s.skills.map((sk) => (<Badge key={sk.id} variant="outline">{sk.name}</Badge>))}
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
