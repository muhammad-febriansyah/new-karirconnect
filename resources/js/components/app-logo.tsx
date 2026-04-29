import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import type { AppMeta, Branding } from '@/types/shared';

export default function AppLogo() {
    const props = usePage().props as unknown as {
        app?: AppMeta;
        branding?: Branding;
    };

    const name = props.app?.name ?? 'KarirConnect';
    const logo = props.branding?.logo_path;

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                {logo ? (
                    <img src={logo} alt={name} className="size-full object-contain" />
                ) : (
                    <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                )}
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {name}
                </span>
            </div>
        </>
    );
}
