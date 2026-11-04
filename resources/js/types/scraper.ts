export type Tone =
    | 'success'
    | 'warning'
    | 'destructive'
    | 'secondary'
    | 'muted'
    | 'info'
    | 'primary';

export type Option = { value: string; label: string };

export type Paginator<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

export type SourceRef = {
    id: number;
    name: string;
    slug: string;
    type: string;
    type_label: string;
    trashed: boolean;
};

export type RunRow = {
    id: number;
    uuid: string;
    status: string;
    status_label: string;
    status_tone: Tone;
    is_finished: boolean;
    trigger: string;
    trigger_label: string;
    engine_used: string | null;
    items_found: number;
    items_created: number;
    items_updated: number;
    items_unchanged: number;
    items_rejected: number;
    errors_count: number | null;
    duration_ms: number | null;
    started_at: string | null;
    finished_at: string | null;
    created_at: string | null;
    cancel_requested: boolean;
    source: SourceRef | null;
    triggered_by: string | null;
};

export type ErrorRow = {
    id: number;
    crawl_run_id: number;
    engine: string | null;
    category: string;
    category_label: string;
    http_status: number | null;
    url: string | null;
    message: string;
    retryable: boolean;
    non_fatal: boolean;
    context: Record<string, unknown> | null;
    occurred_at: string | null;
    source: SourceRef | null;
};
