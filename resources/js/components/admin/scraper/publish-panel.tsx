import { useHttp } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import ExternalJobController from '@/actions/App/Http/Controllers/Admin/Scraper/ExternalJobController';
import { SelectField } from '@/components/form/select-field';
import { Button } from '@/components/ui/button';
import type { Option } from '@/types/scraper';

export type PublishDefaults = {
    employmentTypes: Option[];
    workArrangements: Option[];
    experienceLevels: Option[];
};

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
    job_category_id: string;
    employment_type: string;
    work_arrangement: string;
    experience_level: string;
};

const NO_CATEGORY = 'none';

/**
 * Fallback values for listings the source did not describe, then publish.
 * Values the source did give always win over these.
 */
export function PublishPanel({
    target,
    categoryOptions,
    defaults,
    onPublished,
}: {
    target:
        | { listingIds: number[] }
        | {
              allMatching: true;
              filters: Record<string, string>;
              count: number;
          };
    categoryOptions: Option[];
    defaults: PublishDefaults;
    onPublished?: (response: PublishResponse) => void;
}) {
    const http = useHttp<PublishForm, PublishResponse>({
        listing_ids: [],
        all_matching: false,
        filters: {},
        job_category_id: NO_CATEGORY,
        employment_type: 'full_time',
        work_arrangement: 'onsite',
        experience_level: 'mid',
    });

    const count =
        'listingIds' in target ? target.listingIds.length : target.count;
    const errors = http.errors as Record<string, string | undefined>;

    const publish = () => {
        http.transform((data) => ({
            ...data,
            job_category_id:
                data.job_category_id === NO_CATEGORY
                    ? null
                    : Number(data.job_category_id),
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelectField
                    id="publish_category"
                    label="Kategori untuk yang belum terpetakan"
                    value={http.data.job_category_id}
                    onValueChange={(value) =>
                        http.setData('job_category_id', value)
                    }
                    options={[
                        {
                            value: NO_CATEGORY,
                            label: 'Jangan publish yang tanpa kategori',
                        },
                        ...categoryOptions,
                    ]}
                    error={errors.job_category_id}
                />
                <SelectField
                    id="publish_employment"
                    label="Tipe pekerjaan bila kosong"
                    value={http.data.employment_type}
                    onValueChange={(value) =>
                        http.setData('employment_type', value)
                    }
                    options={defaults.employmentTypes}
                    error={errors.employment_type}
                />
                <SelectField
                    id="publish_arrangement"
                    label="Sistem kerja bila kosong"
                    value={http.data.work_arrangement}
                    onValueChange={(value) =>
                        http.setData('work_arrangement', value)
                    }
                    options={defaults.workArrangements}
                    error={errors.work_arrangement}
                />
                <SelectField
                    id="publish_level"
                    label="Level bila kosong"
                    value={http.data.experience_level}
                    onValueChange={(value) =>
                        http.setData('experience_level', value)
                    }
                    options={defaults.experienceLevels}
                    error={errors.experience_level}
                />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                    Lowongan yang sudah dipublish, tidak aktif, atau judulnya
                    sudah tayang untuk perusahaan yang sama akan dilewati.
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
