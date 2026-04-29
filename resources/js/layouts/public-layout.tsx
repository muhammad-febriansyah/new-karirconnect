import { Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';
import type { Auth, FeatureFlags } from '@/types';

type PublicLayoutProps = {
    children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
    const props = usePage().props as unknown as {
        auth?: Auth;
        features?: FeatureFlags;
    };
    const auth = props.auth;
    const features = props.features ?? {};

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-2" prefetch>
                        <AppLogo />
                    </Link>

                    <div className="flex items-center gap-2">
                        {auth?.user ? (
                            <Button asChild>
                                <Link href={dashboard()} prefetch>
                                    Masuk Dashboard
                                </Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost">
                                    <Link href={login()} prefetch>
                                        Masuk
                                    </Link>
                                </Button>
                                {features.registration_enabled !== false && (
                                    <Button asChild>
                                        <Link href={register()} prefetch>
                                            Daftar Gratis
                                        </Link>
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {children}
            </main>

            <footer className="mt-16 border-t bg-muted/30">
                <div className="mx-auto w-full max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:px-8">
                    <p>&copy; {new Date().getFullYear()} KarirConnect. Semua hak dilindungi.</p>
                </div>
            </footer>
        </div>
    );
}
