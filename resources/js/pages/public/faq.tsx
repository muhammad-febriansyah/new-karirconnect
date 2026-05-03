import { Head } from '@inertiajs/react';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { sanitizeHtml } from '@/lib/sanitize-html';

type Props = {
    items: Array<{
        id: number;
        question: string;
        answer: string;
        category: string | null;
    }>;
};

export default function PublicFaq({ items }: Props) {
    return (
        <>
            <Head title="FAQ" />
            <div className="space-y-6">
                <PageHeader
                    title="Pertanyaan yang Sering Ditanyakan"
                    description="Jawaban singkat untuk hal-hal yang paling sering ditanyakan kandidat dan employer."
                />

                <Section>
                    <Accordion type="single" collapsible className="w-full">
                        {items.map((item) => (
                            <AccordionItem key={item.id} value={`faq-${item.id}`}>
                                <AccordionTrigger className="text-left">
                                    <div className="flex items-center gap-2">
                                        {item.category && <Badge variant="outline">{item.category}</Badge>}
                                        <span>{item.question}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.answer) }} />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </Section>
            </div>
        </>
    );
}
