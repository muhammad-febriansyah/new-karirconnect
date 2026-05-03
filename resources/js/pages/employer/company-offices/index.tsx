import { Head, Link, router } from '@inertiajs/react';
import { Building2, MapPin, Phone, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useState } from 'react';

type Office = {
    id: number;
    label: string;
    province: { id: number; name: string } | null;
    city: { id: number; name: string } | null;
    address: string | null;
    contact_phone: string | null;
    map_url: string | null;
    is_headquarter: boolean;
    updated_at: string | null;
};

type Props = {
    company: { id: number; name: string };
    offices: Office[];
};

export default function EmployerCompanyOfficesIndex({ company, offices }: Props) {
    const [pendingDelete, setPendingDelete] = useState<Office | null>(null);

    const remove = () => {
        if (!pendingDelete) return;
        router.delete(`/employer/company-offices/${pendingDelete.id}`, {
            preserveScroll: true,
            onFinish: () => setPendingDelete(null),
        });
    };

    return (
        <>
            <Head title="Lokasi Kantor" />
            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Lokasi Kantor"
                    description={`Kelola seluruh lokasi kantor ${company.name}. Tandai satu sebagai kantor pusat.`}
                    actions={
                        <Button asChild>
                            <Link href="/employer/company-offices/create">
                                <Plus className="size-4" /> Tambah Lokasi
                            </Link>
                        </Button>
                    }
                />

                <Section>
                    {offices.length === 0 ? (
                        <EmptyState
                            icon={Building2}
                            title="Belum ada lokasi kantor"
                            description="Tambah satu atau lebih lokasi kantor agar kandidat melihat di mana mereka akan bekerja."
                            actions={
                                <Button asChild>
                                    <Link href="/employer/company-offices/create">
                                        <Plus className="size-4" /> Tambah Lokasi
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {offices.map((office) => (
                                <Card
                                    key={office.id}
                                    className="group relative overflow-hidden transition-shadow hover:shadow-md"
                                >
                                    {office.is_headquarter && (
                                        <div className="absolute right-0 top-0 bg-primary px-3 py-1 text-xs font-medium text-primary-foreground rounded-bl-md">
                                            <span className="flex items-center gap-1">
                                                <Star className="size-3 fill-current" /> Kantor Pusat
                                            </span>
                                        </div>
                                    )}
                                    <CardContent className="space-y-4 p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                <Building2 className="size-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="truncate font-semibold leading-tight">{office.label}</h3>
                                                {(office.city || office.province) && (
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {[office.city?.name, office.province?.name].filter(Boolean).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {office.address && (
                                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <MapPin className="mt-0.5 size-4 shrink-0" />
                                                <span className="line-clamp-2">{office.address}</span>
                                            </div>
                                        )}
                                        {office.contact_phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="size-4 shrink-0" />
                                                <a href={`tel:${office.contact_phone}`} className="hover:text-foreground hover:underline">
                                                    {office.contact_phone}
                                                </a>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                            {office.map_url ? (
                                                <a
                                                    href={office.map_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    Buka di peta →
                                                </a>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs">Tanpa peta</Badge>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Button asChild size="sm" variant="ghost" aria-label={`Edit ${office.label}`}>
                                                    <Link href={`/employer/company-offices/${office.id}/edit`}>
                                                        <Pencil className="size-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setPendingDelete(office)}
                                                    className="text-destructive hover:text-destructive"
                                                    aria-label={`Hapus ${office.label}`}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </Section>
            </div>

            <ConfirmDialog
                open={pendingDelete !== null}
                onOpenChange={(open) => !open && setPendingDelete(null)}
                title="Hapus lokasi kantor?"
                description={`Lokasi "${pendingDelete?.label ?? ''}" akan dihapus secara permanen.`}
                confirmLabel="Hapus"
                variant="destructive"
                onConfirm={remove}
            />
        </>
    );
}
