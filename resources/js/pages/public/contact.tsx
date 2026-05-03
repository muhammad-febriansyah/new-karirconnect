import { Head, useForm } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { store as contactStore } from '@/routes/public/contact';
import { InputField } from '@/components/form/input-field';
import { TextareaField } from '@/components/form/textarea-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';

export default function PublicContact() {
    const form = useForm({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    return (
        <>
            <Head title="Kontak" />
            <div className="space-y-6">
                <PageHeader
                    title="Hubungi Tim KarirConnect"
                    description="Butuh bantuan, kerja sama, atau ingin mengirim masukan? Kirim pesan lewat form ini."
                />

                <Section>
                    <form
                        className="grid gap-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            form.post(contactStore().url, { preserveScroll: true });
                        }}
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <InputField label="Nama" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} error={form.errors.name} required />
                            <InputField label="Email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} error={form.errors.email} required />
                        </div>
                        <InputField label="Subjek" value={form.data.subject} onChange={(event) => form.setData('subject', event.target.value)} error={form.errors.subject} required />
                        <TextareaField label="Pesan" rows={8} value={form.data.message} onChange={(event) => form.setData('message', event.target.value)} error={form.errors.message} required />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={form.processing}>
                                <Send className="size-4" />
                                Kirim Pesan
                            </Button>
                        </div>
                    </form>
                </Section>
            </div>
        </>
    );
}
