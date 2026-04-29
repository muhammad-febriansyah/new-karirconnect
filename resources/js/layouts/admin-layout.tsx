import AppLayout from '@/layouts/app-layout';
import type { AppLayoutProps } from '@/types';

export default function AdminLayout({ children, breadcrumbs }: AppLayoutProps) {
    return <AppLayout breadcrumbs={breadcrumbs}>{children}</AppLayout>;
}
