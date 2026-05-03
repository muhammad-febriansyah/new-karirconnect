import type { UserRole } from '@/types';

type RoleMeta = {
    label: string;
    chipClass: string;
};

const META: Record<UserRole, RoleMeta> = {
    admin: {
        label: 'Administrator',
        chipClass: 'bg-brand-blue/10 text-brand-blue ring-1 ring-inset ring-brand-blue/20',
    },
    employer: {
        label: 'Perekrut',
        chipClass: 'bg-brand-cyan/15 text-brand-blue ring-1 ring-inset ring-brand-cyan/30',
    },
    employee: {
        label: 'Kandidat',
        chipClass: 'bg-brand-blue/10 text-brand-navy ring-1 ring-inset ring-brand-blue/20',
    },
};

export function getRoleMeta(role?: UserRole | string): RoleMeta {
    return META[(role as UserRole) ?? 'employee'] ?? META.employee;
}
