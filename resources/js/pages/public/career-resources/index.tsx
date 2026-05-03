import { Head, Link, router } from '@inertiajs/react';
import { BookOpen, Clock3 } from 'lucide-react';
import { index as resourceIndex, show as resourceShow } from '@/routes/public/career-resources';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/format-date';

type Props = {
    filters: { category: string };
    categories: string[];
    items: Array<{
        id: number;
        title: string;
        slug: string;
        excerpt: string | null;
        category: string | null;
        tags: string[];
        reading_minutes: number;
        views_count: number;
        published_at: string | null;
    }>;
};

export default function CareerResourcesIndex({ filters, categories, items }: Props) {
    return (
        <>
            <Head title="Career Resources" />
            <div className="space-y-6">
                <PageHeader
                    title="Career Resources"
                    description="Kumpulan panduan karier, CV, interview, dan persiapan kerja yang relevan untuk pasar Indonesia."
                />

                <Section title="Kategori">
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" variant={filters.category === '' ? 'default' : 'outline'} onClick={() => router.get(resourceIndex().url)}>
                            Semua
                        </Button>
                        {categories.map((category) => (
                            <Button
                                key={category}
                                type="button"
                                variant={filters.category === category ? 'default' : 'outline'}
                                onClick={() => router.get(resourceIndex().url, { category }, { preserveScroll: true, preserveState: true })}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                </Section>

                <div className="grid gap-4 lg:grid-cols-2">
                    {items.map((item) => (
                        <Card key={item.id} className="h-full">
                            <CardContent className="space-y-3 p-5">
                                <div className="flex flex-wrap items-center gap-2">
                                    {item.category && <Badge variant="outline">{item.category}</Badge>}
                                    <Badge variant="outline"><Clock3 className="mr-1 size-3" />{item.reading_minutes} menit</Badge>
                                </div>
                                <div>
                                    <Link href={resourceShow(item.slug).url} className="text-xl font-semibold hover:underline">
                                        {item.title}
                                    </Link>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.excerpt || 'Buka artikel untuk membaca ringkasan lengkap dan insight praktis.'}</p>
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                    <span>{item.published_at ? formatDate(item.published_at) : '-'}</span>
                                    <span>{item.views_count} views</span>
                                </div>
                                {item.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {item.tags.map((tag) => (
                                            <Badge key={tag} variant="secondary">{tag}</Badge>
                                        ))}
                                    </div>
                                )}
                                <Button asChild variant="outline">
                                    <Link href={resourceShow(item.slug).url}>
                                        <BookOpen className="size-4" />
                                        Baca Artikel
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </>
    );
}
