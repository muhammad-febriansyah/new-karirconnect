import { Head, router, useForm } from '@inertiajs/react';
import { Trash2, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/feedback/status-badge';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { destroy as teamDestroy, store as teamStore } from '@/routes/employer/team';

type Member = {
    id: number;
    user_id: number;
    name: string | null;
    email: string | null;
    role: string;
    invited_at: string | null;
    joined_at: string | null;
};

type Props = {
    company: { id: number; name: string; owner_id: number } | null;
    members: Member[];
};

export default function TeamPage({ company, members }: Props) {
    const form = useForm({ email: '', role: 'recruiter' });
    const [deleting, setDeleting] = useState<Member | null>(null);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.post(teamStore().url, {
            preserveScroll: true,
            onSuccess: () => form.reset('email'),
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(teamDestroy(deleting.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleting(null),
        });
    };

    if (!company) {
        return (
            <>
                <Head title="Tim" />
                <div className="space-y-6 p-4 sm:p-6">
                    <PageHeader title="Tim Perusahaan" />
                    <EmptyState
                        title="Perusahaan belum terdaftar"
                        description="Daftarkan perusahaan Anda terlebih dahulu."
                    />
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Tim" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Tim Perusahaan"
                    description="Undang recruiter atau admin untuk membantu mengelola lowongan dan pelamar."
                />

                <Section title="Undang Anggota Baru">
                    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_200px_auto] md:items-end">
                        <InputField
                            label="Email Pengguna"
                            type="email"
                            required
                            placeholder="email@domain.com"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            error={form.errors.email}
                        />
                        <SelectField
                            label="Peran"
                            value={form.data.role}
                            onValueChange={(v) => form.setData('role', v)}
                            options={[
                                { value: 'recruiter', label: 'Recruiter' },
                                { value: 'admin', label: 'Admin Perusahaan' },
                            ]}
                            error={form.errors.role}
                        />
                        <Button type="submit" disabled={form.processing}>
                            <UserPlus className="size-4" /> Undang
                        </Button>
                    </form>
                </Section>

                <Section title={`Anggota (${members.length})`}>
                    {members.length === 0 ? (
                        <EmptyState
                            title="Belum ada anggota"
                            description="Mulai bangun tim hiring dengan menambahkan recruiter."
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Peran</TableHead>
                                    <TableHead className="text-right">Aksi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((m) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-medium">{m.name}</TableCell>
                                        <TableCell>{m.email}</TableCell>
                                        <TableCell>
                                            <StatusBadge tone={m.role === 'owner' ? 'primary' : 'secondary'}>
                                                {m.role}
                                            </StatusBadge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {m.user_id !== company.owner_id && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setDeleting(m)}
                                                >
                                                    <Trash2 className="size-4" /> Hapus
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Hapus anggota tim?"
                description={
                    deleting
                        ? `${deleting.name} akan kehilangan akses ke perusahaan ini.`
                        : ''
                }
                confirmLabel="Hapus"
                variant="destructive"
                confirmIcon={Trash2}
                onConfirm={confirmDelete}
            />
        </>
    );
}
