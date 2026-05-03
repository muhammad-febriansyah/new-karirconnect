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

    if (logo) {
        return (
            <>
                <img
                    src={logo}
                    alt={name}
                    className="h-9 w-auto max-w-full object-contain group-data-[collapsible=icon]:h-7"
                />
                <div className="grid flex-1 text-left leading-none group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-[15px] font-bold tracking-tight text-brand-navy">
                        {name}
                    </span>
                    <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-blue/70">
                        Career Platform
                    </span>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="relative flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-lg shadow-brand-blue/30">
                <AppLogoIcon className="size-5 fill-current text-white" />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/30" />
            </div>
            <div className="grid flex-1 text-left leading-none group-data-[collapsible=icon]:hidden">
                <span className="truncate text-[15px] font-bold tracking-tight text-brand-navy">
                    {name}
                </span>
                <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-blue/70">
                    Career Platform
                </span>
            </div>
        </>
    );
}
