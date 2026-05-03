<?php

namespace Database\Seeders;

use App\Enums\AiInterviewMode;
use App\Enums\ApplicationStatus;
use App\Enums\EmploymentType;
use App\Enums\ExperienceLevel;
use App\Enums\InterviewStage;
use App\Enums\InterviewStatus;
use App\Enums\JobStatus;
use App\Enums\OrderItemType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\SubscriptionStatus;
use App\Enums\UserRole;
use App\Enums\WorkArrangement;
use App\Models\AiAuditLog;
use App\Models\AiCoachMessage;
use App\Models\AiCoachSession;
use App\Models\AiInterviewAnalysis;
use App\Models\AiInterviewQuestion;
use App\Models\AiInterviewResponse;
use App\Models\AiInterviewSession;
use App\Models\AiInterviewTemplate;
use App\Models\AiMatchScore;
use App\Models\Announcement;
use App\Models\Application;
use App\Models\ApplicationStatusLog;
use App\Models\AssessmentQuestion;
use App\Models\CandidateCv;
use App\Models\CandidateOutreachMessage;
use App\Models\CareerResource;
use App\Models\Certification;
use App\Models\City;
use App\Models\Company;
use App\Models\CompanyMember;
use App\Models\CompanyOffice;
use App\Models\CompanyReview;
use App\Models\CompanySubscription;
use App\Models\ContactMessage;
use App\Models\DismissedJobRecommendation;
use App\Models\Education;
use App\Models\EmployeeProfile;
use App\Models\Faq;
use App\Models\Industry;
use App\Models\Interview;
use App\Models\InterviewParticipant;
use App\Models\InterviewScorecard;
use App\Models\Job;
use App\Models\JobAlert;
use App\Models\JobCategory;
use App\Models\JobScreeningQuestion;
use App\Models\LegalPage;
use App\Models\Order;
use App\Models\PaymentTransaction;
use App\Models\Province;
use App\Models\Report;
use App\Models\SalaryInsight;
use App\Models\SalarySubmission;
use App\Models\SavedCandidate;
use App\Models\SavedJob;
use App\Models\Skill;
use App\Models\SkillAssessment;
use App\Models\SubscriptionPlan;
use App\Models\TalentSearchLog;
use App\Models\User;
use App\Models\WorkExperience;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Populates every domain table with realistic-looking dummy data so the
 * platform can be eyeballed end-to-end without manually clicking through
 * every form. Idempotent-ish: if seed users/companies already exist they
 * are reused; only fresh records are appended.
 *
 * Run after the standard seed chain (settings → provinces/cities → lookups
 * → subscription plans → company seed). Most data is generated via factories,
 * but some constraints (employment_status enum, screening_question shape,
 * subscription jobs_posted_count) are too specific for a generic factory and
 * are filled in by hand here.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('Seeding demo data...');

        $admin = User::query()->where('role', UserRole::Admin)->first()
            ?? User::factory()->create([
                'name' => 'Admin Demo',
                'email' => 'admin.demo@karirconnect.test',
                'password' => Hash::make('password'),
                'role' => UserRole::Admin,
                'email_verified_at' => now(),
            ]);

        $employers = $this->seedEmployers($admin);
        $employees = $this->seedEmployees();
        $jobs = $this->seedJobs($employers);
        $this->seedJobScreeningQuestions($jobs);
        $this->seedAiInterviewTemplates($employers, $jobs);
        $this->seedSavedJobs($employees, $jobs);
        $applications = $this->seedApplications($employees, $jobs);
        $this->seedInterviews($applications, $employers);
        $this->seedAiInterviews($applications);
        $this->seedAiMatchScores($employees, $jobs);
        $this->seedTalentInteractions($employers, $employees, $jobs);
        $this->seedCompanyReviews($employers, $employees);
        $this->seedSalarySubmissions($employees, $employers);
        $this->seedSubscriptionsAndOrders($employers);
        $this->seedJobAlerts($employees);
        $this->seedDismissedRecommendations($employees, $jobs);
        $this->seedCareerCoach($employees);
        $this->seedAiAuditLogs($employees, $employers);
        $this->seedNotifications($employees, $jobs);
        $this->seedContent($admin);
        $this->seedSkillAssessments($employees);
        $this->seedSalaryInsights();
        $this->seedReports($admin, $employees);
        $this->seedContactMessages();

        $this->command?->info('Demo data seeded.');
    }

    /**
     * @return array<int, array{user: User, company: Company}>
     */
    private function seedEmployers(User $admin): array
    {
        $industry = Industry::query()->inRandomOrder()->first();
        $cities = City::query()->limit(5)->get();

        $definitions = [
            ['name' => 'Niagatech Indonesia', 'tagline' => 'Layanan SaaS B2B untuk UKM.', 'about' => 'Kami membangun produk lifecycle pelanggan untuk SMB di Indonesia.'],
            ['name' => 'Kopiloka Group', 'tagline' => 'Jaringan kedai kopi specialty Nusantara.', 'about' => 'Operator 40+ outlet dengan tim digital, supply chain, dan ritel.'],
            ['name' => 'Mediakaya Studio', 'tagline' => 'Agensi kreatif dan produksi konten.', 'about' => 'Tim agile yang mengerjakan brand, iklan, dan kampanye performance.'],
            ['name' => 'Pertama Finance', 'tagline' => 'Lembaga keuangan multifinance modern.', 'about' => 'Pinjaman produktif untuk wirausaha mikro dengan platform digital.'],
            ['name' => 'Sehatkita Health', 'tagline' => 'Healthtech klinik dan telemedicine.', 'about' => 'Platform pencatatan medis terintegrasi untuk klinik dan praktek mandiri.'],
        ];

        $employers = [];

        foreach ($definitions as $i => $def) {
            $email = 'employer'.($i + 1).'@karirconnect.test';
            $user = User::query()->where('email', $email)->first()
                ?? User::factory()->create([
                    'name' => 'HR '.$def['name'],
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'role' => UserRole::Employer,
                    'email_verified_at' => now()->subDays(30),
                    'phone' => '+62 21 5555 '.str_pad((string) ($i + 100), 4, '0', STR_PAD_LEFT),
                ]);

            $company = Company::query()->where('owner_id', $user->id)->first()
                ?? Company::factory()->approved()->verified()->create([
                    'owner_id' => $user->id,
                    'name' => $def['name'],
                    'slug' => Str::slug($def['name']),
                    'tagline' => $def['tagline'],
                    'about' => $def['about'],
                    'industry_id' => $industry?->id,
                    'city_id' => $cities[$i % max($cities->count(), 1)]?->id,
                    'province_id' => $cities[$i % max($cities->count(), 1)]?->province_id,
                    'founded_year' => 2010 + $i,
                ]);

            CompanyMember::query()->firstOrCreate(
                ['company_id' => $company->id, 'user_id' => $user->id],
                ['role' => 'owner', 'invitation_email' => $user->email, 'invited_at' => now(), 'joined_at' => now()],
            );

            CompanyOffice::query()->firstOrCreate(
                ['company_id' => $company->id, 'label' => 'Kantor Pusat'],
                [
                    'address' => $company->address ?? 'Jakarta',
                    'is_headquarter' => true,
                ],
            );

            $employers[] = ['user' => $user, 'company' => $company];
        }

        unset($admin);

        return $employers;
    }

    /**
     * @return array<int, array{user: User, profile: EmployeeProfile}>
     */
    private function seedEmployees(): array
    {
        $employees = [];
        $skills = Skill::query()->take(20)->get();
        $cities = City::query()->limit(8)->get();
        $provinces = Province::query()->limit(8)->get();

        for ($i = 1; $i <= 12; $i++) {
            $email = 'kandidat'.$i.'@karirconnect.test';
            $user = User::query()->where('email', $email)->first()
                ?? User::factory()->create([
                    'name' => 'Kandidat '.$i,
                    'email' => $email,
                    'password' => Hash::make('password'),
                    'role' => UserRole::Employee,
                    'email_verified_at' => now()->subDays(rand(1, 90)),
                ]);

            $profile = EmployeeProfile::query()->where('user_id', $user->id)->first()
                ?? EmployeeProfile::factory()->create([
                    'user_id' => $user->id,
                    'headline' => fake()->randomElement([
                        'Backend Engineer · Laravel & Postgres',
                        'Performance Marketer · Meta & TikTok Ads',
                        'Sales Executive · B2B SaaS',
                        'Product Designer · Mobile First',
                        'Data Analyst · SQL & Looker',
                        'HR Generalist · Talent Acquisition',
                        'Finance Associate · Reporting',
                        'Customer Success Manager',
                    ]),
                    'about' => fake()->paragraph(),
                    'province_id' => $provinces->random()->id,
                    'city_id' => $cities->random()->id,
                    'expected_salary_min' => rand(5, 25) * 1_000_000,
                    'expected_salary_max' => rand(26, 50) * 1_000_000,
                    'experience_level' => fake()->randomElement(ExperienceLevel::cases()),
                    'is_open_to_work' => fake()->boolean(75),
                    'visibility' => fake()->randomElement(['public', 'employers']),
                    'profile_completion' => rand(45, 95),
                ]);

            // Skills
            $profileSkills = $skills->random(min(rand(3, 7), $skills->count()))->pluck('id');
            $profile->skills()->syncWithoutDetaching($profileSkills);

            // Education
            if ($profile->educations()->count() === 0) {
                Education::factory()->count(rand(1, 2))->create(['employee_profile_id' => $profile->id]);
            }

            // Work experience
            if ($profile->workExperiences()->count() === 0) {
                WorkExperience::factory()->count(rand(1, 3))->create(['employee_profile_id' => $profile->id]);
            }

            // Certification
            if ($profile->certifications()->count() === 0 && fake()->boolean(60)) {
                Certification::factory()->count(rand(1, 2))->create(['employee_profile_id' => $profile->id]);
            }

            // CV
            if ($profile->cvs()->count() === 0) {
                CandidateCv::factory()->create([
                    'employee_profile_id' => $profile->id,
                    'is_active' => true,
                ]);
            }

            $employees[] = ['user' => $user, 'profile' => $profile];
        }

        return $employees;
    }

    /**
     * @param  array<int, array{user: User, company: Company}>  $employers
     * @return array<int, Job>
     */
    private function seedJobs(array $employers): array
    {
        $categories = JobCategory::query()->get();
        $cities = City::query()->limit(8)->get();
        $skills = Skill::query()->get();

        $titles = [
            'Backend Engineer (Laravel)',
            'Frontend Engineer (React)',
            'Data Analyst',
            'Performance Marketing Manager',
            'Sales Executive',
            'Account Manager',
            'Product Designer',
            'HR Generalist',
            'Finance Associate',
            'Content Writer',
            'Customer Success Manager',
            'Operations Lead',
            'DevOps Engineer',
            'Mobile Engineer (Flutter)',
            'Brand Manager',
        ];

        $jobs = [];
        $titleIndex = 0;

        foreach ($employers as $idx => $entry) {
            $perCompany = rand(3, 4);
            for ($j = 0; $j < $perCompany; $j++) {
                $title = $titles[$titleIndex++ % count($titles)];
                $isFeatured = fake()->boolean(30);
                $job = Job::factory()->published()->create([
                    'company_id' => $entry['company']->id,
                    'posted_by_user_id' => $entry['user']->id,
                    'job_category_id' => $categories->random()->id,
                    'title' => $title,
                    'employment_type' => fake()->randomElement(EmploymentType::cases()),
                    'work_arrangement' => fake()->randomElement(WorkArrangement::cases()),
                    'experience_level' => fake()->randomElement(ExperienceLevel::cases()),
                    'salary_min' => rand(5, 12) * 1_000_000,
                    'salary_max' => rand(13, 30) * 1_000_000,
                    'province_id' => $cities->random()->province_id,
                    'city_id' => $cities->random()->id,
                    'is_featured' => $isFeatured,
                    'featured_until' => $isFeatured ? now()->addDays(30) : null,
                    'published_at' => now()->subDays(rand(0, 14)),
                ]);

                // Attach 3-5 skills
                $jobSkills = $skills->random(min(rand(3, 5), $skills->count()));
                foreach ($jobSkills as $sk) {
                    $job->skills()->syncWithoutDetaching([
                        $sk->id => ['proficiency' => fake()->randomElement(['junior', 'mid', 'senior']), 'is_required' => fake()->boolean(60)],
                    ]);
                }

                $jobs[] = $job;
            }

            // One draft per company
            $jobs[] = Job::factory()->create([
                'company_id' => $entry['company']->id,
                'posted_by_user_id' => $entry['user']->id,
                'job_category_id' => $categories->random()->id,
                'title' => 'Draft - '.$titles[$titleIndex++ % count($titles)],
                'status' => JobStatus::Draft,
            ]);

            // One closed per company
            $jobs[] = Job::factory()->closed()->create([
                'company_id' => $entry['company']->id,
                'posted_by_user_id' => $entry['user']->id,
                'job_category_id' => $categories->random()->id,
                'title' => 'Arsip - '.$titles[$titleIndex++ % count($titles)],
            ]);
        }

        return $jobs;
    }

    /**
     * @param  array<int, Job>  $jobs
     */
    private function seedJobScreeningQuestions(array $jobs): void
    {
        foreach (collect($jobs)->where('status', JobStatus::Published)->take(8) as $job) {
            JobScreeningQuestion::query()->create([
                'job_id' => $job->id,
                'question' => 'Apakah Anda memiliki pengalaman minimal 2 tahun di posisi serupa?',
                'type' => 'yes_no',
                'is_required' => true,
                'order_number' => 1,
            ]);
            JobScreeningQuestion::query()->create([
                'job_id' => $job->id,
                'question' => 'Berapa ekspektasi gaji bulanan Anda?',
                'type' => 'text',
                'is_required' => true,
                'order_number' => 2,
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, company: Company}>  $employers
     * @param  array<int, Job>  $jobs
     */
    private function seedAiInterviewTemplates(array $employers, array $jobs): void
    {
        foreach ($employers as $entry) {
            $company = $entry['company'];
            if (AiInterviewTemplate::query()->where('company_id', $company->id)->exists()) {
                continue;
            }
            AiInterviewTemplate::query()->create([
                'company_id' => $company->id,
                'job_id' => null,
                'name' => 'Template Default - '.$company->name,
                'description' => 'Template AI interview default untuk semua posisi.',
                'mode' => AiInterviewMode::Text,
                'language' => 'id',
                'duration_minutes' => 20,
                'question_count' => 5,
                'system_prompt' => 'Anda adalah pewawancara profesional untuk '.$company->name.'.',
                'is_default' => true,
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, Job>  $jobs
     */
    private function seedSavedJobs(array $employees, array $jobs): void
    {
        $publishedJobs = collect($jobs)->where('status', JobStatus::Published)->values();

        foreach ($employees as $emp) {
            $picks = $publishedJobs->random(min(rand(1, 3), $publishedJobs->count()));
            foreach ($picks as $job) {
                SavedJob::query()->firstOrCreate(
                    ['user_id' => $emp['user']->id, 'job_id' => $job->id],
                );
            }
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, Job>  $jobs
     * @return array<int, Application>
     */
    private function seedApplications(array $employees, array $jobs): array
    {
        $publishedJobs = collect($jobs)->where('status', JobStatus::Published)->values();
        $statuses = [
            ApplicationStatus::Submitted,
            ApplicationStatus::Reviewed,
            ApplicationStatus::Shortlisted,
            ApplicationStatus::Interview,
            ApplicationStatus::Offered,
            ApplicationStatus::Hired,
            ApplicationStatus::Rejected,
        ];

        $applications = [];

        foreach ($employees as $idx => $emp) {
            $picks = $publishedJobs->random(min(rand(2, 4), $publishedJobs->count()));
            foreach ($picks as $i => $job) {
                $status = $statuses[($idx + $i) % count($statuses)];
                $application = Application::query()->firstOrCreate(
                    ['job_id' => $job->id, 'employee_profile_id' => $emp['profile']->id],
                    [
                        'candidate_cv_id' => $emp['profile']->cvs()->first()?->id,
                        'cover_letter' => fake()->paragraph(),
                        'expected_salary' => rand(5, 30) * 1_000_000,
                        'status' => $status,
                        'ai_match_score' => rand(45, 95),
                        'applied_at' => now()->subDays(rand(0, 30)),
                        'reviewed_at' => $status !== ApplicationStatus::Submitted ? now()->subDays(rand(0, 20)) : null,
                    ],
                );

                if ($application->wasRecentlyCreated && $status !== ApplicationStatus::Submitted) {
                    ApplicationStatusLog::query()->create([
                        'application_id' => $application->id,
                        'from_status' => ApplicationStatus::Submitted,
                        'to_status' => $status,
                        'changed_by_user_id' => null,
                        'note' => 'Status updated by recruiter',
                    ]);
                }

                $applications[] = $application;
            }
        }

        return $applications;
    }

    /**
     * @param  array<int, Application>  $applications
     * @param  array<int, array{user: User, company: Company}>  $employers
     */
    private function seedInterviews(array $applications, array $employers): void
    {
        $interviewable = collect($applications)
            ->filter(fn (Application $a) => in_array($a->status, [
                ApplicationStatus::Interview,
                ApplicationStatus::Offered,
                ApplicationStatus::Hired,
            ], true))
            ->take(6);

        foreach ($interviewable as $app) {
            $employer = collect($employers)->firstWhere(
                fn (array $e) => $e['company']->id === $app->job->company_id,
            ) ?? $employers[0];

            $isPast = in_array($app->status, [ApplicationStatus::Offered, ApplicationStatus::Hired], true);

            $interview = Interview::query()->create([
                'application_id' => $app->id,
                'stage' => InterviewStage::HR,
                'mode' => 'online',
                'title' => 'Interview - '.$app->job?->title,
                'scheduled_at' => $isPast ? now()->subDays(rand(2, 14)) : now()->addDays(rand(1, 14)),
                'duration_minutes' => 60,
                'timezone' => 'Asia/Jakarta',
                'status' => $isPast ? InterviewStatus::Completed : InterviewStatus::Scheduled,
                'meeting_provider' => 'google_meet',
                'meeting_url' => 'https://meet.google.com/demo-'.Str::random(8),
                'scheduled_by_user_id' => $employer['user']->id,
                'requires_confirmation' => false,
            ]);

            // Participants
            InterviewParticipant::query()->create([
                'interview_id' => $interview->id,
                'user_id' => $app->employeeProfile?->user_id,
                'role' => 'candidate',
                'invitation_response' => 'accepted',
                'responded_at' => now()->subDay(),
            ]);
            InterviewParticipant::query()->create([
                'interview_id' => $interview->id,
                'user_id' => $employer['user']->id,
                'role' => 'interviewer',
                'invitation_response' => 'accepted',
                'responded_at' => now()->subDay(),
            ]);

            if ($isPast) {
                InterviewScorecard::query()->create([
                    'interview_id' => $interview->id,
                    'reviewer_id' => $employer['user']->id,
                    'overall_score' => rand(60, 92),
                    'recommendation' => fake()->randomElement(['strong_yes', 'yes', 'no']),
                    'criteria_scores' => ['communication' => rand(60, 95), 'technical' => rand(60, 95)],
                    'strengths' => 'Komunikasi baik, pengalaman relevan.',
                    'weaknesses' => 'Perlu deep dive di area tertentu.',
                    'comments' => 'Layak lanjut ke tahap berikutnya.',
                    'submitted_at' => now()->subDay(),
                ]);
            }
        }
    }

    /**
     * @param  array<int, Application>  $applications
     */
    private function seedAiInterviews(array $applications): void
    {
        $picks = collect($applications)->take(5);

        foreach ($picks as $app) {
            $session = AiInterviewSession::factory()->completed()->create([
                'application_id' => $app->id,
                'candidate_profile_id' => $app->employee_profile_id,
                'job_id' => $app->job_id,
            ]);

            for ($i = 1; $i <= 5; $i++) {
                $question = AiInterviewQuestion::query()->create([
                    'session_id' => $session->id,
                    'order_number' => $i,
                    'category' => fake()->randomElement(['technical', 'behavioral', 'situational']),
                    'question' => 'Ceritakan pengalaman Anda terkait '.fake()->words(3, true).'.',
                    'max_duration_seconds' => 120,
                ]);

                AiInterviewResponse::query()->create([
                    'session_id' => $session->id,
                    'question_id' => $question->id,
                    'answer_text' => fake()->paragraph(),
                    'duration_seconds' => rand(60, 180),
                    'ai_score' => rand(55, 95),
                    'sub_scores' => ['relevance' => rand(60, 95), 'clarity' => rand(55, 90)],
                    'ai_feedback' => 'Jawaban terstruktur dengan contoh yang relevan.',
                    'evaluated_at' => now()->subDay(),
                ]);
            }

            AiInterviewAnalysis::query()->create([
                'session_id' => $session->id,
                'overall_score' => rand(65, 92),
                'fit_score' => rand(60, 90),
                'recommendation' => fake()->randomElement(['strong_yes', 'yes', 'maybe']),
                'summary' => 'Kandidat menunjukkan komunikasi yang baik dan pemahaman teknis yang relevan untuk posisi ini.',
                'strengths' => ['Komunikasi terstruktur', 'Pengalaman relevan'],
                'weaknesses' => ['Perlu deep dive di system design'],
                'skill_assessment' => ['laravel' => 80, 'sql' => 75],
                'communication_score' => rand(70, 95),
                'technical_score' => rand(60, 90),
                'problem_solving_score' => rand(60, 90),
                'culture_fit_score' => rand(60, 90),
                'red_flags' => [],
                'generated_at' => now()->subDay(),
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, Job>  $jobs
     */
    private function seedAiMatchScores(array $employees, array $jobs): void
    {
        $publishedJobs = collect($jobs)->where('status', JobStatus::Published)->take(10);

        foreach ($employees as $emp) {
            foreach ($publishedJobs as $job) {
                AiMatchScore::query()->updateOrCreate(
                    ['job_id' => $job->id, 'candidate_profile_id' => $emp['profile']->id],
                    [
                        'score' => rand(40, 95),
                        'breakdown' => ['skills' => rand(20, 50), 'experience' => rand(10, 30), 'location' => rand(5, 15)],
                        'explanation' => 'Kecocokan berdasarkan skill dan pengalaman.',
                        'computed_at' => now()->subDays(rand(0, 5)),
                    ],
                );
            }
        }
    }

    /**
     * @param  array<int, array{user: User, company: Company}>  $employers
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, Job>  $jobs
     */
    private function seedTalentInteractions(array $employers, array $employees, array $jobs): void
    {
        foreach ($employers as $entry) {
            $picks = collect($employees)->random(min(3, count($employees)));
            foreach ($picks as $emp) {
                SavedCandidate::query()->firstOrCreate(
                    ['company_id' => $entry['company']->id, 'candidate_profile_id' => $emp['profile']->id],
                    [
                        'saved_by_user_id' => $entry['user']->id,
                        'label' => 'Pipeline aktif',
                        'note' => 'Profil kuat, follow-up minggu depan.',
                        'saved_at' => now()->subDays(rand(1, 14)),
                    ],
                );

                if (fake()->boolean(50)) {
                    CandidateOutreachMessage::query()->create([
                        'company_id' => $entry['company']->id,
                        'sender_user_id' => $entry['user']->id,
                        'candidate_profile_id' => $emp['profile']->id,
                        'candidate_user_id' => $emp['user']->id,
                        'job_id' => collect($jobs)->where('company_id', $entry['company']->id)->random()?->id,
                        'subject' => 'Tertarik berdiskusi tentang posisi kami?',
                        'body' => 'Halo, profil Anda menarik. Apakah terbuka untuk diskusi lebih lanjut?',
                        'status' => fake()->randomElement(['sent', 'read', 'replied']),
                        'sent_at' => now()->subDays(rand(1, 10)),
                    ]);
                }
            }

            TalentSearchLog::query()->create([
                'company_id' => $entry['company']->id,
                'user_id' => $entry['user']->id,
                'filters' => ['keyword' => 'backend laravel', 'experience_level' => 'mid'],
                'result_count' => rand(8, 30),
                'searched_at' => now()->subDays(rand(0, 7)),
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, company: Company}>  $employers
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     */
    private function seedCompanyReviews(array $employers, array $employees): void
    {
        foreach ($employers as $entry) {
            $reviewers = collect($employees)->random(min(3, count($employees)));
            foreach ($reviewers as $i => $emp) {
                CompanyReview::query()->firstOrCreate(
                    ['company_id' => $entry['company']->id, 'user_id' => $emp['user']->id],
                    [
                        'title' => fake()->randomElement(['Tempat belajar yang bagus', 'Lingkungan suportif', 'Cocok untuk fresh graduate', 'Banyak pengalaman']),
                        'rating' => rand(3, 5),
                        'rating_management' => rand(3, 5),
                        'rating_culture' => rand(3, 5),
                        'rating_compensation' => rand(3, 5),
                        'rating_growth' => rand(3, 5),
                        'rating_balance' => rand(3, 5),
                        'pros' => 'Tim kolaboratif, banyak kesempatan belajar, fasilitas memadai.',
                        'cons' => 'Beban kerja kadang tinggi, proses keputusan agak lambat.',
                        'employment_status' => fake()->randomElement(['current', 'former']),
                        'employment_type' => 'full_time',
                        'job_title' => 'Engineer',
                        'would_recommend' => true,
                        'is_anonymous' => fake()->boolean(),
                        'status' => $i === 0 ? 'approved' : fake()->randomElement(['approved', 'pending']),
                        'helpful_count' => rand(0, 12),
                    ],
                );
            }
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, array{user: User, company: Company}>  $employers
     */
    private function seedSalarySubmissions(array $employees, array $employers): void
    {
        $categories = JobCategory::query()->get();
        $cities = City::query()->limit(5)->get();

        foreach ($employees as $emp) {
            if (! fake()->boolean(60)) {
                continue;
            }
            SalarySubmission::query()->create([
                'user_id' => $emp['user']->id,
                'company_id' => collect($employers)->random()['company']->id,
                'job_category_id' => $categories->random()->id,
                'city_id' => $cities->random()->id,
                'province_id' => $cities->random()->province_id,
                'job_title' => fake()->randomElement(['Backend Engineer', 'Marketing Specialist', 'Sales Executive', 'Data Analyst', 'Product Designer']),
                'experience_level' => fake()->randomElement(ExperienceLevel::cases())->value,
                'experience_years' => rand(1, 8),
                'employment_type' => 'full_time',
                'salary_idr' => rand(5, 30) * 1_000_000,
                'bonus_idr' => rand(0, 5) * 1_000_000,
                'is_anonymous' => true,
                'is_verified' => fake()->boolean(40),
                'status' => fake()->randomElement(['approved', 'pending']),
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, company: Company}>  $employers
     */
    private function seedSubscriptionsAndOrders(array $employers): void
    {
        $plans = SubscriptionPlan::query()->get();
        if ($plans->isEmpty()) {
            return;
        }
        $paidPlans = $plans->where('price_idr', '>', 0);

        foreach ($employers as $idx => $entry) {
            $plan = $idx === 0 ? $plans->where('slug', 'free')->first() : $paidPlans->random();
            if (! $plan) {
                continue;
            }

            CompanySubscription::query()->updateOrCreate(
                ['company_id' => $entry['company']->id],
                [
                    'plan_id' => $plan->id,
                    'status' => SubscriptionStatus::Active,
                    'starts_at' => now()->subDays(15),
                    'ends_at' => now()->addDays(15),
                    'jobs_posted_count' => rand(2, 8),
                    'featured_credits_remaining' => rand(0, 5),
                    'ai_credits_remaining' => rand(0, 100),
                    'auto_renew' => true,
                ],
            );

            if ($plan->price_idr > 0) {
                $reference = 'ORD-DEMO-'.strtoupper(Str::random(6));
                $order = Order::query()->updateOrCreate(
                    ['reference' => $reference],
                    [
                        'company_id' => $entry['company']->id,
                        'user_id' => $entry['user']->id,
                        'item_type' => OrderItemType::SubscriptionPlan,
                        'item_ref_id' => $plan->id,
                        'description' => 'Subscription '.$plan->name,
                        'amount_idr' => $plan->price_idr,
                        'quantity' => 1,
                        'currency' => 'IDR',
                        'status' => OrderStatus::Paid,
                        'payment_provider' => 'duitku',
                        'payment_reference' => 'DK-'.Str::random(8),
                        'paid_at' => now()->subDays(15),
                        'metadata' => ['source' => 'demo'],
                    ],
                );

                PaymentTransaction::query()->updateOrCreate(
                    ['order_id' => $order->id, 'gateway_reference' => $order->payment_reference],
                    [
                        'provider' => 'duitku',
                        'payment_method' => 'BC',
                        'amount_idr' => $order->amount_idr,
                        'status' => PaymentStatus::Success,
                        'settled_at' => now()->subDays(15),
                    ],
                );
            }
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     */
    private function seedJobAlerts(array $employees): void
    {
        $categories = JobCategory::query()->get();
        $cities = City::query()->limit(3)->get();

        foreach ($employees as $i => $emp) {
            if (JobAlert::query()->where('user_id', $emp['user']->id)->exists()) {
                continue;
            }
            JobAlert::query()->create([
                'user_id' => $emp['user']->id,
                'name' => fake()->randomElement(['Backend Jakarta', 'Marketing Remote', 'Sales B2B', 'Data Analyst']),
                'keyword' => fake()->randomElement([null, 'laravel', 'marketing', 'sales']),
                'job_category_id' => $i % 2 === 0 ? $categories->random()->id : null,
                'city_id' => $cities->random()->id,
                'experience_level' => fake()->randomElement(ExperienceLevel::cases())->value,
                'frequency' => fake()->randomElement(['daily', 'weekly', 'instant']),
                'is_active' => true,
                'last_sent_at' => fake()->boolean() ? now()->subDays(rand(1, 7)) : null,
                'total_matches_sent' => rand(0, 25),
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, Job>  $jobs
     */
    private function seedDismissedRecommendations(array $employees, array $jobs): void
    {
        $publishedJobs = collect($jobs)->where('status', JobStatus::Published)->values();
        foreach ($employees as $emp) {
            if (! fake()->boolean(40)) {
                continue;
            }
            $job = $publishedJobs->random();
            DismissedJobRecommendation::query()->firstOrCreate(
                ['employee_profile_id' => $emp['profile']->id, 'job_id' => $job->id],
                ['dismissed_at' => now()->subDays(rand(1, 7))],
            );
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     */
    private function seedCareerCoach(array $employees): void
    {
        foreach (collect($employees)->take(4) as $emp) {
            $session = AiCoachSession::query()->create([
                'user_id' => $emp['user']->id,
                'title' => fake()->randomElement(['Tips negosiasi gaji', 'Persiapan wawancara teknis', 'Career switch ke product']),
                'summary' => 'Diskusi pendek tentang strategi karier.',
                'status' => 'active',
                'last_message_at' => now()->subDays(rand(0, 5)),
            ]);

            AiCoachMessage::query()->create([
                'session_id' => $session->id,
                'role' => 'user',
                'content' => 'Bagaimana cara saya mempersiapkan diri untuk role berikutnya?',
                'tokens_used' => 25,
                'model_snapshot' => 'fake-coach-1',
                'created_at' => now()->subHours(3),
            ]);
            AiCoachMessage::query()->create([
                'session_id' => $session->id,
                'role' => 'assistant',
                'content' => 'Mulai dari mengidentifikasi 3 skill kunci yang dibutuhkan dan jadwalkan latihan mingguan. Saya bisa bantu menyusun rencana detail.',
                'tokens_used' => 95,
                'model_snapshot' => 'fake-coach-1',
                'created_at' => now()->subHours(2),
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, array{user: User, company: Company}>  $employers
     */
    private function seedAiAuditLogs(array $employees, array $employers): void
    {
        foreach ($employees as $emp) {
            AiAuditLog::query()->create([
                'user_id' => $emp['user']->id,
                'feature' => 'coach',
                'provider' => 'fake',
                'model' => 'fake-coach-1',
                'status' => 'success',
                'prompt_tokens' => rand(50, 250),
                'completion_tokens' => rand(80, 400),
                'total_cost_usd' => round(rand(1, 50) / 10000, 4),
                'latency_ms' => rand(200, 1500),
            ]);
        }
        foreach ($employers as $entry) {
            AiAuditLog::query()->create([
                'user_id' => $entry['user']->id,
                'feature' => 'ai_interview',
                'provider' => 'fake',
                'model' => 'fake-interview-1',
                'status' => 'success',
                'prompt_tokens' => rand(100, 500),
                'completion_tokens' => rand(200, 800),
                'total_cost_usd' => round(rand(5, 100) / 10000, 4),
                'latency_ms' => rand(400, 3000),
            ]);
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     * @param  array<int, Job>  $jobs
     */
    private function seedNotifications(array $employees, array $jobs): void
    {
        $publishedJobs = collect($jobs)->where('status', JobStatus::Published);

        foreach (collect($employees)->take(6) as $emp) {
            $job = $publishedJobs->random();
            $emp['user']->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\JobAlertDigestNotification',
                'data' => [
                    'title' => 'Lowongan baru cocok dengan alert Anda',
                    'body' => $job->title.' di '.$job->company?->name,
                    'action_url' => '/jobs/'.$job->slug,
                    'icon' => 'bell',
                ],
                'read_at' => fake()->boolean(50) ? now()->subHours(2) : null,
                'created_at' => now()->subHours(rand(1, 48)),
                'updated_at' => now()->subHours(rand(1, 48)),
            ]);
        }
    }

    private function seedContent(User $admin): void
    {
        $announcements = [
            ['title' => 'Selamat datang di KarirConnect', 'audience' => 'all', 'body' => 'Kami senang Anda bergabung. Eksplorasi fitur baru kami.'],
            ['title' => 'Update kebijakan privasi', 'audience' => 'all', 'body' => 'Kebijakan privasi telah diperbarui efektif bulan ini.'],
            ['title' => 'Promo subscription untuk perusahaan', 'audience' => 'employers', 'body' => 'Diskon 20% untuk paket Pro selama bulan ini.'],
        ];
        foreach ($announcements as $a) {
            Announcement::query()->firstOrCreate(
                ['slug' => Str::slug($a['title'])],
                [
                    'title' => $a['title'],
                    'body' => $a['body'],
                    'audience' => $a['audience'],
                    'is_published' => true,
                    'published_at' => now()->subDays(rand(1, 14)),
                    'author_id' => $admin->id,
                ],
            );
        }

        $resources = [
            ['title' => 'Cara menulis CV yang efektif', 'category' => 'cv'],
            ['title' => '10 pertanyaan interview yang sering muncul', 'category' => 'interview'],
            ['title' => 'Negosiasi gaji untuk pemula', 'category' => 'salary'],
            ['title' => 'Membangun personal brand di LinkedIn', 'category' => 'career'],
        ];
        foreach ($resources as $r) {
            CareerResource::query()->firstOrCreate(
                ['slug' => Str::slug($r['title'])],
                [
                    'title' => $r['title'],
                    'excerpt' => 'Panduan praktis untuk pencari kerja.',
                    'body' => fake()->paragraphs(5, true),
                    'category' => $r['category'],
                    'tags' => ['career', 'tips'],
                    'author_id' => $admin->id,
                    'is_published' => true,
                    'published_at' => now()->subDays(rand(1, 30)),
                    'views_count' => rand(100, 5000),
                    'reading_minutes' => rand(3, 12),
                ],
            );
        }

        $faqs = [
            ['question' => 'Bagaimana cara mendaftar?', 'answer' => 'Klik tombol Daftar di pojok kanan atas dan pilih peran Anda.', 'category' => 'general'],
            ['question' => 'Apakah layanan ini gratis?', 'answer' => 'Ya, untuk pencari kerja sepenuhnya gratis. Perusahaan memiliki paket berbayar.', 'category' => 'pricing'],
            ['question' => 'Bagaimana cara melamar pekerjaan?', 'answer' => 'Klik lowongan, lalu tekan tombol Lamar. Pastikan profil Anda sudah lengkap.', 'category' => 'jobs'],
            ['question' => 'Apa itu AI Interview?', 'answer' => 'Fitur latihan wawancara berbasis AI untuk membantu persiapan Anda.', 'category' => 'ai'],
        ];
        foreach ($faqs as $i => $f) {
            Faq::query()->firstOrCreate(
                ['question' => $f['question']],
                [
                    'answer' => $f['answer'],
                    'category' => $f['category'],
                    'order_number' => $i + 1,
                    'is_published' => true,
                ],
            );
        }

        $legal = [
            ['slug' => 'terms', 'title' => 'Syarat & Ketentuan', 'body' => $this->termsBody()],
            ['slug' => 'privacy', 'title' => 'Kebijakan Privasi', 'body' => $this->privacyBody()],
            ['slug' => 'cookies', 'title' => 'Kebijakan Cookies', 'body' => $this->cookiesBody()],
        ];
        foreach ($legal as $l) {
            LegalPage::query()->updateOrCreate(['slug' => $l['slug']], $l);
        }

        $skill = Skill::query()->first();
        if ($skill) {
            for ($i = 0; $i < 5; $i++) {
                AssessmentQuestion::query()->firstOrCreate(
                    ['skill_id' => $skill->id, 'question' => 'Soal latihan #'.($i + 1).' untuk '.$skill->name],
                    [
                        'type' => 'multiple_choice',
                        'options' => ['A. Pilihan A', 'B. Pilihan B', 'C. Pilihan C', 'D. Pilihan D'],
                        'correct_answer' => ['A. Pilihan A'],
                        'difficulty' => fake()->randomElement(['easy', 'medium', 'hard']),
                        'time_limit_seconds' => 60,
                        'is_active' => true,
                    ],
                );
            }
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     */
    private function seedSkillAssessments(array $employees): void
    {
        $skill = Skill::query()->first();
        if (! $skill) {
            return;
        }

        foreach (collect($employees)->take(5) as $emp) {
            SkillAssessment::query()->firstOrCreate(
                ['employee_profile_id' => $emp['profile']->id, 'skill_id' => $skill->id],
                [
                    'status' => 'completed',
                    'score' => rand(60, 95),
                    'total_questions' => 10,
                    'correct_answers' => rand(6, 10),
                    'started_at' => now()->subDays(2),
                    'completed_at' => now()->subDays(2)->addMinutes(15),
                    'expires_at' => now()->addMonths(6),
                ],
            );
        }
    }

    private function seedSalaryInsights(): void
    {
        $cities = City::query()->limit(3)->get();
        $titles = [
            ['Backend Engineer', 'tech', 8_000_000, 14_000_000, 22_000_000],
            ['Marketing Specialist', 'marketing', 6_000_000, 10_000_000, 16_000_000],
            ['Sales Executive', 'sales', 5_000_000, 9_000_000, 14_000_000],
            ['Data Analyst', 'tech', 7_000_000, 12_000_000, 19_000_000],
            ['HR Generalist', 'hr', 5_500_000, 9_500_000, 13_500_000],
        ];
        foreach ($titles as $t) {
            SalaryInsight::query()->firstOrCreate(
                ['job_title' => $t[0]],
                [
                    'role_category' => $t[1],
                    'city_id' => $cities->random()?->id,
                    'experience_level' => 'mid',
                    'min_salary' => $t[2],
                    'median_salary' => $t[3],
                    'max_salary' => $t[4],
                    'sample_size' => rand(20, 200),
                    'source' => 'internal',
                    'last_updated_at' => now(),
                ],
            );
        }
    }

    /**
     * @param  array<int, array{user: User, profile: EmployeeProfile}>  $employees
     */
    private function seedReports(User $admin, array $employees): void
    {
        $review = CompanyReview::query()->first();
        if (! $review) {
            return;
        }

        $reporter = $employees[0]['user'] ?? null;
        if (! $reporter) {
            return;
        }

        Report::query()->firstOrCreate(
            ['reporter_user_id' => $reporter->id, 'reportable_type' => CompanyReview::class, 'reportable_id' => $review->id],
            [
                'reason' => 'spam',
                'description' => 'Konten review terindikasi promosi.',
                'status' => 'pending',
            ],
        );
    }

    private function seedContactMessages(): void
    {
        $samples = [
            ['name' => 'Andi Saputra', 'email' => 'andi@example.com', 'subject' => 'Pertanyaan tentang pendaftaran perusahaan', 'message' => 'Halo, bagaimana cara mendaftarkan perusahaan saya?'],
            ['name' => 'Rina Marlina', 'email' => 'rina@example.com', 'subject' => 'Lupa password', 'message' => 'Saya tidak bisa masuk ke akun. Mohon bantuannya.'],
            ['name' => 'PT Maju Sentosa', 'email' => 'hr@majusentosa.test', 'subject' => 'Penawaran kerjasama', 'message' => 'Kami tertarik untuk berlangganan paket enterprise.'],
        ];
        foreach ($samples as $s) {
            ContactMessage::query()->firstOrCreate(
                ['email' => $s['email'], 'subject' => $s['subject']],
                array_merge($s, ['ip' => '127.0.0.1', 'status' => 'new']),
            );
        }
    }

    private function termsBody(): string
    {
        return <<<'HTML'
<blockquote>
    <p><strong>Ringkasan singkat.</strong> Dengan menggunakan KarirConnect, Anda setuju untuk menggunakan layanan secara wajar, jujur dalam mengisi data, dan menghormati pengguna lain. Konten Anda tetap milik Anda; kami hanya mendapat lisensi untuk menampilkannya di platform.</p>
</blockquote>

<h2 id="pendahuluan">1. Pendahuluan</h2>
<p>Selamat datang di <strong>KarirConnect</strong>. Syarat &amp; Ketentuan ini ("Ketentuan") adalah perjanjian yang mengikat secara hukum antara Anda dengan PT KarirConnect Indonesia ("KarirConnect", "kami") sebagai operator platform yang dapat diakses melalui <code>karirconnect.id</code> dan aplikasi terkait.</p>
<p>Dengan membuat akun, mengakses, atau menggunakan layanan, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh Ketentuan ini. Apabila Anda tidak setuju, mohon tidak menggunakan layanan kami.</p>

<h2 id="definisi">2. Definisi</h2>
<ul>
    <li><strong>Layanan</strong> berarti seluruh fitur KarirConnect, termasuk papan lowongan, profil kandidat, AI Coach, AI Interview, dan layanan terkait.</li>
    <li><strong>Pengguna</strong> berarti setiap individu atau entitas yang menggunakan Layanan, baik sebagai Pencari Kerja maupun Pemberi Kerja.</li>
    <li><strong>Konten</strong> berarti seluruh data, teks, gambar, dan informasi yang diunggah ke Layanan.</li>
</ul>

<h2 id="akun">3. Akun &amp; Pendaftaran</h2>
<p>Untuk menggunakan sebagian besar fitur, Anda harus mendaftarkan akun. Anda berkewajiban:</p>
<ul>
    <li>Memberikan informasi yang akurat, terbaru, dan lengkap saat pendaftaran.</li>
    <li>Menjaga kerahasiaan kata sandi dan menyetujui bahwa setiap aktivitas pada akun Anda menjadi tanggung jawab Anda.</li>
    <li>Memberi tahu kami segera apabila terdapat dugaan akses tidak sah atau pelanggaran keamanan.</li>
    <li>Berusia minimal 17 tahun atau telah memperoleh persetujuan dari orang tua/wali sah.</li>
</ul>

<h2 id="layanan-pencari-kerja">4. Ketentuan untuk Pencari Kerja</h2>
<h3 id="profil-cv">4.1 Profil &amp; CV</h3>
<p>Anda bertanggung jawab atas keakuratan profil dan CV yang Anda unggah. Pemalsuan riwayat, kualifikasi, atau dokumen pendukung dapat berakibat pada penangguhan atau penghapusan akun.</p>

<h3 id="lamaran">4.2 Lamaran</h3>
<p>Saat melamar, Anda mengizinkan KarirConnect meneruskan profil dan dokumen Anda kepada Pemberi Kerja yang relevan. Keputusan rekrutmen sepenuhnya berada di tangan Pemberi Kerja, bukan KarirConnect.</p>

<h2 id="layanan-pemberi-kerja">5. Ketentuan untuk Pemberi Kerja</h2>
<ul>
    <li>Setiap lowongan harus mencerminkan posisi yang benar-benar dibuka, tidak menyesatkan, dan tidak mengandung diskriminasi atas dasar SARA, gender, usia, atau disabilitas.</li>
    <li>Pemberi Kerja dilarang memungut biaya apa pun dari kandidat dalam proses rekrutmen yang dimulai dari KarirConnect.</li>
    <li>Pemberi Kerja wajib mematuhi peraturan ketenagakerjaan Republik Indonesia dan kebijakan privasi terhadap data kandidat.</li>
</ul>

<h2 id="konten-pengguna">6. Konten Pengguna</h2>
<p>Anda tetap menjadi pemilik atas seluruh Konten yang Anda unggah. Dengan mengunggah Konten, Anda memberi KarirConnect lisensi non-eksklusif, di seluruh dunia, dan bebas royalti untuk menggunakan, menampilkan, dan mendistribusikan Konten tersebut sebatas yang diperlukan untuk menjalankan Layanan.</p>
<p>Anda dilarang mengunggah Konten yang melanggar hukum, hak kekayaan intelektual pihak lain, mengandung malware, atau bersifat menyesatkan.</p>

<h2 id="layanan-ai">7. Layanan Berbasis AI</h2>
<p>KarirConnect menyediakan fitur AI Coach, AI Interview, dan rekomendasi pekerjaan yang menggunakan teknologi kecerdasan buatan. Hasil dari fitur AI bersifat <strong>indikatif</strong> dan tidak dapat dijamin sempurna. Anda memahami bahwa:</p>
<ul>
    <li>AI dapat menghasilkan keluaran yang tidak akurat atau bias; gunakan sebagai panduan, bukan keputusan akhir.</li>
    <li>Data yang Anda masukkan ke fitur AI dapat diproses oleh penyedia model pihak ketiga (mis. OpenAI) dengan standar keamanan yang setara.</li>
    <li>Kami tidak menjamin keberhasilan rekrutmen, kelulusan interview, atau penawaran gaji tertentu berdasarkan hasil AI.</li>
</ul>

<h2 id="pembayaran">8. Pembayaran &amp; Langganan</h2>
<p>Layanan untuk Pencari Kerja sepenuhnya gratis. Pemberi Kerja dapat berlangganan paket berbayar yang ketentuannya diuraikan terpisah pada halaman harga. Pembayaran tidak dapat dikembalikan kecuali diatur lain dalam paket terkait.</p>

<h2 id="penangguhan">9. Penangguhan &amp; Pemutusan</h2>
<p>Kami berhak menangguhkan atau menghentikan akses Anda apabila Anda melanggar Ketentuan ini, terdapat indikasi penyalahgunaan, atau atas perintah pejabat yang berwenang. Anda dapat menutup akun kapan saja melalui pengaturan akun.</p>

<h2 id="batasan-tanggung-jawab">10. Batasan Tanggung Jawab</h2>
<p>Sejauh diizinkan oleh hukum, KarirConnect tidak bertanggung jawab atas kerugian tidak langsung, kehilangan peluang kerja, atau kehilangan keuntungan yang timbul dari penggunaan Layanan. Tanggung jawab maksimal kami terbatas pada jumlah biaya berlangganan yang Anda bayarkan dalam 12 bulan terakhir.</p>

<h2 id="perubahan">11. Perubahan Ketentuan</h2>
<p>Kami dapat memperbarui Ketentuan ini dari waktu ke waktu. Perubahan material akan diumumkan melalui email atau notifikasi platform paling lambat 14 hari sebelum berlaku. Penggunaan layanan setelah tanggal efektif dianggap sebagai persetujuan terhadap versi terbaru.</p>

<h2 id="hukum">12. Hukum yang Berlaku</h2>
<p>Ketentuan ini tunduk pada hukum Republik Indonesia. Setiap perselisihan akan diselesaikan terlebih dahulu secara musyawarah, dan jika tidak tercapai, melalui Pengadilan Negeri Jakarta Selatan.</p>

<h2 id="kontak-terms">13. Kontak</h2>
<p>Pertanyaan tentang Ketentuan ini dapat dikirim ke <a href="mailto:legal@karirconnect.id">legal@karirconnect.id</a>.</p>
HTML;
    }

    private function privacyBody(): string
    {
        return <<<'HTML'
<blockquote>
    <p><strong>Ringkasan singkat.</strong> Kami hanya mengumpulkan data yang benar-benar dibutuhkan untuk membantu Anda mendapat pekerjaan. Anda dapat melihat, memperbarui, atau menghapus data Anda kapan saja melalui dashboard. Kami tidak menjual data Anda kepada pihak ketiga.</p>
</blockquote>

<h2 id="pendahuluan-privacy">1. Pendahuluan</h2>
<p>Kebijakan Privasi ini menjelaskan bagaimana <strong>KarirConnect</strong> mengumpulkan, menggunakan, mengungkap, dan melindungi informasi pribadi Anda saat Anda menggunakan layanan kami. Kami berkomitmen mematuhi UU Pelindungan Data Pribadi (UU PDP) Republik Indonesia dan praktik terbaik perlindungan data internasional.</p>

<h2 id="data-yang-dikumpulkan">2. Data yang Kami Kumpulkan</h2>

<h3 id="data-langsung">2.1 Data yang Anda Berikan</h3>
<ul>
    <li><strong>Identitas dasar</strong>: nama, email, nomor telepon, foto profil.</li>
    <li><strong>Profil profesional</strong>: riwayat pendidikan, pengalaman kerja, skill, ekspektasi gaji, dan CV.</li>
    <li><strong>Konten lamaran</strong>: cover letter, jawaban pre-screening, dan dokumen pendukung.</li>
    <li><strong>Informasi pembayaran</strong> (khusus Pemberi Kerja): kami tidak menyimpan nomor kartu — pembayaran ditangani gateway tepercaya.</li>
</ul>

<h3 id="data-otomatis">2.2 Data yang Terkumpul Otomatis</h3>
<ul>
    <li>Alamat IP, jenis perangkat, browser, dan halaman yang dikunjungi.</li>
    <li>Cookie dan teknologi serupa (lihat Kebijakan Cookies).</li>
    <li>Riwayat interaksi dengan fitur AI (untuk meningkatkan kualitas saran).</li>
</ul>

<h3 id="data-pihak-ketiga">2.3 Data dari Pihak Ketiga</h3>
<p>Apabila Anda mendaftar via Google atau LinkedIn, kami menerima nama, email, dan foto profil sesuai izin yang Anda berikan pada penyedia tersebut.</p>

<h2 id="penggunaan-data">3. Bagaimana Kami Menggunakan Data</h2>
<ul>
    <li>Menyediakan, mengoperasikan, dan memelihara Layanan.</li>
    <li>Memproses lamaran dan menghubungkan Anda dengan Pemberi Kerja yang relevan.</li>
    <li>Memberikan rekomendasi pekerjaan, saran AI Coach, dan latihan AI Interview.</li>
    <li>Mengirim notifikasi penting, update produk, dan pemasaran (Anda dapat berhenti berlangganan kapan saja).</li>
    <li>Mendeteksi dan mencegah penipuan, penyalahgunaan, atau aktivitas yang melanggar hukum.</li>
    <li>Memenuhi kewajiban hukum dan menanggapi permintaan resmi dari otoritas yang berwenang.</li>
</ul>

<h2 id="pembagian-data">4. Pembagian Data</h2>
<p>Kami <strong>tidak menjual</strong> data pribadi Anda. Kami hanya membagikan data dalam keadaan berikut:</p>
<ul>
    <li><strong>Pemberi Kerja</strong>: profil dan dokumen lamaran yang Anda kirim akan diteruskan ke perusahaan terkait.</li>
    <li><strong>Penyedia layanan</strong>: hosting (cloud), email, analitik, dan model AI (mis. OpenAI), dengan kontrak perlindungan data.</li>
    <li><strong>Otoritas hukum</strong>: bila diwajibkan oleh hukum, perintah pengadilan, atau permintaan resmi.</li>
    <li><strong>Penerus bisnis</strong>: dalam hal merger, akuisisi, atau penjualan aset, dengan pemberitahuan kepada Anda.</li>
</ul>

<h2 id="penyimpanan">5. Penyimpanan &amp; Keamanan</h2>
<p>Data disimpan di pusat data dengan sertifikasi industri (ISO 27001 atau setara). Kami menerapkan enkripsi saat transit (TLS 1.2+) dan saat penyimpanan untuk data sensitif. Akses internal dibatasi berdasarkan prinsip least privilege.</p>
<p>Data akun aktif disimpan selama akun Anda ada. Setelah penghapusan akun, sebagian data dapat tetap disimpan hingga maksimal 24 bulan untuk kepentingan audit dan kepatuhan hukum.</p>

<h2 id="hak-anda">6. Hak Anda sebagai Subjek Data</h2>
<p>Sesuai UU PDP, Anda berhak untuk:</p>
<ul>
    <li>Mengakses dan memperoleh salinan data pribadi Anda.</li>
    <li>Memperbarui atau memperbaiki data yang tidak akurat.</li>
    <li>Menghapus akun beserta data terkait (right to be forgotten).</li>
    <li>Membatasi atau menolak pemrosesan untuk tujuan tertentu (mis. pemasaran).</li>
    <li>Memindahkan data ke layanan lain dalam format umum.</li>
</ul>
<p>Permintaan dapat dikirim ke <a href="mailto:dpo@karirconnect.id">dpo@karirconnect.id</a> dan akan kami tindaklanjuti dalam 14 hari kerja.</p>

<h2 id="ai-privasi">7. Pemrosesan oleh AI</h2>
<p>Saat Anda menggunakan AI Coach atau AI Interview, isi percakapan dapat dikirim ke penyedia model AI pihak ketiga untuk menghasilkan respons. Kami memilih penyedia yang berkomitmen <strong>tidak menggunakan data Anda untuk melatih model</strong> dan menghapus data input setelah pemrosesan.</p>

<h2 id="cookies-privacy">8. Cookies</h2>
<p>Penggunaan cookies dijelaskan terpisah dalam <a href="/legal/cookies">Kebijakan Cookies</a>.</p>

<h2 id="anak">9. Anak di Bawah Umur</h2>
<p>Layanan tidak ditujukan untuk anak di bawah 17 tahun. Kami tidak secara sengaja mengumpulkan data dari anak. Bila Anda mengetahui bahwa anak telah memberikan data, mohon hubungi kami untuk dihapus.</p>

<h2 id="perubahan-privacy">10. Perubahan Kebijakan</h2>
<p>Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan material akan diberitahukan melalui email atau notifikasi platform setidaknya 14 hari sebelum berlaku.</p>

<h2 id="kontak-privacy">11. Hubungi DPO</h2>
<p>Untuk pertanyaan, keluhan, atau permintaan terkait privasi, hubungi Data Protection Officer kami di <a href="mailto:dpo@karirconnect.id">dpo@karirconnect.id</a>.</p>
HTML;
    }

    private function cookiesBody(): string
    {
        return <<<'HTML'
<blockquote>
    <p><strong>Ringkasan singkat.</strong> Kami menggunakan cookies untuk menjaga Anda tetap login, memahami cara platform digunakan, dan menampilkan pengalaman yang sesuai. Anda dapat menonaktifkan cookies non-esensial kapan saja melalui pengaturan browser.</p>
</blockquote>

<h2 id="apa-itu-cookies">1. Apa itu Cookies?</h2>
<p>Cookies adalah berkas teks kecil yang disimpan di perangkat Anda saat mengunjungi sebuah situs. Cookies membantu situs mengingat preferensi Anda, status login, dan aktivitas sebelumnya untuk memberi pengalaman yang lebih baik.</p>
<p>Selain cookies, kami juga menggunakan teknologi serupa seperti <em>local storage</em>, <em>session storage</em>, dan piksel pelacak untuk tujuan yang dijelaskan di bawah.</p>

<h2 id="jenis-cookies">2. Jenis Cookies yang Kami Gunakan</h2>

<h3 id="cookies-esensial">2.1 Cookies Esensial</h3>
<p>Cookies ini wajib agar layanan dapat berjalan. Tanpa cookies ini, fitur seperti login, pengiriman lamaran, dan keamanan tidak akan berfungsi.</p>
<ul>
    <li><code>laravel_session</code> — menjaga sesi pengguna agar tetap login.</li>
    <li><code>XSRF-TOKEN</code> — perlindungan terhadap serangan cross-site request forgery.</li>
    <li><code>remember_web_*</code> — opsi "ingat saya" pada halaman login.</li>
</ul>

<h3 id="cookies-fungsional">2.2 Cookies Fungsional</h3>
<p>Membantu kami menyimpan preferensi seperti bahasa, filter pencarian terakhir, dan tampilan dashboard.</p>
<ul>
    <li><code>kc_filter_preferences</code> — preferensi filter pencarian lowongan.</li>
    <li><code>kc_theme</code> — preferensi tampilan (saat ini hanya light).</li>
</ul>

<h3 id="cookies-analitik">2.3 Cookies Analitik</h3>
<p>Membantu kami memahami bagaimana pengguna berinteraksi dengan platform agar dapat terus diperbaiki. Data dikumpulkan secara agregat dan tidak digunakan untuk mengidentifikasi individu.</p>
<ul>
    <li><strong>Plausible Analytics</strong> — analitik yang menghormati privasi, tanpa cross-site tracking.</li>
    <li><strong>Sentry</strong> — pelacakan error untuk meningkatkan stabilitas (tidak melacak perilaku pengguna).</li>
</ul>

<h3 id="cookies-pemasaran">2.4 Cookies Pemasaran</h3>
<p>Hanya aktif jika Anda memberikan persetujuan. Membantu menampilkan kampanye yang relevan di platform pihak ketiga.</p>
<ul>
    <li><strong>Meta Pixel</strong> — kampanye di Facebook/Instagram untuk audiens yang relevan.</li>
    <li><strong>LinkedIn Insight</strong> — kampanye B2B untuk perusahaan rekrutmen.</li>
</ul>

<h2 id="cookies-pihak-ketiga">3. Cookies Pihak Ketiga</h2>
<p>Beberapa cookies disetel oleh layanan pihak ketiga yang kami integrasikan. Cookie-cookie ini tunduk pada kebijakan privasi masing-masing penyedia. Pihak ketiga utama yang kami gunakan:</p>
<ul>
    <li><strong>Google</strong> (untuk login Google &amp; reCAPTCHA).</li>
    <li><strong>LinkedIn</strong> (untuk login &amp; tombol profesional).</li>
    <li><strong>Cloudflare</strong> (untuk keamanan &amp; pengiriman konten).</li>
</ul>

<h2 id="kelola-cookies">4. Cara Mengelola Cookies</h2>
<p>Anda dapat mengelola cookies dengan beberapa cara:</p>
<ul>
    <li><strong>Banner persetujuan</strong>: muncul saat kunjungan pertama; pilih "Hanya esensial" untuk menolak yang lain.</li>
    <li><strong>Pengaturan akun</strong>: ubah preferensi di menu Privasi &amp; Cookies.</li>
    <li><strong>Pengaturan browser</strong>: blokir atau hapus cookies via pengaturan browser Anda.</li>
    <li><strong>Mode penyamaran</strong>: gunakan jendela private/incognito untuk membatasi cookies persisten.</li>
</ul>
<p><strong>Catatan:</strong> menolak cookies esensial akan membuat sebagian fitur tidak berfungsi (mis. login dan lamaran).</p>

<h2 id="masa-berlaku">5. Masa Berlaku Cookies</h2>
<ul>
    <li><strong>Session cookies</strong>: dihapus saat browser ditutup.</li>
    <li><strong>Persistent cookies</strong>: bertahan 30 hari hingga 12 bulan tergantung jenisnya.</li>
    <li><strong>Cookie "ingat saya"</strong>: maksimal 60 hari.</li>
</ul>

<h2 id="perubahan-cookies">6. Perubahan Kebijakan</h2>
<p>Kebijakan Cookies ini dapat diperbarui mengikuti perkembangan fitur dan regulasi. Tanggal perubahan terakhir tercatat di bagian atas halaman ini.</p>

<h2 id="kontak-cookies">7. Pertanyaan?</h2>
<p>Jika Anda memiliki pertanyaan tentang penggunaan cookies, silakan hubungi <a href="mailto:privacy@karirconnect.id">privacy@karirconnect.id</a>.</p>
HTML;
    }
}
