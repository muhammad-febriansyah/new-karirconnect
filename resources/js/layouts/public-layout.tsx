import { type ReactNode } from 'react';
import HomeLayout from '@/layouts/home-layout';

type PublicLayoutProps = {
    children: ReactNode;
};

/**
 * Thin wrapper that applies the standard public page container width
 * around content rendered inside the shared HomeLayout chrome.
 */
export default function PublicLayout({ children }: PublicLayoutProps) {
    return (
        <HomeLayout>
            <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {children}
            </div>
        </HomeLayout>
    );
}
