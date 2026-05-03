import { Head } from '@inertiajs/react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { sanitizeHtml } from '@/lib/sanitize-html';

type Props = {
    page: {
        slug: string;
        title: string;
        body: string;
        updated_at: string | null;
    };
};

export default function PublicLegalShow({ page }: Props) {
    return (
        <>
            <Head title={page.title} />
            <div className="space-y-6">
                <PageHeader
                    title={page.title}
                    description="Dokumen legal resmi KarirConnect."
                />

                <Section>
                    <article
                        className="prose prose-neutral max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }}
                    />
                </Section>
            </div>
        </>
    );
}
