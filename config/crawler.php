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
    | Category from job title
    |--------------------------------------------------------------------------
    | Used when a source gives no department (Dealls, most career pages).
    | Keys are job category names; keywords match whole words, case-insensitive.
    | Order matters: the first category with a matching keyword wins, so the
    | specific roles come before the broad ones.
    */

    'category_keywords' => [
        'Recruitment & Talent Acquistion' => ['recruiter', 'recruitment', 'talent acquisition', 'rekrutmen'],
        'Human Resources' => ['hr', 'hrd', 'human resource', 'human resources', 'people', 'personalia', 'payroll', 'hrbp'],
        'Software Engineering' => ['software engineer', 'software developer', 'backend', 'back end', 'frontend', 'front end', 'fullstack', 'full stack', 'programmer', 'mobile developer', 'android', 'ios developer', 'flutter', 'golang', 'laravel'],
        'Web Development' => ['web developer', 'web programmer', 'wordpress'],
        'DevOps & Cloud' => ['devops', 'cloud engineer', 'site reliability', 'sre'],
        'Cybersecurity' => ['cyber security', 'cybersecurity', 'information security', 'security analyst', 'penetration'],
        'Network Engineer' => ['network engineer', 'network administrator', 'jaringan'],
        'IT Support & Infrastructure' => ['it support', 'it staff', 'it helpdesk', 'helpdesk', 'system administrator', 'technical support', 'it infrastructure'],
        'Data Science & Analytics' => ['data scientist', 'data science', 'machine learning', 'data engineer'],
        'Data Analyst' => ['data analyst', 'business intelligence', 'bi analyst'],
        'Data Entry' => ['data entry', 'input data'],
        'Business Analyst' => ['business analyst', 'system analyst'],
        'QA/Testing' => ['qa engineer', 'software tester', 'quality assurance engineer', 'test engineer', 'tester'],
        'Quality Assurance (QA)' => ['quality control', 'quality assurance', 'qc', 'qa'],
        'UI/UX Design' => ['ui/ux', 'ui ux', 'ux designer', 'ui designer', 'product designer'],
        'Product Management' => ['product manager', 'product owner'],
        'Project Management' => ['project manager', 'project coordinator', 'project officer', 'pmo'],
        'Research & Development' => ['research and development', 'research & development', 'r&d', 'researcher', 'peneliti'],
        'Content Writing & Copywriting' => ['copywriter', 'content writer', 'penulis', 'editor'],
        'Content Creator' => ['content creator', 'kreator konten', 'host live', 'live streaming', 'streamer'],
        'Social Media Management' => ['social media', 'sosial media'],
        'SEO/SEM' => ['seo', 'sem'],
        'Digital Marketing' => ['digital marketing', 'performance marketing', 'ads specialist', 'marketplace specialist', 'e-commerce specialist', 'ecommerce specialist'],
        'Brand Management' => ['brand manager', 'brand executive', 'brand specialist', 'branding'],
        'Public Relations' => ['public relation', 'public relations', 'humas', 'communication specialist'],
        'Photography & Videography' => ['photographer', 'videographer', 'fotografer', 'video editor', 'editor video'],
        'Design' => ['graphic designer', 'desainer', 'designer', 'desain grafis', 'illustrator', 'drafter', 'interior design'],
        'Creative & Production' => ['creative', 'kreatif', 'production house', 'motion graphic', 'animator'],
        'Event Organizer' => ['event', 'event organizer'],
        'Customer Success' => ['customer success', 'account manager', 'key account'],
        'Customer Service' => ['customer service', 'customer care', 'call center', 'cs', 'telemarketing', 'telesales', 'front office', 'receptionist', 'resepsionis'],
        'Sales Executive/Representative' => ['sales executive', 'sales representative', 'sales consultant', 'sales advisor', 'sales promotion', 'spg', 'spb', 'canvasser'],
        'Sales dan Business Development' => ['sales', 'business development', 'bisnis development', 'account executive', 'marketing executive', 'penjualan'],
        'Marketing' => ['marketing', 'pemasaran', 'trade marketing'],
        'Finance dan Accounting' => ['accounting', 'accountant', 'akuntan', 'akuntansi', 'finance', 'keuangan', 'tax', 'pajak', 'auditor', 'audit', 'treasury', 'kasir', 'cashier', 'billing', 'collection', 'ar', 'ap'],
        'Banking' => ['bank', 'banking', 'teller', 'relationship manager', 'kredit', 'credit analyst'],
        'Legal & Compliance' => ['legal', 'lawyer', 'hukum', 'compliance', 'paralegal', 'notaris'],
        'Procurement & Purchasing' => ['procurement', 'purchasing', 'pengadaan', 'buyer'],
        'Supply Chain & Logistics' => ['supply chain', 'logistic', 'logistics', 'logistik', 'ppic', 'inventory', 'distribution', 'distribusi', 'shipping', 'ekspedisi'],
        'Export & Import' => ['export', 'import', 'ekspor', 'impor', 'exim'],
        'Warehouse' => ['warehouse', 'gudang', 'picker', 'packer', 'helper gudang', 'stock keeper'],
        'Driver & Transportation' => ['driver', 'sopir', 'supir', 'kurir', 'courier', 'delivery'],
        'Security' => ['security', 'satpam', 'keamanan'],
        'Cleaning Service' => ['cleaning service', 'office boy', 'office girl', 'housekeeping', 'cleaner'],
        'Pharmacy' => ['apoteker', 'pharmacist', 'asisten apoteker', 'farmasi', 'pharmacy'],
        'Nursing' => ['perawat', 'nurse', 'bidan', 'midwife', 'keperawatan'],
        'Healthcare' => ['dokter', 'doctor', 'medical', 'medis', 'klinik', 'clinic', 'terapis', 'therapist', 'fisioterapi', 'radiografer', 'analis kesehatan', 'beautician'],
        'Education & Training' => ['dosen', 'lecturer', 'guru', 'teacher', 'tutor', 'pengajar', 'instruktur', 'instructor', 'trainer', 'mentor', 'kepala sekolah'],
        'Food & Beverage' => ['chef', 'cook', 'koki', 'barista', 'waiter', 'waitress', 'kitchen', 'dapur', 'bartender', 'pastry', 'baker', 'f&b'],
        'Hospitality & Tourism' => ['hotel', 'hospitality', 'tour', 'travel', 'guest relation', 'concierge', 'bellboy'],
        'Retail' => ['retail', 'store', 'toko', 'outlet', 'shop', 'crew store', 'store manager', 'area manager', 'merchandiser', 'visual merchandiser'],
        'Manufacturing' => ['operator', 'produksi', 'production', 'manufacturing', 'machine', 'mesin', 'factory', 'pabrik', 'assembly', 'welder', 'wwtp', 'ipal', 'maintenance'],
        'Construction' => ['construction', 'konstruksi', 'civil', 'sipil', 'site engineer', 'arsitek', 'architect', 'quantity surveyor', 'pengawas lapangan', 'mandor'],
        'Engineering' => ['engineer', 'engineering', 'teknik', 'technician', 'teknisi', 'mechanical', 'electrical', 'elektrik', 'mekanik'],
        'Personal Asisstant / Executive Asisstant' => ['personal assistant', 'executive assistant', 'secretary', 'sekretaris'],
        'Administration and Office Support' => ['admin', 'administrasi', 'administration', 'administrator', 'office', 'staff admin', 'document control', 'general affair', 'ga'],
        'Goverment & Public Service' => ['pemerintah', 'government', 'asn', 'pns', 'public service'],
        'Consultant' => ['consultant', 'konsultan', 'advisor'],
        'Operation' => ['operation', 'operations', 'operasional', 'supervisor', 'koordinator', 'coordinator', 'manager', 'head of', 'leader'],
        'Internship' => ['intern', 'internship', 'magang'],
    ],

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
