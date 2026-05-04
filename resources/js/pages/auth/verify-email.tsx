import { Form, Head } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Verifikasi Email" />

            <div className="space-y-5 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
                    <Mail className="size-6" />
                </div>

                {status === 'verification-link-sent' && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                        Link verifikasi baru sudah dikirim ke email Anda. Silakan cek inbox / folder spam.
                    </div>
                )}

                <p className="text-sm leading-relaxed text-muted-foreground">
                    Kami sudah mengirimkan link verifikasi ke email Anda. Klik link tersebut untuk
                    mengaktifkan akun lalu kembali ke sini.
                </p>

                <Form {...send.form()} className="space-y-3">
                    {({ processing }) => (
                        <>
                            <Button disabled={processing} className="w-full">
                                {processing && <Spinner />}
                                Kirim ulang email verifikasi
                            </Button>
                            <TextLink href={logout()} className="mx-auto block text-sm">
                                Keluar
                            </TextLink>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verifikasi Email',
    description: 'Cek inbox Anda dan klik link verifikasi yang kami kirim.',
};
