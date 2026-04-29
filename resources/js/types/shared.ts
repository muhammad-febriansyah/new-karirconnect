import type { Auth } from './auth';

export type FlashBag = {
    success?: string | null;
    error?: string | null;
    warning?: string | null;
    info?: string | null;
};

export type AppMeta = {
    name: string;
    tagline?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    locale: string;
};

export type Branding = {
    logo_path?: string | null;
    logo_dark_path?: string | null;
    favicon_path?: string | null;
    primary_color?: string | null;
    login_background_path?: string | null;
};

export type SeoMeta = {
    meta_title?: string | null;
    meta_description?: string | null;
    meta_keywords?: string | null;
    og_image_path?: string | null;
    google_analytics_id?: string | null;
    google_tag_manager_id?: string | null;
};

export type FeatureFlags = {
    ai_interview_enabled?: boolean;
    ai_coach_enabled?: boolean;
    talent_search_enabled?: boolean;
    company_reviews_enabled?: boolean;
    salary_insight_enabled?: boolean;
    cv_builder_enabled?: boolean;
    registration_enabled?: boolean;
    [key: string]: boolean | undefined;
};

export type SharedPageProps = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    flash: FlashBag;
    app: AppMeta;
    branding: Branding;
    seo: SeoMeta;
    features: FeatureFlags;
    [key: string]: unknown;
};
