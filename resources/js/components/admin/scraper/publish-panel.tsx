import { useHttp } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import ExternalJobController from '@/actions/App/Http/Controllers/Admin/Scraper/ExternalJobController';
import { Button } from '@/components/ui/button';

type PublishResponse = {
    type: 'success' | 'warning' | 'error';
    message: string;
    published: Array<{ listing_id: number; job_id: number; slug: string }>;
    skipped: Array<{ listing_id: number; title: string; reason: string }>;
};

type PublishForm = {
    listing_ids: number[];
    all_matching: boolean;
    filters: Record<string, string>;
};

/**
 * Publishes the target listings. What the source did not state is filled in
 * on the server: the category from the job title, then full-time, on-site
 * and mid level.
 */
export function PublishPanel({
    target,
    onPublished,
}: {
    target:
        | { listingIds: number[] }
        | {
              allMatching: true;
              filters: Record<string, string>;
              count: number;
          };
    onPublished?: (response: PublishResponse) => void;
}) {
    const http = useHttp<PublishForm, PublishResponse>({
        listing_ids: [],
        all_matching: false,
        filters: {},
    });

    const count =
        'listingIds' in target ? target.listingIds.length : target.count;
    const errors = http.errors as Record<string, string | undefined>;

    const publish = () => {
        http.transform((data) => ({
            ...data,
            ...('listingIds' in target
                ? {
                      listing_ids: target.listingIds,
                      all_matching: false,
                      filters: {},
                  }
                : {
                      listing_ids: [],
                      all_matching: true,
                      filters: target.filters,
                  }),
        }));

        http.post(ExternalJobController.publish().url, {
            onSuccess: (response) => {
                const show =
                    response.type === 'success'
                        ? toast.success
                        : response.type === 'warning'
                          ? toast.warning
                          : toast.error;
                const skippedReasons = Array.from(
                    new Set(response.skipped.map((item) => item.reason)),
                ).slice(0, 3);
                show(
                    response.type === 'success'
                        ? 'Berhasil'
                        : 'Perlu perhatian',
                    {
                        description: [response.message, ...skippedReasons].join(
                            ' ',
                        ),
                        duration: 10000,
                    },
                );
                onPublished?.(response);
            },
            onError: (errors) => {
                toast.error('Gagal mempublish', {
                    description:
                        Object.values(errors)[0] ??
                        'Periksa isian lalu coba lagi.',
                });
            },
            onHttpException: () => {
                toast.error('Terjadi masalah', {
                    description:
                        'Server menolak permintaan publish. Coba lagi.',
                });
            },
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    Kategori, tipe pekerjaan, sistem kerja, dan level yang tidak
                    disebut sumber diisi otomatis. Lowongan yang sudah
                    dipublish, tidak aktif, atau judulnya sudah tayang untuk
                    perusahaan yang sama dilewati.
                </p>
                <Button
                    onClick={publish}
                    disabled={http.processing || count === 0}
                >
                    <Send className="size-4" />
                    {http.processing
                        ? 'Mempublish…'
                        : 'listingIds' in target
                          ? `Publish ${count} terpilih`
                          : `Publish semua (${count})`}
                </Button>
            </div>
            {errors.listing_ids && (
                <p className="text-sm text-destructive">{errors.listing_ids}</p>
            )}
        </div>
    );
}
