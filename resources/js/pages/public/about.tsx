import { Head } from '@inertiajs/react';
import * as Icons from 'lucide-react';
import { type ComponentType } from 'react';
import { SafeHtml } from '@/components/shared/safe-html';
import { Card, CardContent } from '@/components/ui/card';

type ValueItem = { icon?: string | null; title: string; body?: string | null };
type StatItem = { number: string; label: string; description?: string | null };
type TeamItem = {
    name: string;
    role?: string | null;
    bio_short?: string | null;
    linkedin_url?: string | null;
    photo_url?: string | null;
};

type PageProps = {
    page: {
        hero_title: string | null;
        hero_subtitle: string | null;
        hero_image_url: string | null;
        story_body: string | null;
        vision: string | null;
        mission: string | null;
        values: ValueItem[];
        stats: StatItem[];
        team_members: TeamItem[];
        office_address: string | null;
        office_map_embed: string | null;
        seo_title: string | null;
        seo_description: string | null;
    };
};

const titleCase = (key: string): string => key.charAt(0).toUpperCase() + key.slice(1);

function ValueIcon({ name, className }: { name?: string | null; className?: string }) {
    if (!name) {
        return <Icons.Sparkles className={className} />;
    }

    const componentName = titleCase(
        name
            .split(/[-_\s]+/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(''),
    );

    const Component = (Icons as unknown as Record<string, ComponentType<{ className?: string }>>)[componentName];

    return Component ? <Component className={className} /> : <Icons.Sparkles className={className} />;
}

export default function PublicAbout({ page }: PageProps) {
    const hasContent = page.hero_title || page.story_body || page.values.length > 0;

    return (
        <>
            <Head>
                <title>{page.seo_title ?? page.hero_title ?? 'Tentang Kami'}</title>
                {page.seo_description && <meta name="description" content={page.seo_description} />}
                <meta property="og:title" content={page.seo_title ?? page.hero_title ?? 'Tentang Kami'} />
                {page.seo_description && <meta property="og:description" content={page.seo_description} />}
                {page.hero_image_url && <meta property="og:image" content={page.hero_image_url} />}
            </Head>

            <div className="space-y-16">
                {/* HERO */}
                {(page.hero_title || page.hero_image_url) && (
                    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-background">
                        {page.hero_image_url && (
                            <div className="absolute inset-0 -z-10 opacity-30">
                                <img src={page.hero_image_url} alt="" className="size-full object-cover" />
                            </div>
                        )}
                        <div className="px-6 py-20 sm:px-12 sm:py-28">
                            <div className="max-w-3xl space-y-4">
                                <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
                                    {page.hero_title ?? 'Tentang Kami'}
                                </h1>
                                {page.hero_subtitle && (
                                    <p className="text-lg text-muted-foreground sm:text-xl">{page.hero_subtitle}</p>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {/* STORY */}
                {page.story_body && (
                    <section className="grid gap-8 lg:grid-cols-[1fr_2fr]">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Cerita Kami</div>
                            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Perjalanan KarirConnect</h2>
                        </div>
                        <SafeHtml html={page.story_body} className="prose prose-sm max-w-none dark:prose-invert sm:prose-base" />
                    </section>
                )}

                {/* VISI MISI */}
                {(page.vision || page.mission) && (
                    <section className="grid gap-6 sm:grid-cols-2">
                        {page.vision && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Icons.Eye className="size-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Visi</h3>
                                    </div>
                                    <SafeHtml html={page.vision} className="prose prose-sm max-w-none dark:prose-invert" />
                                </CardContent>
                            </Card>
                        )}
                        {page.mission && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="mb-3 flex items-center gap-2">
                                        <Icons.Target className="size-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Misi</h3>
                                    </div>
                                    <SafeHtml html={page.mission} className="prose prose-sm max-w-none dark:prose-invert" />
                                </CardContent>
                            </Card>
                        )}
                    </section>
                )}

                {/* VALUES */}
                {page.values.length > 0 && (
                    <section className="space-y-6">
                        <div className="text-center">
                            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Nilai Inti</div>
                            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Yang Kami Pegang Teguh</h2>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {page.values.map((v, i) => (
                                <Card key={i}>
                                    <CardContent className="space-y-3 p-6">
                                        <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <ValueIcon name={v.icon} className="size-5" />
                                        </div>
                                        <h3 className="font-semibold">{v.title}</h3>
                                        {v.body && <p className="text-sm text-muted-foreground">{v.body}</p>}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* STATS */}
                {page.stats.length > 0 && (
                    <section className="rounded-3xl border bg-primary/5 p-6 sm:p-12">
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {page.stats.map((s, i) => (
                                <div key={i} className="text-center">
                                    <div className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{s.number}</div>
                                    <div className="mt-1 text-sm font-medium">{s.label}</div>
                                    {s.description && (
                                        <div className="mt-1 text-xs text-muted-foreground">{s.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* TEAM */}
                {page.team_members.length > 0 && (
                    <section className="space-y-6">
                        <div className="text-center">
                            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Tim Kami</div>
                            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Orang di Balik KarirConnect</h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {page.team_members.map((m, i) => (
                                <Card key={i}>
                                    <CardContent className="space-y-3 p-6 text-center">
                                        {m.photo_url ? (
                                            <img
                                                src={m.photo_url}
                                                alt={m.name}
                                                className="mx-auto size-24 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-muted">
                                                <Icons.User className="size-10 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold">{m.name}</h3>
                                            {m.role && <p className="text-sm text-primary">{m.role}</p>}
                                        </div>
                                        {m.bio_short && <p className="text-sm text-muted-foreground">{m.bio_short}</p>}
                                        {m.linkedin_url && (
                                            <a
                                                href={m.linkedin_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                            >
                                                <Icons.Linkedin className="size-3" /> LinkedIn
                                            </a>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </section>
                )}

                {/* OFFICE */}
                {(page.office_address || page.office_map_embed) && (
                    <section className="grid gap-6 lg:grid-cols-2">
                        {page.office_address && (
                            <Card>
                                <CardContent className="space-y-3 p-6">
                                    <div className="flex items-center gap-2">
                                        <Icons.MapPin className="size-5 text-primary" />
                                        <h3 className="text-lg font-semibold">Kantor Pusat</h3>
                                    </div>
                                    <p className="whitespace-pre-line text-sm text-muted-foreground">{page.office_address}</p>
                                </CardContent>
                            </Card>
                        )}
                        {page.office_map_embed && (
                            <div className="aspect-video overflow-hidden rounded-xl border">
                                <iframe
                                    src={page.office_map_embed}
                                    title="Lokasi Kantor"
                                    className="size-full"
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        )}
                    </section>
                )}

                {!hasContent && (
                    <div className="rounded-xl border border-dashed bg-muted/30 p-12 text-center text-sm text-muted-foreground">
                        Halaman ini belum dikonfigurasi. Admin dapat melengkapi konten lewat dashboard.
                    </div>
                )}
            </div>
        </>
    );
}
