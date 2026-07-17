/**
 * Google Analytics 4 helpers.
 *
 * The gtag snippet is rendered server-side in app.blade.php, and only when a
 * Measurement ID is configured in admin settings. Every function here is a
 * no-op when gtag is absent, so the app behaves identically with analytics off
 * and nothing needs to guard its call sites.
 */

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
    interface Window {
        gtag?: (...args: GtagArgs) => void;
        dataLayer?: unknown[];
    }
}

function gtag(...args: GtagArgs): void {
    // Absent whenever no Measurement ID is set. Callers must not care.
    window.gtag?.(...args);
}

export function isAnalyticsEnabled(): boolean {
    return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Record a page view.
 *
 * Called on every Inertia navigation. The gtag config sets send_page_view:false
 * precisely so this is the only source of page views -- otherwise the first
 * load would be counted twice, and no later navigation would be counted at all.
 */
export function trackPageView(url?: string): void {
    gtag('event', 'page_view', {
        page_location: url ?? window.location.href,
        page_path: window.location.pathname + window.location.search,
        page_title: document.title,
    });
}

/**
 * Record a funnel event.
 *
 * Page views alone answer "how many landed". They cannot answer "where did they
 * stop", which needs named steps.
 */
export function trackEvent(
    name: string,
    params: Record<string, unknown> = {},
): void {
    gtag('event', name, params);
}

/**
 * The signup funnel, named in one place so the event names cannot drift between
 * call sites and the GA4 funnel report silently loses a step.
 */
export const AnalyticsEvent = {
    /** A job detail page was opened. */
    ViewJob: 'view_job',
    /** A register call-to-action was clicked (before the form is shown). */
    ClickRegister: 'click_register',
    /** The register form was rendered. */
    RegisterStart: 'register_start',
    /** The register form was submitted. */
    RegisterSubmit: 'register_submit',
    /** Registration succeeded and an account now exists. */
    RegisterSuccess: 'register_success',
    /** Registration was rejected; `reason` carries the failing fields. */
    RegisterFailed: 'register_failed',
    /** An application was submitted for a job. */
    ApplySubmit: 'apply_submit',
} as const;
