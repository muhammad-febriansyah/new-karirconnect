<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Python worker
    |--------------------------------------------------------------------------
    |
    | Laravel starts `python -m karir_crawler.cli` in `worker_path` for each
    | crawl run, writes the request JSON to stdin and reads the response from
    | stdout. Relative paths are resolved against the project root.
    |
    */

    'python' => env('CRAWLER_PYTHON', 'crawler/.venv/bin/python'),

    'worker_path' => env('CRAWLER_WORKER_PATH', 'crawler'),

    'user_agent' => env('CRAWLER_USER_AGENT', 'KarirConnectBot/0.1'),

    /*
    | Only used when CRAWLER_PYTHON points at crawler/bin/docker-worker.
    | Passed to the worker process explicitly so the wrapper sees them.
    */
    'docker' => [
        'image' => env('CRAWLER_IMAGE', 'karir-crawler:api'),
        'lock_dir' => env('CRAWLER_LOCK_DIR', '/tmp/karir-crawler-locks'),
        'memory' => env('CRAWLER_MEMORY', '1g'),
        'cpus' => env('CRAWLER_CPUS', '1'),
    ],

    /*
    | Hard limit for one run, passed to the worker as its own budget. The
    | process gets a little extra so the worker can report its own timeout.
    */
    'timeout_seconds' => (int) env('CRAWLER_TIMEOUT', 300),

    'max_items_per_run' => (int) env('CRAWLER_MAX_ITEMS', 2000),

    // Queue connection defined in config/queue.php with a long retry_after.
    'connection' => 'crawler',

    'queue' => env('CRAWLER_QUEUE', 'crawler'),

    /*
    |--------------------------------------------------------------------------
    | Failure handling
    |--------------------------------------------------------------------------
    */

    'circuit_breaker' => [
        // Consecutive failed / access-restricted runs before the circuit opens.
        'threshold' => (int) env('CRAWLER_CIRCUIT_THRESHOLD', 3),
        'open_minutes' => (int) env('CRAWLER_CIRCUIT_OPEN_MINUTES', 120),
    ],

    // How long a source rests after it refused us (403, CAPTCHA, login wall).
    'access_restricted_cooldown_minutes' => (int) env('CRAWLER_ACCESS_RESTRICTED_COOLDOWN', 1440),

    // Upper bound for a cooldown taken from a Retry-After header.
    'max_rate_limit_cooldown_minutes' => (int) env('CRAWLER_MAX_RATE_LIMIT_COOLDOWN', 1440),

    // A run whose item count drops below this share of the recent median is
    // flagged suspected_partial and does not mark missing listings stale.
    'partial_drop_ratio' => 0.5,
    'partial_history_runs' => 5,
    'partial_min_median' => 5,

    // Errors stored per run; the rest are counted in the run summary.
    'max_errors_per_run' => 200,

    /*
    |--------------------------------------------------------------------------
    | Company logos
    |--------------------------------------------------------------------------
    */

    'logos' => [
        'disk' => 'public',
        'directory' => 'scraped-companies/logos',
        'max_bytes' => 2 * 1024 * 1024,
        'timeout_seconds' => 15,
    ],

];
