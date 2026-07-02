<?php

namespace Database\Seeders;

use App\Enums\CompanyStatus;
use App\Enums\CompanyVerificationStatus;
use App\Enums\EducationLevel;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\JobStatus;
use App\Enums\UserRole;
use App\Enums\WorkArrangement;
use App\Models\CandidateCv;
use App\Models\Certification;
use App\Models\Company;
use App\Models\CompanyBadge;
use App\Models\CompanyMember;
use App\Models\CompanyOffice;
use App\Models\Education;
use App\Models\EmployeeProfile;
use App\Models\Job;
use App\Models\JobScreeningQuestion;
use App\Models\Skill;
use App\Models\User;
use App\Models\WorkExperience;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Wipes all transactional/domain data (keeping only the admin account and the
 * lookup tables) and repopulates the platform with realistic, recognizable
 * Indonesian companies, published jobs, and job-seeker accounts.
 *
 * Company logos and user avatars are downloaded from public image services
 * (DiceBear monogram logos, Pravatar/RandomUser faces) and stored on the
 * `public` disk under `companies/logos` and `avatars`.
 *
 * Run standalone: php artisan db:seed --class=FreshShowcaseSeeder
 */
class FreshShowcaseSeeder extends Seeder
{
    /**
     * Domain tables emptied before reseeding. Lookups (provinces, cities,
     * industries, job_categories, company_sizes, skills, subscription_plans,
     * settings) and standalone site content are intentionally preserved.
     *
     * @var list<string>
     */
    private const WIPE_TABLES = [
        'ai_audit_logs', 'ai_career_recommendations', 'ai_coach_messages', 'ai_coach_sessions',
        'ai_interview_analyses', 'ai_interview_questions', 'ai_interview_responses', 'ai_interview_sessions',
        'ai_interview_template_questions', 'ai_interview_templates', 'ai_match_scores',
        'applications', 'application_screening_answers', 'application_status_logs',
        'audit_logs', 'candidate_cvs', 'candidate_outreach_messages', 'certifications',
        'companies', 'company_badges', 'company_members', 'company_offices', 'company_reviews',
        'company_subscriptions', 'company_verifications', 'contact_messages',
        'conversations', 'conversation_participants', 'dismissed_job_recommendations',
        'educations', 'employee_profiles', 'employee_skill',
        'google_calendar_tokens', 'interviews', 'interview_participants',
        'interview_reschedule_requests', 'interview_scorecards',
        'job_alerts', 'job_posts', 'job_screening_questions', 'job_skill', 'job_views',
        'message_templates', 'messages', 'notifications', 'orders', 'payment_transactions',
        'reports', 'review_helpful_votes', 'salary_submissions', 'saved_candidates', 'saved_jobs',
        'skill_assessments', 'skill_assessment_answers', 'talent_search_logs',
        'user_device_tokens', 'work_experiences',
    ];

    public function run(): void
    {
        $admin = User::query()->where('role', UserRole::Admin)->orderBy('id')->first();

        if (! $admin) {
            $this->command?->error('No admin user found — aborting so we do not wipe the only accounts.');

            return;
        }

        $this->wipe($admin);
        $this->ensureDirectories();

        $skills = Skill::query()->get();

        $created = 0;
        foreach ($this->companies() as $def) {
            $this->seedCompany($def, $created, $skills);
            $created++;
            $this->command?->info("  [{$created}/30] {$def['name']} seeded.");
        }

        $this->seedCandidates($skills);

        $this->command?->info('Fresh showcase data seeded.');
    }

    private function wipe(User $admin): void
    {
        $this->command?->warn('Wiping domain data (keeping admin + lookups)...');

        Schema::disableForeignKeyConstraints();

        foreach (self::WIPE_TABLES as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
            }
        }

        DB::table('users')->where('id', '!=', $admin->id)->delete();

