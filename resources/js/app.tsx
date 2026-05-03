import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminLayout from '@/layouts/admin-layout';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import EmployeeLayout from '@/layouts/employee-layout';
import EmployerLayout from '@/layouts/employer-layout';
import HomeLayout from '@/layouts/home-layout';
import PublicLayout from '@/layouts/public-layout';
import SettingsLayout from '@/layouts/settings/layout';

function resolveAppName(): string {
    if (typeof document === 'undefined') {
        return 'KarirConnect';
    }

    const pageScript = document.querySelector<HTMLScriptElement>('script[data-page]');

    if (pageScript?.textContent) {
        try {
            const page = JSON.parse(pageScript.textContent) as { props?: { app?: { name?: string } } };

            if (page.props?.app?.name) {
                return page.props.app.name;
            }
        } catch {
            // Ignore malformed page data and keep fallback below.
        }
    }

    return import.meta.env.VITE_APP_NAME || 'KarirConnect';
}

const appName = resolveAppName();

createInertiaApp({
    title: (title) => {
        if (!title) {
            return appName;
        }
        if (title === appName || title.endsWith(` - ${appName}`)) {
            return title;
        }
        return `${title} - ${appName}`;
    },
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return HomeLayout;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name.startsWith('admin/'):
                return AdminLayout;
            case name.startsWith('employer/'):
                return EmployerLayout;
            case name.startsWith('employee/'):
                return EmployeeLayout;
            case name.startsWith('public/'):
                return PublicLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});
