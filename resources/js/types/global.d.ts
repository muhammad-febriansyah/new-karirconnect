import type { Auth } from '@/types/auth';
import type { AppMeta, Branding, FeatureFlags, FlashBag, SeoMeta } from '@/types/shared';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            flash: FlashBag;
            app: AppMeta;
            branding: Branding;
            seo: SeoMeta;
            features: FeatureFlags;
        };
    }
}