        Schema::enableForeignKeyConstraints();
    }

    private function ensureDirectories(): void
    {
        Storage::disk('public')->makeDirectory('companies/logos');
        Storage::disk('public')->makeDirectory('avatars');
    }

    /**
     * @param  array<string, mixed>  $def
     * @param  Collection<int, Skill>  $skills
     */
    private function seedCompany(array $def, int $index, Collection $skills): void
    {
        $slug = Str::slug($def['name']);

        $owner = User::factory()->create([
            'name' => $def['recruiter'],
            'email' => 'hr@'.$def['domain'],
            'password' => Hash::make('password'),
            'role' => UserRole::Employer,
            'email_verified_at' => now()->subDays(rand(60, 400)),
            'phone' => $this->phone(),
            'avatar_path' => $this->downloadAvatar('hr@'.$def['domain'], $index % 2 === 0 ? 'men' : 'women', 60 + $index),
        ]);

        $logoPath = $this->downloadLogo($def['name'], $slug, $def['domain'], ltrim($def['color'], '#'));

        $company = Company::query()->create([
            'owner_id' => $owner->id,
            'name' => $def['name'],
            'slug' => $slug,
            'tagline' => $def['tagline'],
            'logo_path' => $logoPath,
            'website' => 'https://www.'.$def['domain'],
            'email' => 'careers@'.$def['domain'],
            'phone' => $this->phone(),
            'industry_id' => $def['industry_id'],
            'company_size_id' => $def['size_id'],
            'founded_year' => $def['founded'],
            'province_id' => $def['province_id'],
            'city_id' => $def['city_id'],
            'address' => $def['address'],
            'about' => $def['about'],
            'culture' => 'Kami percaya pada kolaborasi lintas tim, ownership yang tinggi, dan pengambilan keputusan berbasis data. Lingkungan kerja kami inklusif, cepat bergerak, dan berorientasi pada dampak nyata bagi pengguna.',
            'benefits' => "• Asuransi kesehatan (BPJS + swasta) untuk karyawan dan keluarga\n• Skema kerja hybrid dan cuti fleksibel\n• Budget pengembangan diri & sertifikasi tahunan\n• Bonus performa dan opsi saham (ESOP) untuk role tertentu\n• Fasilitas kantor modern dan tunjangan wellness",
            'status' => CompanyStatus::Approved,
            'verification_status' => CompanyVerificationStatus::Verified,
            'approved_at' => now()->subDays(rand(30, 200)),
            'verified_at' => now()->subDays(rand(20, 180)),
            'onboarding_completed_at' => now()->subDays(rand(20, 180)),
        ]);

        CompanyMember::query()->create([
            'company_id' => $company->id,
            'user_id' => $owner->id,
            'role' => 'owner',
            'invitation_email' => $owner->email,
            'invited_at' => now()->subDays(rand(30, 200)),
            'joined_at' => now()->subDays(rand(30, 200)),
        ]);

        CompanyOffice::query()->create([
            'company_id' => $company->id,
            'label' => 'Kantor Pusat',
            'address' => $def['address'],
            'contact_phone' => $company->phone,
            'is_headquarter' => true,
        ]);

        CompanyBadge::query()->create([
            'company_id' => $company->id,
            'code' => 'verified-employer',
            'name' => 'Perusahaan Terverifikasi',
            'description' => 'Identitas dan dokumen perusahaan telah diverifikasi admin.',
            'tone' => 'success',
            'awarded_at' => $company->verified_at,
            'is_active' => true,
        ]);

        $this->seedJob($company, $owner, $def, $skills);
    }

    /**
     * @param  array<string, mixed>  $def
     * @param  Collection<int, Skill>  $skills
     */
    private function seedJob(Company $company, User $owner, array $def, Collection $skills): void
    {
        $content = $this->jobContent($def['job'], $company->name, $def['tagline']);
        $isFeatured = fake()->boolean(35);
        $publishedAt = now()->subDays(rand(0, 21));

        // Drives the two card badges: "Butuh Cepat" (deadline within a week) and
        // "Pelamar Masih Sedikit" (few applicants). Mix so both show up.
        $isUrgent = fake()->boolean(40);
        $fewApplicants = fake()->boolean(55);
        $deadline = $isUrgent ? now()->addDays(rand(2, 6)) : now()->addDays(rand(14, 40));
        $applicationsCount = $fewApplicants ? rand(2, 13) : rand(22, 85);

        $job = Job::query()->create([
            'company_id' => $company->id,
            'posted_by_user_id' => $owner->id,
            'job_category_id' => $def['category_id'],
            'title' => $def['job'],
            'slug' => Str::slug($def['job']).'-'.Str::lower(Str::random(6)),
            'description' => $content['description'],
            'responsibilities' => $content['responsibilities'],
            'requirements' => $content['requirements'],
            'benefits' => $content['benefits'],
            'employment_type' => $def['employment_type'],
            'work_arrangement' => $def['work_arrangement'],
            'experience_level' => $def['experience_level'],
            'min_education' => fake()->randomElement([EducationLevel::SMA, EducationLevel::D3, EducationLevel::S1, EducationLevel::S1]),
            'salary_min' => $def['salary_min'] * 1_000_000,
            'salary_max' => $def['salary_max'] * 1_000_000,
            'is_salary_visible' => true,
            'province_id' => $def['province_id'],
            'city_id' => $def['city_id'],
            'status' => JobStatus::Published,
            'application_deadline' => $deadline->toDateString(),
            'is_anonymous' => false,
            'is_featured' => $isFeatured,
            'featured_until' => $isFeatured ? now()->addDays(30) : null,
            'views_count' => rand(120, 4200),
            'applications_count' => $applicationsCount,
            'published_at' => $publishedAt,
        ]);

        $picked = $skills->random(min(rand(3, 5), max($skills->count(), 1)));
        foreach ($picked as $skill) {
            $job->skills()->syncWithoutDetaching([
                $skill->id => [
                    'proficiency' => fake()->randomElement(['junior', 'mid', 'senior']),
                    'is_required' => fake()->boolean(60),
                ],
            ]);
        }

        JobScreeningQuestion::query()->insert([
            [
                'job_id' => $job->id,
                'question' => 'Berapa tahun pengalaman relevan yang Anda miliki untuk posisi ini?',
                'type' => 'text',
                'is_required' => true,
                'order_number' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'job_id' => $job->id,
                'question' => 'Kapan Anda tersedia untuk mulai bekerja?',
                'type' => 'text',
                'is_required' => true,
                'order_number' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * @param  Collection<int, Skill>  $skills
     */
    private function seedCandidates(Collection $skills): void
    {
        $this->command?->info('Seeding 30 job-seeker accounts...');

        $names = $this->candidateNames();
        $headlines = [
            ['Sales Executive · B2B & Retail', ExperienceLevel::Mid],
            ['Customer Service Officer · Perbankan', ExperienceLevel::Junior],
            ['Digital Marketing · SEO & Ads', ExperienceLevel::Mid],
            ['Social Media Specialist · Content', ExperienceLevel::Junior],
            ['HR Generalist · Rekrutmen & Payroll', ExperienceLevel::Mid],
            ['Talent Acquisition Specialist', ExperienceLevel::Junior],
            ['Finance Staff · AP/AR', ExperienceLevel::Junior],
            ['Accounting Staff · Pajak & Reporting', ExperienceLevel::Mid],
            ['Business Development Associate', ExperienceLevel::Junior],
            ['Account Manager · Enterprise', ExperienceLevel::Senior],
            ['Content Writer · Copywriting & SEO', ExperienceLevel::Junior],
            ['Graphic Designer · Brand & Motion', ExperienceLevel::Junior],
            ['Product Manager · B2C Mobile', ExperienceLevel::Senior],
            ['Data Analyst · SQL & Spreadsheet', ExperienceLevel::Mid],
            ['Operations Staff · Logistik', ExperienceLevel::Junior],
            ['Customer Success Manager', ExperienceLevel::Mid],
            ['Brand & Marketing Manager', ExperienceLevel::Senior],
            ['Admin & Office Support', ExperienceLevel::Entry],
            ['Fresh Graduate · Manajemen', ExperienceLevel::Entry],
            ['Fresh Graduate · Ilmu Komunikasi', ExperienceLevel::Entry],
        ];

        for ($i = 1; $i <= 30; $i++) {
            $name = $names[($i - 1) % count($names)];
            $email = 'kandidat'.$i.'@karirkonek.test';
            [$headline, $level] = $headlines[($i - 1) % count($headlines)];
            $position = Str::before($headline, ' ·');

            $user = User::factory()->create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('password'),
                'role' => UserRole::Employee,
                'email_verified_at' => now()->subDays(rand(1, 300)),
                'phone' => $this->phone(),
                'avatar_path' => $this->downloadAvatar($email, $i % 2 === 0 ? 'women' : 'men', $i),
            ]);

            $city = fake()->randomElement($this->majorCities());

            $profile = EmployeeProfile::query()->create([
                'user_id' => $user->id,
                'headline' => $headline,
                'about' => 'Profesional dengan pengalaman di bidang '.$position.'. Terbiasa bekerja dalam tim lintas fungsi, fokus pada hasil, dan terus belajar mengikuti perkembangan industri. Terbuka untuk peluang baru yang menantang.',
                'date_of_birth' => now()->subYears(rand(21, 38))->subDays(rand(0, 300)),
                'gender' => $i % 2 === 0 ? 'female' : 'male',
                'province_id' => $city['province_id'],
                'city_id' => $city['city_id'],
                'current_position' => $position,
                'expected_salary_min' => rand(6, 20) * 1_000_000,
                'expected_salary_max' => rand(22, 45) * 1_000_000,
                'experience_level' => $level,
                'profile_completion' => rand(65, 100),
                'is_open_to_work' => fake()->boolean(80),
                'visibility' => fake()->randomElement(['public', 'employers']),
            ]);

            $profile->skills()->syncWithoutDetaching(
                $skills->random(min(rand(4, 8), max($skills->count(), 1)))->pluck('id')->all()
            );

            Education::factory()->count(rand(1, 2))->create(['employee_profile_id' => $profile->id]);
            WorkExperience::factory()->count($level === ExperienceLevel::Entry ? 0 : rand(1, 3))
                ->create(['employee_profile_id' => $profile->id]);

            if (fake()->boolean(55)) {
                Certification::factory()->count(rand(1, 2))->create(['employee_profile_id' => $profile->id]);
            }

            CandidateCv::factory()->create([
                'employee_profile_id' => $profile->id,
                'is_active' => true,
            ]);
        }
    }

    // ---- Image downloads -------------------------------------------------

    /**
     * Download the real brand logo and store it on the public disk. Tries the
     * actual site favicon/logo first (Google icon service, then icon.horse),
     * rejecting anything too small to look crisp, and falls back to a coloured
     * monogram only when no decent real logo is available.
     */
    private function downloadLogo(string $name, string $slug, string $domain, string $colorHex): ?string
    {
        $seed = rawurlencode($name);

        // Google's favicon service returns the actual brand mark (never a
        // generic grey placeholder like some logo APIs), just at varying sizes.
        // Take the largest it has; fall back to a coloured monogram if it is
        // completely unavailable.
        $binary = $this->fetchImage("https://www.google.com/s2/favicons?domain={$domain}&sz=256", 24)
            ?? $this->fetchImage("https://www.google.com/s2/favicons?domain={$domain}&sz=128", 1)
            ?? $this->fetchImage("https://api.dicebear.com/9.x/initials/png?seed={$seed}&size=256&backgroundColor={$colorHex}&fontWeight=700&radius=12", 0);

        if ($binary === null) {
            return null;
        }

        $path = "companies/logos/{$slug}.png";
        Storage::disk('public')->put($path, $binary);

        return $path;
    }

    /**
     * Fetch an image, optionally rejecting it when its smallest side is below
     * $minDimension pixels (0 = accept any). Returns raw bytes or null.
     */
    private function fetchImage(string $url, int $minDimension, int $timeout = 15): ?string
    {
        try {
            $response = Http::timeout($timeout)->retry(3, 600, throw: false)->get($url);

            if (! $response->successful()) {
                return null;
            }

            $body = $response->body();

            if (! str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                return null;
            }

            if ($minDimension > 0) {
                $info = @getimagesizefromstring($body);
                if ($info === false || min($info[0], $info[1]) < $minDimension) {
                    return null;
                }
            }

            return $body;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Download a face avatar and store it on the public disk.
     */
    private function downloadAvatar(string $seed, string $gender, int $n): ?string
    {
        $enc = rawurlencode($seed);
        $portrait = ($n % 100);
        $sources = [
            "https://i.pravatar.cc/300?u={$enc}",
            "https://randomuser.me/api/portraits/{$gender}/{$portrait}.jpg",
            "https://api.dicebear.com/9.x/avataaars/png?seed={$enc}&size=256",
        ];

        $binary = $this->firstSuccessfulDownload($sources);
        if ($binary === null) {
            return null;
        }

        $path = 'avatars/'.Str::slug($seed).'-'.$n.'.jpg';
        Storage::disk('public')->put($path, $binary);

        return $path;
    }

    /**
     * @param  list<string>  $urls
     */
    private function firstSuccessfulDownload(array $urls): ?string
    {
        foreach ($urls as $url) {
            try {
                $response = Http::timeout(20)->retry(2, 400)->get($url);
                if ($response->successful() && str_starts_with((string) $response->header('Content-Type'), 'image/')) {
                    return $response->body();
                }
            } catch (\Throwable) {
                continue;
            }
        }

        return null;
    }

    // ---- Content builders ------------------------------------------------

    /**
     * @return array{description: string, responsibilities: string, requirements: string, benefits: string}
     */
    private function jobContent(string $title, string $company, string $tagline): array
    {
        return [
            'description' => "{$company} sedang mencari **{$title}** yang bersemangat untuk bergabung dengan tim kami. Sebagai bagian dari {$company} ({$tagline}), Anda akan bekerja pada produk dan inisiatif yang berdampak langsung bagi jutaan pengguna di Indonesia. Kami mencari individu yang proaktif, senang belajar, dan mampu berkolaborasi dalam lingkungan yang dinamis.",
            'responsibilities' => "• Merancang, membangun, dan memelihara solusi sesuai lingkup posisi {$title}\n• Berkolaborasi dengan tim product, design, dan engineering untuk mencapai target bisnis\n• Menjaga kualitas pekerjaan melalui proses review dan dokumentasi yang baik\n• Menganalisis data untuk mengambil keputusan dan melakukan perbaikan berkelanjutan\n• Mengikuti perkembangan tren industri dan menerapkan praktik terbaik",
            'requirements' => "• Pengalaman relevan di bidang terkait posisi {$title}\n• Pemahaman kuat terhadap konsep dan tools yang digunakan pada peran ini\n• Kemampuan komunikasi dan kolaborasi yang baik dalam tim lintas fungsi\n• Mampu bekerja secara terstruktur, mandiri, dan berorientasi pada hasil\n• Bahasa Indonesia lancar; kemampuan bahasa Inggris menjadi nilai tambah",
            'benefits' => "• Gaji kompetitif sesuai pengalaman\n• Asuransi kesehatan untuk karyawan dan keluarga\n• Skema kerja hybrid/remote yang fleksibel\n• Budget pembelajaran, konferensi, dan sertifikasi\n• Tim yang suportif dengan peluang pengembangan karier yang jelas",
        ];
    }

    private function phone(): string
    {
        return '+62 8'.rand(1, 9).rand(1, 9).' '.rand(1000, 9999).' '.rand(1000, 9999);
    }

    /**
     * Kota-kota besar Indonesia (dengan province_id) untuk domisili kandidat,
     * supaya sebaran kota realistis — bukan kabupaten pelosok acak.
     *
     * @return list<array{city_id: int, province_id: int}>
     */
    private function majorCities(): array
    {
        $pairs = [
            [226, 11], [225, 11], [224, 11], [227, 11], [228, 11], // Jakarta (5 wilayah)
            [12, 12], [248, 12], [249, 12], [252, 12],             // Bandung, Bekasi, Bogor, Depok
            [15, 15], [326, 15],                                   // Surabaya, Malang
            [13, 13], [287, 13],                                   // Semarang, Surakarta
            [14, 14], [17, 17],                                    // Yogyakarta, Denpasar
            [335, 16], [336, 16],                                  // Tangerang, Tangerang Selatan
            [2, 2], [27, 27], [6, 6],                              // Medan, Makassar, Palembang
        ];

        return array_map(fn (array $p): array => ['city_id' => $p[0], 'province_id' => $p[1]], $pairs);
    }

    /**
     * @return list<string>
     */
    private function candidateNames(): array
    {
        return [
            'Ahmad Fauzi', 'Siti Nurhaliza', 'Budi Santoso', 'Dewi Lestari', 'Rizky Ramadhan',
            'Putri Anggraini', 'Andi Wijaya', 'Rina Kartika', 'Bagus Prasetyo', 'Maya Sari',
            'Dimas Aditya', 'Nabila Zahra', 'Fajar Nugroho', 'Intan Permata', 'Yoga Pratama',
            'Kirana Melati', 'Hendra Gunawan', 'Alya Rahmawati', 'Reza Firmansyah', 'Tania Puspita',
            'Galih Saputra', 'Nadia Safitri', 'Arif Hidayat', 'Vina Oktaviani', 'Bayu Setiawan',
            'Salsabila Putri', 'Iqbal Maulana', 'Citra Ayu', 'Wahyu Ramadhani', 'Larasati Dewi',
        ];
    }

    /**
     * Curated list of 30 recognizable Indonesian companies with realistic
     * metadata and one flagship open role each.
     *
     * @return list<array<string, mixed>>
     */
    private function companies(): array
    {
        $jaksel = ['city_id' => 226, 'province_id' => 11, 'address' => 'Jl. Jend. Sudirman, Jakarta Selatan'];
        $jakpus = ['city_id' => 225, 'province_id' => 11, 'address' => 'Jl. M.H. Thamrin, Jakarta Pusat'];
        $jakbar = ['city_id' => 224, 'province_id' => 11, 'address' => 'Jl. Panjang, Jakarta Barat'];
        $bandung = ['city_id' => 12, 'province_id' => 12, 'address' => 'Jl. Asia Afrika, Kota Bandung'];
        $surabaya = ['city_id' => 15, 'province_id' => 15, 'address' => 'Jl. Basuki Rahmat, Kota Surabaya'];
        $tangsel = ['city_id' => 336, 'province_id' => 16, 'address' => 'BSD City, Tangerang Selatan'];

        // Sengaja beragam lintas fungsi (sales, marketing, finance, HR, ops,
        // design, customer service) — bukan didominasi role developer.
        // Kolom: [name, domain, industry, size, founded, color, tagline, recruiter, job, category, level, salary_min, salary_max, lokasi]
        $rows = [
            ['Gojek', 'gojek.com', 1, 5, 2010, '#00AA13', 'Super app karya anak bangsa', 'Nina Kusuma', 'Social Media Specialist', 5, 'mid', 9, 16, $jaksel],
            ['Tokopedia', 'tokopedia.com', 1, 5, 2009, '#42B549', 'Mulai aja dulu', 'Rangga Mahendra', 'Business Development Associate', 6, 'junior', 8, 14, $jaksel],
            ['Traveloka', 'traveloka.com', 1, 5, 2012, '#1BA0E2', 'Life, your way', 'Sarah Amelia', 'Product Manager', 3, 'senior', 28, 48, $jakbar],
            ['Bukalapak', 'bukalapak.com', 1, 5, 2010, '#E31E52', 'Kemajuan bersama semua orang', 'Fandi Ahmad', 'Data Analyst', 2, 'mid', 13, 24, $jaksel],
            ['Grab Indonesia', 'grab.com', 1, 5, 2012, '#00B14F', 'Ekonomi digital untuk semua', 'Melinda Tan', 'Operations Associate', 6, 'junior', 8, 14, $jaksel],
            ['Shopee Indonesia', 'shopee.co.id', 6, 5, 2015, '#EE4D2D', 'Gratis ongkir se-Indonesia', 'Kevin Hartono', 'Graphic Designer', 4, 'junior', 7, 13, $jakpus],
            ['Blibli', 'blibli.com', 6, 4, 2011, '#0072BC', 'Big Choices, Big Deals', 'Ratih Purnama', 'Digital Marketing Specialist', 5, 'junior', 8, 14, $jakbar],
            ['Bank Central Asia', 'bca.co.id', 2, 5, 1957, '#0060AF', 'Senantiasa di sisi Anda', 'Agus Salim', 'Customer Service Officer', 6, 'junior', 6, 11, $jakpus],
            ['Bank Mandiri', 'bankmandiri.co.id', 2, 5, 1998, '#003D79', 'Terdepan, terpercaya, tumbuh bersama', 'Lia Marlina', 'Credit Analyst', 8, 'mid', 12, 22, $jakpus],
            ['Bank BRI', 'bri.co.id', 2, 5, 1895, '#00529C', 'Melayani dengan setulus hati', 'Dodi Kurniawan', 'Relationship Manager', 6, 'mid', 10, 18, $jakpus],
            ['OVO', 'ovo.id', 2, 4, 2017, '#4C3494', 'Pembayaran digital nomor satu', 'Feni Anjani', 'Finance Staff', 8, 'junior', 8, 14, $jaksel],
            ['DANA', 'dana.id', 2, 4, 2018, '#118EEA', 'Dompet digital Indonesia', 'Rudi Hartawan', 'Talent Acquisition Specialist', 7, 'mid', 11, 20, $jaksel],
            ['Xendit', 'xendit.co', 2, 4, 2015, '#4573FF', 'Infrastruktur pembayaran Asia Tenggara', 'Grace Natalia', 'Backend Engineer', 1, 'senior', 25, 45, $jaksel],
            ['Halodoc', 'halodoc.com', 3, 4, 2016, '#E62F56', 'Simplifying healthcare', 'Bimo Prakoso', 'Partnership Executive', 6, 'mid', 10, 18, $jaksel],
            ['Alodokter', 'alodokter.com', 3, 4, 2014, '#29B6C1', 'Tanya dokter kapan saja', 'Yuni Astuti', 'Content Writer', 5, 'junior', 7, 12, $jaksel],
            ['Ruangguru', 'ruangguru.com', 4, 5, 2014, '#2E6BE6', 'Belajar jadi mudah', 'Taufik Hidayat', 'Product Designer', 4, 'mid', 13, 24, $jaksel],
            ['Zenius Education', 'zenius.net', 4, 3, 2004, '#FF5B00', 'Nyalakan otakmu', 'Dina Okta', 'Content Curriculum Specialist', 5, 'junior', 7, 12, $jaksel],
            ['Astra International', 'astra.co.id', 5, 5, 1957, '#0033A0', 'Sejahtera bersama bangsa', 'Hasan Basri', 'Sales Executive', 6, 'junior', 7, 13, $jakpus],
            ['Indofood', 'indofood.com', 5, 5, 1990, '#ED1C24', 'Total food solutions', 'Wati Suryani', 'HR Generalist', 7, 'mid', 10, 18, $jakpus],
            ['Unilever Indonesia', 'unilever.co.id', 5, 5, 1933, '#1F36C7', 'Brighter future untuk semua', 'Michael Tanaya', 'Brand Manager', 5, 'senior', 24, 40, $tangsel],
            ['Kalbe Farma', 'kalbe.co.id', 3, 5, 1966, '#00A651', 'The scientific pursuit of health', 'Sinta Dewanti', 'Medical Representative', 6, 'junior', 7, 13, $jakpus],
            ['JNE Express', 'jne.co.id', 7, 5, 1990, '#CE1126', 'Connecting happiness', 'Eko Prasetyo', 'Operations Manager', 6, 'senior', 15, 25, $jakpus],
            ['SiCepat Ekspres', 'sicepat.com', 7, 4, 2014, '#E52D27', 'Ekspres kirim paket', 'Nanda Pratiwi', 'Logistics Coordinator', 6, 'junior', 8, 14, $jaksel],
            ['Waresix', 'waresix.com', 7, 3, 2017, '#F26522', 'Logistik terintegrasi Indonesia', 'Yusuf Maulana', 'Business Analyst', 3, 'mid', 14, 26, $jaksel],
            ['Wijaya Karya', 'wika.co.id', 8, 5, 1960, '#F58220', 'Membangun negeri', 'Purnomo Adi', 'Accounting Staff', 8, 'junior', 8, 14, $jakpus],
            ['Sociolla', 'sociolla.com', 6, 3, 2015, '#F04E8C', 'Beauty journey untuk semua', 'Vania Larasati', 'E-commerce Specialist', 6, 'mid', 11, 20, $jaksel],
            ['Kredivo', 'kredivo.com', 2, 4, 2016, '#1E2F97', 'Cicilan tanpa kartu kredit', 'Ferry Gunadi', 'Risk Analyst', 8, 'mid', 14, 26, $jaksel],
            ['Telkom Indonesia', 'telkom.co.id', 1, 5, 1965, '#E4002B', 'Digitalisasi Indonesia', 'Rahmat Hidayat', 'Account Manager', 6, 'mid', 11, 20, $bandung],
            ['Tiket.com', 'tiket.com', 1, 4, 2011, '#0064D2', 'Semua ada tiketnya', 'Della Anggreini', 'Growth Marketing Manager', 5, 'senior', 20, 34, $jakbar],
            ['Kitabisa', 'kitabisa.com', 9, 3, 2013, '#00AA5B', 'Platform galang dana sosial', 'Aldi Firmansyah', 'Partnership Manager', 6, 'mid', 12, 20, $surabaya],
        ];

        $work = [
            'onsite' => WorkArrangement::Onsite,
            'hybrid' => WorkArrangement::Hybrid,
            'remote' => WorkArrangement::Remote,
        ];
        $exp = [
            'junior' => ExperienceLevel::Junior,
            'mid' => ExperienceLevel::Mid,
            'senior' => ExperienceLevel::Senior,
        ];
        $arrangementByLevel = ['junior' => 'onsite', 'mid' => 'hybrid', 'senior' => 'hybrid'];

        return array_map(function (array $r) use ($work, $exp, $arrangementByLevel): array {
            [$name, $domain, $industry, $size, $founded, $color, $tagline, $recruiter, $job, $category, $level, $smin, $smax, $loc] = $r;

            return [
                'name' => $name,
                'domain' => $domain,
                'industry_id' => $industry,
                'size_id' => $size,
                'founded' => $founded,
                'color' => $color,
                'tagline' => $tagline,
                'recruiter' => $recruiter,
                'about' => $name.' adalah salah satu perusahaan terkemuka di Indonesia yang bergerak dengan visi '.lcfirst($tagline).'. Kami membangun produk dan layanan yang memberi dampak nyata bagi masyarakat, didukung tim profesional yang solid dan budaya kerja yang berorientasi pada pertumbuhan.',
                'job' => $job,
                'category_id' => $category,
                'employment_type' => EmploymentType::FullTime,
                'work_arrangement' => $work[$arrangementByLevel[$level]],
                'experience_level' => $exp[$level],
                'salary_min' => $smin,
                'salary_max' => $smax,
                'city_id' => $loc['city_id'],
                'province_id' => $loc['province_id'],
                'address' => $loc['address'],
            ];
        }, $rows);
    }
}
