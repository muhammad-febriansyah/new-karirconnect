import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';

export default function SettingsLayout({ children }: PropsWithChildren) {
    return (
        <div className="px-4 py-6">
            <Heading
                title="Pengaturan"
                description="Kelola profil dan preferensi akun Anda"
            />

            <div className="max-w-5xl">
                <section className="space-y-12">
                    {children}
                </section>
            </div>
        </div>
    );
}
