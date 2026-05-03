import { Head, usePage } from '@inertiajs/react';
import type { SharedPageProps } from '@/types';

type SeoHeadProps = {
    title: string;
    description?: string | null;
    canonical?: string | null;
    keywords?: string | null;
    image?: string | null;
    robots?: string | null;
    type?: 'website' | 'article';
    jsonLd?: Record<string, unknown> | null;
};

function normalizeUrl(url: string): string {
    const parsed = new URL(url);
    if (parsed.pathname === '/' && parsed.search === '' && parsed.hash === '') {
        return `${parsed.protocol}//${parsed.host}`;
    }
    return parsed.toString();
}

function resolveCanonical(baseUrl: string, currentUrl?: string, explicitCanonical?: string | null): string | undefined {
    if (typeof window === 'undefined') {
        return normalizeUrl(new URL(explicitCanonical ?? currentUrl ?? '/', baseUrl).toString());
    }

    if (explicitCanonical) {
        return normalizeUrl(new URL(explicitCanonical, window.location.origin).toString());
    }

    return normalizeUrl(new URL(currentUrl ?? window.location.pathname, window.location.origin).toString());
}

export function SeoHead({
    title,
    description,
    canonical,
    keywords,
    image,
    robots = 'index,follow',
    type = 'website',
    jsonLd,
}: SeoHeadProps) {
    const page = usePage<SharedPageProps>();
    const appName = page.props.app.name;
    const defaultDescription = page.props.seo.meta_description ?? undefined;
    const defaultKeywords = page.props.seo.meta_keywords ?? undefined;
    const defaultImage = page.props.seo.og_image_path ?? page.props.branding.logo_path ?? undefined;
    const locale = page.props.app.locale.replace('-', '_');
    const resolvedTitle = title.includes(` - ${appName}`) || title === appName ? title : `${title} - ${appName}`;
    const resolvedDescription = description ?? defaultDescription;
    const resolvedCanonical = resolveCanonical(page.props.app.url, (page as { url?: string }).url, canonical);
    const resolvedKeywords = keywords ?? defaultKeywords;
    const resolvedImage = image ?? defaultImage;

    return (
        <Head>
            <title head-key="title">{resolvedTitle}</title>
            <meta head-key="robots" name="robots" content={robots ?? 'index,follow'} />
            {resolvedCanonical && <link head-key="canonical" rel="canonical" href={resolvedCanonical} />}
            {resolvedDescription && <meta head-key="description" name="description" content={resolvedDescription} />}
            {resolvedKeywords && <meta head-key="keywords" name="keywords" content={resolvedKeywords} />}
            <meta head-key="og:title" property="og:title" content={resolvedTitle} />
            <meta head-key="og:type" property="og:type" content={type} />
            {resolvedCanonical && <meta head-key="og:url" property="og:url" content={resolvedCanonical} />}
            <meta head-key="og:site_name" property="og:site_name" content={appName} />
            <meta head-key="og:locale" property="og:locale" content={locale} />
            {resolvedDescription && <meta head-key="og:description" property="og:description" content={resolvedDescription} />}
            <meta head-key="twitter:card" name="twitter:card" content="summary_large_image" />
            <meta head-key="twitter:title" name="twitter:title" content={resolvedTitle} />
            {resolvedDescription && <meta head-key="twitter:description" name="twitter:description" content={resolvedDescription} />}
            {resolvedImage && <meta head-key="og:image" property="og:image" content={resolvedImage} />}
            {resolvedImage && <meta head-key="twitter:image" name="twitter:image" content={resolvedImage} />}
            {jsonLd && (
                <script
                    head-key="structured-data"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
        </Head>
    );
}
