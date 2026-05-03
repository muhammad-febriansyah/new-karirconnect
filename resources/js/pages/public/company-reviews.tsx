import { Head, Link, router, usePage } from '@inertiajs/react';
import { Star, ThumbsUp } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format-date';

type Review = {
    id: number;
    title: string;
    rating: number;
    pros: string | null;
    cons: string | null;
    advice_to_management: string | null;
    employment_status: string;
    job_title: string | null;
    would_recommend: boolean;
    is_anonymous: boolean;
    author_name: string | null;
    response_body: string | null;
    responded_at: string | null;
    helpful_count: number;
    has_voted: boolean;
    created_at: string | null;
};

type Paginator<T> = { data: T[] };

type Props = {
    company: { id: number; name: string; slug: string; logo_path: string | null };
    stats: { total: number; avg_rating: number; recommend_pct: number };
    reviews: Paginator<Review>;
};

export default function PublicCompanyReviews({ company, stats, reviews }: Props) {
    const { props } = usePage<{ auth?: { user: unknown | null } }>();
    const isAuthenticated = Boolean(props.auth?.user);

    const toggleHelpful = (id: number) => {
        if (!isAuthenticated) return;
        router.post(`/companies/reviews/${id}/helpful`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title={`Review ${company.name}`} />
            <div className="container mx-auto space-y-6 px-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {company.logo_path && <img src={company.logo_path} alt="" className="size-12 rounded" />}
                        <div>
                            <h1 className="text-2xl font-bold">Review {company.name}</h1>
                            <Link href={`/companies/${company.slug}`} className="text-sm text-muted-foreground underline">Profil perusahaan</Link>
                        </div>
                    </div>
                    {isAuthenticated && (
                        <Button asChild>
                            <Link href={`/employee/company-reviews/companies/${company.slug}/create`}>Tulis Review</Link>
                        </Button>
                    )}
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Rata-rata</div>
                        <div className="flex items-center gap-1 text-3xl font-bold">{stats.avg_rating || 0} <Star className="size-5 fill-yellow-400 text-yellow-400" /></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Total Review</div>
                        <div className="text-3xl font-bold">{stats.total}</div>
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Direkomendasikan</div>
                        <div className="text-3xl font-bold">{stats.recommend_pct}%</div>
                    </CardContent></Card>
                </div>

                <div className="space-y-3">
                    {reviews.data.length === 0 ? (
                        <Card>
                            <CardContent className="p-6">
                                <EmptyState
                                    title="Belum ada review terverifikasi"
                                    description="Review kandidat yang sudah terpublikasi akan muncul di sini."
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        reviews.data.map((r) => (
                            <Card key={r.id}>
                                <CardContent className="space-y-2 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="font-semibold">{r.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {r.author_name ?? 'Anonim'} · {r.job_title ?? '-'} · {r.employment_status === 'current' ? 'Karyawan' : 'Mantan'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1 text-sm"><Star className="size-3 text-yellow-500" /> {r.rating}/5</span>
                                            {r.would_recommend && <Badge variant="secondary">Direkomendasikan</Badge>}
                                        </div>
                                    </div>
                                    {r.pros && <p className="text-sm"><span className="font-semibold text-green-600">+ </span>{r.pros}</p>}
                                    {r.cons && <p className="text-sm"><span className="font-semibold text-red-600">- </span>{r.cons}</p>}
                                    {r.advice_to_management && <p className="text-sm italic">Saran: {r.advice_to_management}</p>}
                                    <div className="flex items-center justify-between">
                                        <Button
                                            size="sm"
                                            variant={r.has_voted ? 'default' : 'outline'}
                                            disabled={!isAuthenticated}
                                            onClick={() => toggleHelpful(r.id)}
                                        >
                                            <ThumbsUp className="size-4" /> Membantu ({r.helpful_count})
                                        </Button>
                                        <span className="text-xs text-muted-foreground">{r.created_at ? formatDateTime(r.created_at) : ''}</span>
                                    </div>
                                    {r.response_body && (
                                        <div className="rounded border-l-2 border-primary bg-primary/5 p-2 text-sm">
                                            <div className="text-xs text-muted-foreground">Tanggapan dari {company.name} · {r.responded_at ? formatDateTime(r.responded_at) : ''}</div>
                                            <p className="whitespace-pre-line">{r.response_body}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
