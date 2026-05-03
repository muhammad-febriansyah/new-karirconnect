import { Head, Link } from '@inertiajs/react';
import { Clock3 } from 'lucide-react';
import { index as resourceIndex, show as resourceShow } from '@/routes/public/career-resources';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format-date';
import { sanitizeHtml } from '@/lib/sanitize-html';

type Props = {
    item: {
        id: number;
        title: string;
        slug: string;
        excerpt: string | null;
        body: string;
        category: string | null;
        tags: string[];
        reading_minutes: number;
        views_count: number;
        published_at: string | null;
    };
    related: Array<{
        id: number;
        title: string;
        slug: string;
        category: string | null;
        reading_minutes: number;
    }>;
};

export default function CareerResourceShow({ item, related }: Props) {
    return (
        <>
            <Head title={item.title} />
            <div className="space-y-6">
                <PageHeader
                    title={item.title}
                    description={item.excerpt || undefined}
                    actions={<Button asChild variant="outline"><Link href={resourceIndex().url}>Kembali ke Resource</Link></Button>}
                />

                <Section>
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {item.category && <Badge variant="outline">{item.category}</Badge>}
                        <Badge variant="outline"><Clock3 className="mr-1 size-3" />{item.reading_minutes} menit</Badge>
                        <span>{item.published_at ? formatDate(item.published_at) : '-'}</span>
                        <span>{item.views_count} views</span>
                    </div>
                    <article
                        className="prose prose-neutral max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.body) }}
                    />
                </Section>

                {related.length > 0 && (
                    <Section title="Artikel Terkait">
                        <div className="grid gap-3 md:grid-cols-3">
                            {related.map((entry) => (
                                <Card key={entry.id}>
                                    <CardContent className="space-y-2 p-4">
                                        <div className="font-medium">{entry.title}</div>
                                        <div className="text-xs text-muted-foreground">{entry.category || 'General'} · {entry.reading_minutes} menit</div>
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={resourceShow(entry.slug).url}>Baca</Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        </>
    );
}
