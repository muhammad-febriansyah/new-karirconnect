import { AlertTriangle, RotateCw } from 'lucide-react';
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';

type ErrorStateProps = {
    title?: string;
    description?: string;
    onRetry?: () => void;
    extra?: ReactNode;
};

export function ErrorState({
    title = 'Terjadi kesalahan',
    description = 'Tidak dapat memuat data. Silakan coba lagi beberapa saat lagi.',
    onRetry,
    extra,
}: ErrorStateProps) {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <AlertTriangle className="size-6 text-destructive" />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {(onRetry || extra) && (
                <EmptyContent>
                    {onRetry && (
                        <Button variant="outline" onClick={onRetry}>
                            <RotateCw className="size-4" /> Coba Lagi
                        </Button>
                    )}
                    {extra}
                </EmptyContent>
            )}
        </Empty>
    );
}
