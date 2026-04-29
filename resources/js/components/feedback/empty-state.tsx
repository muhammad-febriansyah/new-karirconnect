import { Inbox, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

type EmptyStateProps = {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actions?: ReactNode;
};

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    actions,
}: EmptyStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <Icon className="size-6" />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                {description && <EmptyDescription>{description}</EmptyDescription>}
            </EmptyHeader>
            {actions && <EmptyContent>{actions}</EmptyContent>}
        </Empty>
    );
}
