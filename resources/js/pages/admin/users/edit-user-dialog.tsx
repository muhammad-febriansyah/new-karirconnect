import { useForm } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { type FormEvent, useEffect } from 'react';
import { InputField } from '@/components/form/input-field';
import { SelectField } from '@/components/form/select-field';
import { TextareaField } from '@/components/form/textarea-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { update as updateRoute } from '@/routes/admin/users';

type Option = { value: string; label: string };

type UserShape = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    phone: string | null;
    address: string | null;
    is_active: boolean;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserShape;
    roleOptions: Option[];
    /** When true, the role and is_active controls are disabled (used to prevent self-modification of own admin status). */
    isSelf?: boolean;
};

export function EditUserDialog({ open, onOpenChange, user, roleOptions, isSelf = false }: Props) {
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm({
        name: user.name,
        email: user.email,
        role: user.role ?? 'employee',
        phone: user.phone ?? '',
        address: user.address ?? '',
        is_active: user.is_active,
    });

    useEffect(() => {
        if (open) {
            setData({
                name: user.name,
                email: user.email,
                role: user.role ?? 'employee',
                phone: user.phone ?? '',
                address: user.address ?? '',
                is_active: user.is_active,
            });
            clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user.id]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(updateRoute(user.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                onOpenChange(false);
                reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Edit pengguna</DialogTitle>
                    <DialogDescription>
                        Perbarui data dasar, role, dan status aktivasi akun. Perubahan akan tercatat di audit log.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <InputField
                        id="name"
                        label="Nama lengkap"
                        required
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        error={errors.name}
                    />

                    <InputField
                        id="email"
                        type="email"
                        label="Email"
                        required
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        error={errors.email}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField
                            id="role"
                            label="Role"
                            required
                            value={data.role}
                            onValueChange={(v) => setData('role', v)}
                            options={roleOptions}
                            error={errors.role}
                            disabled={isSelf}
                            description={isSelf ? 'Anda tidak dapat mengubah role akun Anda sendiri.' : undefined}
                        />

                        <InputField
                            id="phone"
                            label="Telepon"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            error={errors.phone}
                            placeholder="+62 812..."
                        />
                    </div>

                    <TextareaField
                        id="address"
                        label="Alamat"
                        rows={3}
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        error={errors.address}
                    />

                    <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 p-3">
                        <div>
                            <div className="text-sm font-medium">Status aktivasi</div>
                            <p className="text-xs text-muted-foreground">
                                {data.is_active
                                    ? 'Akun ini aktif dan dapat login ke platform.'
                                    : 'Akun ini dinonaktifkan dan tidak dapat login.'}
                            </p>
                            {errors.is_active && (
                                <p className="mt-1 text-xs text-destructive">{errors.is_active}</p>
                            )}
                        </div>
                        <Switch
                            checked={data.is_active}
                            onCheckedChange={(v) => setData('is_active', Boolean(v))}
                            disabled={isSelf}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Simpan perubahan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
