import { Form, Head } from '@inertiajs/react';
import CvUploadController from '@/actions/App/Http/Controllers/Employee/CvUploadController';
import { FileUploadField } from '@/components/form/file-upload-field';
import { InputField } from '@/components/form/input-field';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

type CvItem = {
    id: number;
    label: string;
    source: string;
    file_path: string | null;
    file_url: string | null;
    is_active: boolean;
    created_at: string;
};

export default function EmployeeCvIndex({
    items,
    primaryResumeId,
}: {
    items: CvItem[];
    primaryResumeId: number | null;
}) {
    return (
        <>
            <Head title="CV Saya" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="CV Saya"
                    description="Unggah beberapa versi CV dan tandai satu versi sebagai resume utama."
                    actions={<UploadCvDialog />}
                />

                <Section>
                    {items.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                            Belum ada CV yang diunggah.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <h2 className="font-medium">{item.label}</h2>
                                            {item.is_active && primaryResumeId === item.id && (
                                                <Badge>Resume Utama</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Sumber: {item.source === 'upload' ? 'Upload' : item.source}
                                        </p>
                                        {item.file_url && (
                                            <a
                                                href={item.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm text-primary underline-offset-4 hover:underline"
                                            >
                                                Lihat file
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <EditCvDialog item={item} />
                                        <DeleteCvDialog item={item} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>
        </>
    );
}

function UploadCvDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button>Unggah CV</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Unggah CV</DialogTitle>
                    <DialogDescription>
                        Simpan versi CV yang berbeda sesuai posisi yang Anda incar.
                    </DialogDescription>
                </DialogHeader>

                <Form {...CvUploadController.store.form()} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <InputField
                                name="label"
                                label="Label CV"
                                placeholder="CV Backend 2026"
                                required
                                error={errors.label}
                            />
                            <FileUploadField
                                id="file"
                                name="file"
                                label="File CV"
                                required
                                accept=".pdf,.doc,.docx"
                                error={errors.file}
                            />

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Simpan
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function EditCvDialog({ item }: { item: CvItem }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">Ubah</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Ubah CV</DialogTitle>
                    <DialogDescription>
                        Perbarui label atau tandai CV ini sebagai resume utama.
                    </DialogDescription>
                </DialogHeader>

                <Form {...CvUploadController.update.form(item.id)} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <InputField
                                name="label"
                                label="Label CV"
                                defaultValue={item.label}
                                required
                                error={errors.label}
                            />
                            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    defaultChecked={item.is_active}
                                    className="size-4 rounded border-input"
                                />
                                <span className="text-sm">Jadikan resume utama</span>
                            </label>

                            <DialogFooter>
                                <Button type="submit" disabled={processing}>
                                    Perbarui
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteCvDialog({ item }: { item: CvItem }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="destructive">Hapus</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Hapus CV</DialogTitle>
                    <DialogDescription>
                        CV <span className="font-medium text-foreground">{item.label}</span> akan dihapus permanen.
                    </DialogDescription>
                </DialogHeader>

                <Form {...CvUploadController.destroy.form(item.id)}>
                    {({ processing }) => (
                        <DialogFooter>
                            <Button type="submit" variant="destructive" disabled={processing}>
                                Hapus
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

EmployeeCvIndex.layout = {
    breadcrumbs: [
        {
            title: 'CV Saya',
            href: CvUploadController.index().url,
        },
    ],
};
