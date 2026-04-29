# KarirConnect — Blueprint Implementasi (v2)

> **Status:** Draft v2 — untuk review & approval sebelum coding dimulai.
> **Stack starter:** Laravel 13 · Inertia v3 · React 19 · TypeScript · Tailwind v4 · Fortify v1 · Wayfinder v0 · shadcn/ui (new-york).
> **Inspirasi referensi:** `/applications/laravel/jobportal` (KARIVIA). Banyak ide diambil, tapi struktur, nama, dan implementasinya berbeda — KarirConnect didesain lebih clean & modular.

---

## 1. Ringkasan Sistem

**KarirConnect** adalah job portal end-to-end yang mempertemukan **Employee** (pencari kerja), **Employer** (perusahaan/HR), dan **Admin** (pengelola). Beda dari job board biasa, KarirConnect membawa **AI-powered hiring tools**:

- **3 mode interview**: AI Interview, Online (Google Meet), Onsite.
- **AI Career Coach** untuk kandidat (chat).
- **AI Match Score** job ↔ kandidat (otomatis tiap lamar).
- **CV Analyzer & CV Builder** (form → PDF).
- **Skill Assessment** dengan bank soal yang bisa dikelola admin.
- **Talent Search** (employer browse kandidat aktif).
- **Company Reviews & Verification badges** untuk transparansi.
- **Salary Insight** publik per role/lokasi.
- **Settings dinamis** — admin bisa edit branding, SEO, payment gateway, AI key, feature flag tanpa redeploy.
- **Pricing & Payment** via **Duitku** (Indonesia-friendly).

Sistem dibangun sebagai **monolith Laravel + Inertia React SPA** dengan dua permukaan: site publik (browse jobs/companies/articles, salary tool) dan dashboard area per-role (admin/employer/employee).

---

## 2. Tujuan Sistem

1. Memberi pencari kerja **alat lengkap end-to-end**: cari kerja, build CV, latihan AI interview, assessment skill, coaching karir.
2. Memberi perusahaan **alat hiring bertenaga AI**: post job, screening otomatis (AI match), interview multi-stage (AI/online/onsite), scorecard, talent search.
3. Memberi admin **kontrol penuh** + settings dinamis tanpa code deploy.
4. **Differentiator** vs jobportal generic: kombinasi AI coach + AI interview + payment lokal Duitku + branding fully customizable.
5. **Clean & scalable** — modular, mudah swap AI provider, mudah ganti payment gateway.

---

## 3. Tech Stack

| Layer | Pilihan | Catatan |
|---|---|---|
| Bahasa | PHP 8.4 | starter |
| Framework | Laravel 13 | starter |
| Auth | Fortify v1 | login, register, 2FA, email verify |
| SPA bridge | Inertia v3 | shared props, deferred props, polling |
| Routing FE | Wayfinder v0 | type-safe URL — wajib |
| Frontend | React 19 + TypeScript 5 | `tsc --noEmit` lulus |
| Styling | Tailwind v4 | CSS variables shadcn |
| Komponen UI | shadcn/ui (new-york, neutral) | §17 |
| Toast | Sonner | wajib §20 |
| Ikon | Lucide React | konsisten |
| Rich editor | TipTap v2 | §21 |
| HTML sanitizer | `mews/purifier` (HTMLPurifier) | server side wajib |
| HTTP client | Laravel HTTP Facade (Guzzle) | untuk integrasi |
| Tabel data FE | TanStack Table v8 + shadcn Table | §18 |
| Form FE | Inertia `useForm` + komponen `form/*` | §19 |
| Date | `date-fns` (locale id) | format dd MMM yyyy |
| Money | helper `format-rupiah.ts` | format live Rp |
| Testing | Pest 4 (+ Pest plugin Laravel) | `php artisan test --compact` |
| Lint/format PHP | Pint | `--dirty --format agent` |
| Lint/format JS | ESLint 9 + Prettier 3 | |
| File storage | disk `public` (default) | upgrade S3 saat scale |
| Queue | driver `database` | mail, AI, WebHook |
| **AI provider** | **OpenAI (default), config-able via Setting** | API key disimpan terenkripsi |
| **Calendar/Meet** | **Google Calendar API + Meet auto-link** | OAuth 2.0 per-employer |
| **Payment** | **Duitku** | merchant code/API key di Setting |
| **PDF generator** | `barryvdh/laravel-dompdf` | CV builder, invoice |
| **Image processing** | `intervention/image v3` | resize logo/avatar |
| **Speech-to-text** | OpenAI Whisper (via API) | live transcript AI interview |

**Komponen shadcn/ui yang masih perlu di-add saat implementasi:**
`table`, `form`, `popover`, `calendar`, `command`, `tabs`, `textarea`, `empty`, `pagination`, `progress`, `scroll-area`, `radio-group`, `switch`, `accordion`, `chart`, `hover-card`, `slider`.

**Composer packages yang perlu ditambah:**
`mews/purifier`, `barryvdh/laravel-dompdf`, `intervention/image`, `google/apiclient`, `openai-php/laravel`.

**NPM packages yang perlu ditambah:**
`@tanstack/react-table`, `@tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder`, `date-fns`, `dompurify`, `recharts`.

---

## 4. Role & Hak Akses

| Role | Deskripsi | Akses kunci |
|---|---|---|
| **Admin** | Pengelola sistem | semua user, perusahaan, lowongan, kategori, skill, pengumuman, setting platform, payment, AI audit, pricing plan |
| **Employer** | Perusahaan / HR / recruiter | profil perusahaan, CRUD lowongan, kelola pelamar, jadwalkan interview (AI/online/onsite), scorecard, talent search, billing/subscription |
| **Employee** | Pencari kerja | profil + CV, lamar, saved job, lihat status, ikut AI interview, AI career coach, skill assessment, lihat salary insight |
| **Guest** | Pengunjung tanpa login | browse lowongan, perusahaan, salary tool, career resources |

Implementasi: kolom `role` enum di `users` (`admin/employer/employee`). Detail di §22.

---

## 5. Struktur Folder Backend

```
app/
├── Actions/
│   ├── Fortify/                          (sudah ada)
│   ├── Application/
│   │   ├── SubmitApplicationAction.php
│   │   └── ChangeApplicationStatusAction.php
│   ├── Interview/
│   │   ├── ScheduleInterviewAction.php
│   │   ├── RescheduleInterviewAction.php
│   │   ├── CancelInterviewAction.php
│   │   └── SubmitScorecardAction.php
│   ├── AiInterview/
│   │   ├── StartAiInterviewAction.php
│   │   ├── SubmitAnswerAction.php
│   │   └── FinalizeAiInterviewAction.php
│   ├── Job/
│   │   ├── PublishJobAction.php
│   │   └── CloseJobAction.php
│   └── Company/
│       ├── ApproveCompanyAction.php
│       └── VerifyCompanyAction.php
│
├── Enums/
│   ├── UserRole.php
│   ├── JobStatus.php
│   ├── ApplicationStatus.php
│   ├── EmploymentType.php
│   ├── ExperienceLevel.php
│   ├── WorkArrangement.php
│   ├── EducationLevel.php
│   ├── CompanyStatus.php
│   ├── CompanyVerificationStatus.php
│   ├── InterviewMode.php             (ai, online, onsite)
│   ├── InterviewStage.php            (screening, hr, user, technical, final)
│   ├── InterviewStatus.php
│   ├── AiInterviewMode.php           (text, voice)
│   ├── AiInterviewStatus.php
│   ├── PaymentStatus.php
│   ├── SubscriptionStatus.php
│   ├── ReviewStatus.php              (pending, approved, rejected)
│   └── Gender.php
│
├── Http/
│   ├── Controllers/
│   │   ├── Controller.php
│   │   ├── Public/
│   │   │   ├── HomeController.php
│   │   │   ├── JobBrowseController.php
│   │   │   ├── CompanyBrowseController.php
│   │   │   ├── SalaryInsightController.php
│   │   │   └── CareerResourceController.php
│   │   ├── Employee/
│   │   │   ├── DashboardController.php
│   │   │   ├── ProfileController.php
│   │   │   ├── EducationController.php
│   │   │   ├── WorkExperienceController.php
│   │   │   ├── CertificationController.php
│   │   │   ├── CvBuilderController.php
│   │   │   ├── CvUploadController.php
│   │   │   ├── ApplicationController.php
│   │   │   ├── SavedJobController.php
│   │   │   ├── InterviewController.php          (lihat & confirm undangan)
│   │   │   ├── AiInterviewController.php        (jalani sesi)
│   │   │   ├── SkillAssessmentController.php
│   │   │   ├── CareerCoachController.php        (chat AI)
│   │   │   └── CompanyReviewController.php
│   │   ├── Employer/
│   │   │   ├── DashboardController.php
│   │   │   ├── CompanyProfileController.php
│   │   │   ├── CompanyVerificationController.php
│   │   │   ├── TeamController.php
│   │   │   ├── JobController.php
│   │   │   ├── JobScreeningQuestionController.php
│   │   │   ├── ApplicantController.php
│   │   │   ├── ApplicationStatusController.php
│   │   │   ├── InterviewController.php          (CRUD jadwal)
│   │   │   ├── InterviewScorecardController.php
│   │   │   ├── AiInterviewTemplateController.php (template pertanyaan)
│   │   │   ├── AiInterviewReviewController.php (lihat hasil)
│   │   │   ├── TalentSearchController.php
│   │   │   ├── GoogleCalendarController.php    (OAuth callback)
│   │   │   └── BillingController.php
│   │   ├── Admin/
│   │   │   ├── DashboardController.php
│   │   │   ├── UserController.php
│   │   │   ├── CompanyController.php
│   │   │   ├── CompanyVerificationController.php
│   │   │   ├── JobController.php
│   │   │   ├── JobCategoryController.php
│   │   │   ├── SkillController.php
│   │   │   ├── AssessmentQuestionController.php
│   │   │   ├── AnnouncementController.php
│   │   │   ├── CareerResourceController.php
│   │   │   ├── SalaryInsightController.php
│   │   │   ├── CompanyReviewModerationController.php
│   │   │   ├── ReportController.php
│   │   │   ├── PricingPlanController.php
│   │   │   ├── SubscriptionController.php
│   │   │   ├── PaymentController.php
│   │   │   ├── AiAuditLogController.php
│   │   │   ├── AuditLogController.php
│   │   │   └── SettingController.php           (KEY — branding, SEO, AI, Duitku)
│   │   ├── Webhooks/
│   │   │   └── DuitkuWebhookController.php
│   │   └── Settings/                            (sudah ada — user settings)
│   │
│   ├── Middleware/
│   │   ├── HandleAppearance.php                (sudah ada)
│   │   ├── HandleInertiaRequests.php           (sudah ada — extend §22)
│   │   ├── EnsureUserHasRole.php
│   │   ├── EnsureCompanyApproved.php
│   │   └── EnsureSubscriptionActive.php        (untuk fitur premium employer)
│   │
│   ├── Requests/
│   │   ├── Settings/                           (sudah ada)
│   │   ├── Admin/
│   │   ├── Employer/
│   │   └── Employee/
│   │
│   └── Resources/
│       ├── JobResource.php
│       ├── JobListResource.php
│       ├── ApplicationResource.php
│       ├── CompanyResource.php
│       ├── EmployeeProfileResource.php
│       ├── InterviewResource.php
│       ├── AiInterviewSessionResource.php
│       ├── ConversationResource.php
│       ├── MessageResource.php
│       ├── PricingPlanResource.php
│       └── PaymentResource.php
│
├── Models/                                      (lihat §9)
│
├── Notifications/
│   ├── ApplicationSubmitted.php                 (ke recruiter)
│   ├── ApplicationStatusChanged.php             (ke pelamar)
│   ├── InterviewScheduled.php                   (ke pelamar + recruiter)
│   ├── InterviewRescheduled.php
│   ├── InterviewReminder.php                    (queued, scheduled)
│   ├── AiInterviewInvitation.php
│   ├── AiInterviewCompleted.php                 (ke recruiter)
│   ├── CompanyApproved.php
│   ├── CompanyVerified.php
│   ├── PaymentSucceeded.php
│   └── SubscriptionExpiring.php
│
├── Observers/
│   ├── ApplicationObserver.php                  (status log + counter)
│   ├── JobObserver.php                          (slug + counter)
│   ├── AuditLogObserver.php
│   └── AiInterviewSessionObserver.php
│
├── Policies/
│   ├── JobPolicy.php
│   ├── ApplicationPolicy.php
│   ├── CompanyPolicy.php
│   ├── EmployeeProfilePolicy.php
│   ├── InterviewPolicy.php
│   ├── AiInterviewSessionPolicy.php
│   ├── ConversationPolicy.php
│   ├── AnnouncementPolicy.php
│   ├── PricingPlanPolicy.php
│   └── SettingPolicy.php
│
├── Providers/
│   ├── AppServiceProvider.php
│   └── FortifyServiceProvider.php
│
├── QueryFilters/
│   ├── Filter.php (interface)
│   ├── JobFilters/
│   ├── ApplicationFilters/
│   ├── TalentSearchFilters/
│   └── InterviewFilters/
│
├── Services/
│   ├── Job/
│   │   ├── JobService.php
│   │   └── JobMatchingService.php               (AI score)
│   ├── Application/
│   │   └── ApplicationService.php
│   ├── Company/
│   │   ├── CompanyService.php
│   │   └── CompanyVerificationService.php
│   ├── Employee/
│   │   ├── EmployeeProfileService.php           (completion %)
│   │   ├── CvBuilderService.php                 (form → PDF)
│   │   └── CvAnalyzerService.php                (parse PDF/Doc)
│   ├── Interview/
│   │   ├── InterviewService.php                 (CRUD + reminder)
│   │   ├── InterviewSchedulingService.php       (cek conflict slot)
│   │   ├── GoogleMeetService.php                (create event + link)
│   │   └── InterviewIcsExporter.php             (.ics file)
│   ├── AiInterview/
│   │   ├── AiInterviewService.php               (orchestrator)
│   │   ├── AiQuestionGeneratorService.php       (generate dari job desc)
│   │   ├── AiAnswerEvaluatorService.php         (skor jawaban)
│   │   ├── AiInterviewAnalysisService.php       (final summary)
│   │   └── SpeechToTextService.php              (Whisper)
│   ├── Ai/
│   │   ├── AiClientFactory.php                  (provider abstraction)
│   │   ├── OpenAiClient.php
│   │   ├── AiCareerCoachService.php
│   │   └── AiAuditService.php
│   ├── SkillAssessment/
│   │   └── SkillAssessmentService.php
│   ├── TalentSearch/
│   │   └── TalentSearchService.php
│   ├── Messaging/
│   │   ├── ConversationService.php
│   │   └── MessageService.php
│   ├── Payment/
│   │   ├── DuitkuService.php                    (create transaction, verify signature)
│   │   ├── SubscriptionService.php
│   │   └── PaymentService.php
│   ├── Settings/
│   │   └── SettingService.php                   (get/set, cache, type cast)
│   ├── Files/
│   │   └── FileUploadService.php
│   ├── Sanitizer/
│   │   └── HtmlSanitizerService.php
│   └── Dashboard/
│       └── DashboardMetricsService.php
│
└── Support/
    ├── Money.php
    ├── SlugGenerator.php
    └── DuitkuSignature.php
```

**Prinsip:** controller tipis · service untuk logika bisnis · action untuk mutation atomic · QueryFilter pipeline untuk list · Resource untuk shape data · Policy + Gate untuk access.

---

## 6. Struktur Folder Frontend

```
resources/js/
├── app.tsx
├── components/
│   ├── ui/                                  (shadcn primitives)
│   ├── data-table/                          (DataTable + Toolbar + ColumnHeader + Pagination + RowActions + FacetedFilter + ViewOptions)
│   ├── form/                                (FormField, InputField, TextareaField, SelectField, MultiSelectField, DatePickerField, DateRangeField, MoneyInput, RichTextEditor, FileUploadField, ImageUploadField, ComboboxField, FormSection)
│   ├── feedback/                            (EmptyState, LoadingSkeleton, ErrorState, ConfirmDialog, StatusBadge)
│   ├── layout/                              (PageHeader, Section, StatCard, FilterBar)
│   ├── shared/                              (JobCard, CompanyCard, CompanyLogo, ApplicationStatusBadge, SalaryDisplay, SkillTag, ProfileCompletion, SafeHtml, MatchScoreBadge, VerifiedBadge, RatingStars)
│   ├── interview/
│   │   ├── interview-mode-selector.tsx
│   │   ├── interview-stage-pipeline.tsx     (kanban-like)
│   │   ├── interview-card.tsx
│   │   ├── interview-form.tsx
│   │   ├── interview-scorecard-form.tsx
│   │   └── interview-reminder-banner.tsx
│   ├── ai-interview/
│   │   ├── ai-interview-runner.tsx          (main UI saat sesi jalan)
│   │   ├── ai-interview-question-card.tsx
│   │   ├── ai-interview-recorder.tsx        (mic + waveform)
│   │   ├── ai-interview-live-transcript.tsx
│   │   ├── ai-interview-progress.tsx
│   │   └── ai-interview-result.tsx          (skor + breakdown)
│   ├── career-coach/
│   │   └── chat-bubble.tsx
│   ├── messaging/
│   │   ├── conversation-list.tsx
│   │   ├── message-thread.tsx
│   │   └── message-composer.tsx
│   ├── pricing/
│   │   ├── pricing-card.tsx
│   │   └── plan-comparison-table.tsx
│   └── (existing app-sidebar dll. tetap)
│
├── hooks/
│   ├── use-data-table.ts
│   ├── use-debounced-search.ts
│   ├── use-confirm.ts
│   ├── use-flash-toast.ts                   (sudah ada)
│   ├── use-mediarecorder.ts                 (AI voice)
│   ├── use-poll-resource.ts
│   └── (existing)
│
├── layouts/
│   ├── public-layout.tsx
│   ├── admin-layout.tsx
│   ├── employer-layout.tsx
│   ├── employee-layout.tsx
│   ├── auth-layout.tsx                      (sudah ada)
│   └── settings/                            (sudah ada)
│
├── lib/
│   ├── utils.ts                             (sudah ada — cn)
│   ├── format-rupiah.ts
│   ├── format-date.ts
│   ├── salary.ts
│   ├── sanitize-html.ts                     (DOMPurify defensive)
│   └── settings.ts                          (helper baca setting dari shared props)
│
├── pages/
│   ├── auth/                                (sudah ada)
│   ├── settings/                            (sudah ada — user settings)
│   ├── dashboard.tsx                        (redirect by role)
│   ├── welcome.tsx                          (landing)
│   │
│   ├── public/
│   │   ├── jobs/index.tsx
│   │   ├── jobs/show.tsx
│   │   ├── companies/index.tsx
│   │   ├── companies/show.tsx
│   │   ├── salary-insight.tsx
│   │   ├── career-resources/index.tsx
│   │   └── career-resources/show.tsx
│   │
│   ├── employee/
│   │   ├── dashboard.tsx
│   │   ├── profile/edit.tsx
│   │   ├── profile/educations.tsx
│   │   ├── profile/work-experiences.tsx
│   │   ├── profile/certifications.tsx
│   │   ├── cv/builder.tsx                   (multi-step wizard)
│   │   ├── cv/index.tsx                     (list CV upload + builder result)
│   │   ├── applications/index.tsx
│   │   ├── applications/show.tsx
│   │   ├── saved-jobs/index.tsx
│   │   ├── interviews/index.tsx
│   │   ├── interviews/show.tsx              (detail + tombol konfirmasi/Meet)
│   │   ├── ai-interviews/index.tsx
│   │   ├── ai-interviews/run.tsx            (UI sesi)
│   │   ├── ai-interviews/result.tsx
│   │   ├── skill-assessments/index.tsx
│   │   ├── skill-assessments/take.tsx
│   │   ├── career-coach.tsx                 (chat)
│   │   └── company-reviews/create.tsx
│   │
│   ├── employer/
│   │   ├── dashboard.tsx
│   │   ├── company/edit.tsx
│   │   ├── company/verification.tsx
│   │   ├── team.tsx
│   │   ├── jobs/index.tsx
│   │   ├── jobs/create.tsx
│   │   ├── jobs/edit.tsx
│   │   ├── jobs/show.tsx                    (preview + screening Q)
│   │   ├── applicants/index.tsx
│   │   ├── applicants/show.tsx              (detail + match score + ubah status)
│   │   ├── interviews/index.tsx             (kanban per stage)
│   │   ├── interviews/create.tsx
│   │   ├── interviews/show.tsx              (detail + scorecard)
│   │   ├── ai-interviews/templates.tsx
│   │   ├── ai-interviews/results.tsx        (list hasil)
│   │   ├── ai-interviews/result-detail.tsx
│   │   ├── talent-search.tsx
│   │   ├── messages/index.tsx
│   │   ├── billing/index.tsx                (subscription + invoice)
│   │   └── billing/checkout.tsx             (Duitku redirect)
│   │
│   └── admin/
│       ├── dashboard.tsx
│       ├── users/index.tsx
│       ├── users/show.tsx
│       ├── companies/index.tsx
│       ├── companies/show.tsx
│       ├── company-verifications/index.tsx
│       ├── jobs/index.tsx
│       ├── categories/index.tsx
│       ├── skills/index.tsx
│       ├── assessment-questions/index.tsx
│       ├── assessment-questions/edit.tsx
│       ├── announcements/index.tsx
│       ├── announcements/edit.tsx
│       ├── career-resources/index.tsx
│       ├── career-resources/edit.tsx
│       ├── salary-insights/index.tsx
│       ├── company-reviews/index.tsx        (moderasi)
│       ├── reports/index.tsx
│       ├── pricing-plans/index.tsx
│       ├── subscriptions/index.tsx
│       ├── payments/index.tsx
│       ├── ai-audit-logs/index.tsx
│       ├── audit-logs/index.tsx
│       └── settings/                        ← ★ KEY MODULE
│           ├── index.tsx                    (tabs)
│           ├── general.tsx                  (app name, tagline, contact, locale, timezone)
│           ├── branding.tsx                 (logo, favicon, primary color, login bg)
│           ├── seo.tsx                      (meta title, description, keywords, OG image)
│           ├── ai.tsx                       (provider, api key, model, max tokens, feature flags)
│           ├── payment.tsx                  (Duitku merchant code, api key, env, callback)
│           ├── email.tsx                    (SMTP/Resend config, from name)
│           ├── feature-flags.tsx            (toggle modul: ai_coach, talent_search, dll)
│           └── legal.tsx                    (Terms, Privacy konten rich)
│
├── routes/                                  (auto Wayfinder)
├── actions/                                 (auto Wayfinder)
├── wayfinder/                               (auto Wayfinder)
└── types/
    ├── index.ts                             (sudah ada)
    ├── auth.ts                              (sudah ada)
    ├── navigation.ts                        (sudah ada)
    ├── ui.ts                                (sudah ada)
    ├── domain.ts                            (Job, Application, Interview, AiInterview, dll)
    ├── enums.ts
    └── settings.ts                          (typed setting keys)
```

---

## 7. Rancangan Database

> Default `bigIncrements` PK, `timestamps`, `softDeletes` di entitas kunci, FK `cascadeOnDelete`/`restrictOnDelete` sesuai semantik. Charset `utf8mb4`.

### 7.1 User & Profile

#### `users` (extend dari starter)
| Kolom | Tipe | Catatan |
|---|---|---|
| id | bigint PK | |
| name | string | |
| email | string unique | |
| email_verified_at | timestamp null | |
| password | string | hashed |
| role | enum('admin','employer','employee') default 'employee' | |
| avatar_path | string null | |
| phone | string null | |
| address | text null | |
| locale | string(5) default 'id' | id/en (siap multi-lang) |
| is_active | boolean default true | |
| notification_settings | json null | preferensi email/push |
| two_factor_* | (sudah ada) | |
| timestamps, remember_token | | |

**Index:** `(role)`, `(email)`, `(is_active)`.

#### `employee_profiles`
| Kolom | Tipe |
|---|---|
| id, user_id FK unique cascade | |
| headline string null | |
| about longText null (rich) | |
| date_of_birth date null, gender enum | |
| province_id, city_id FK null restrict | |
| current_position string null | |
| expected_salary_min/max unsignedBigInt null | |
| experience_level enum | |
| primary_resume_id FK candidate_cvs null restrict | resume yang aktif |
| portfolio_url, linkedin_url, github_url string null | |
| profile_completion tinyInt default 0 | |
| is_open_to_work boolean default true | |
| visibility enum('public','recruiter_only','private') default 'public' | untuk talent search |
| cv_builder_json json null | data CV builder |
| timestamps | |

#### `candidate_cvs` (multi-CV per kandidat)
| Kolom | Tipe |
|---|---|
| id, employee_profile_id FK cascade | |
| label string | "CV Backend 2026" |
| source enum('upload','builder') | |
| file_path string null | PDF |
| pages_count smallInt null | |
| analyzed_json json null | hasil CV Analyzer |
| is_active boolean default false | |
| timestamps | |

#### `educations`, `work_experiences`, `certifications` — masing-masing FK ke `employee_profiles`, struktur standar (lihat blueprint sebelumnya). `certifications` tambah: `issuer`, `credential_id`, `credential_url`, `issued_date`, `expires_date`.

#### `skills` (master)
`id, name unique, slug unique, category, is_active, timestamps`.

#### `employee_skill` pivot
`employee_profile_id, skill_id, level enum, years_experience tinyInt, is_endorsed_by_assessment boolean`.

---

### 7.2 Company

#### `companies`
| Kolom | Tipe |
|---|---|
| id, owner_id FK users restrict | |
| name string, slug unique, tagline string null | |
| logo_path, cover_path string null | |
| website, email, phone string null | |
| industry_id FK industries null | |
| size_id FK company_sizes null | (1-10/11-50/dst — tabel sendiri agar admin bisa edit) |
| founded_year smallInt null | |
| province_id, city_id FK null | |
| address text null | |
| about longText null (rich) | |
| culture longText null (rich) | "kenapa join kami" |
| benefits longText null (rich) | |
| status enum('pending','approved','suspended') default 'pending' | |
| verification_status enum('unverified','pending','verified','rejected') default 'unverified' | |
| approved_at, verified_at timestamp null | |
| timestamps, softDeletes | |

#### `industries` master, `company_sizes` master.

#### `company_offices` (multi-lokasi kantor)
`id, company_id FK cascade, name, address, city_id, lat, lng, is_headquarters bool, timestamps`.

#### `company_members` (pivot)
`id, company_id, user_id, role enum('owner','admin','recruiter') default 'recruiter', invited_at, joined_at, timestamps. Unique (company_id, user_id)`.

#### `company_verifications` (dokumen legal upload)
`id, company_id FK cascade, document_type enum('akta','npwp','siup','nib','tdp','other'), file_path, status enum, reviewed_by_user_id, review_note, reviewed_at, timestamps`.

#### `company_badges` (otomatis: top responder, fast hire, dsb.)
`id, company_id, badge_key, granted_at, expires_at`.

#### `company_reviews`
`id, company_id, employee_profile_id FK cascade, rating tinyInt 1-5, title, body text, pros text, cons text, work_status enum('current','former'), is_anonymous bool, status enum('pending','approved','rejected'), moderated_by, moderated_at, timestamps`.

---

### 7.3 Job

#### `jobs`
| Kolom | Tipe |
|---|---|
| id, company_id FK cascade | |
| posted_by_user_id FK users restrict | |
| job_category_id FK restrict | |
| title, slug unique | |
| description, responsibilities, requirements, benefits longText null (rich) | |
| employment_type enum, work_arrangement enum, experience_level enum | |
| min_education enum null | |
| salary_min/max unsignedBigInt null, is_salary_visible bool | |
| province_id, city_id FK null | |
| status enum('draft','published','closed','archived') default 'draft' | |
| application_deadline date null | |
| is_anonymous bool default false | sembunyikan nama perusahaan |
| is_featured bool default false | berbayar via Duitku |
| featured_until timestamp null | |
| views_count, applications_count unsignedInt default 0 | |
| ai_match_threshold tinyInt null | filter auto AI score min |
| auto_invite_ai_interview bool default false | undang AI interview otomatis |
| published_at, closed_at timestamp null | |
| timestamps, softDeletes | |

**Index:** banyak (lihat v1 — tetap berlaku).

#### `job_skill` pivot, `saved_jobs` (user_id+job_id), `job_views` (untuk analytics: id, job_id, user_id null, ip, created_at).

#### `job_screening_questions` (pertanyaan custom employer)
`id, job_id FK cascade, question, type enum('text','yes_no','single_choice','multi_choice','number'), options json null, is_required bool, knockout_value json null (jawaban yang auto-reject), order_number, timestamps`.

---

### 7.4 Application

#### `applications`
`id, job_id, employee_profile_id, cv_id (snapshot), cover_letter longText null, expected_salary, status enum (ApplicationStatus), applied_at, reviewed_at, ai_match_score tinyInt null, screening_score tinyInt null, current_stage enum (InterviewStage) null, timestamps. Unique (job_id, employee_profile_id)`.

#### `application_status_logs`
append-only: `from_status, to_status, changed_by_user_id, note`.

#### `application_screening_answers`
`id, application_id FK cascade, question_id FK, answer text/json, score tinyInt null`.

---

### 7.5 Interview (3 mode) ★ MODUL UTAMA BARU

#### `interviews`
| Kolom | Tipe |
|---|---|
| id | |
| application_id FK cascade | |
| stage enum('screening','hr','user','technical','final') | |
| mode enum('ai','online','onsite') | |
| title string | "Interview Teknis Round 1" |
| scheduled_at timestamp | |
| duration_minutes unsignedSmallInt default 60 | |
| ends_at timestamp generated/computed | |
| timezone string default 'Asia/Jakarta' | |
| status enum('scheduled','rescheduled','ongoing','completed','cancelled','no_show','expired') default 'scheduled' | |
| **online fields:** | |
| meeting_provider enum('google_meet','zoom','custom') null | |
| meeting_url string null | |
| meeting_id string null | gcal event id |
| meeting_passcode string null | |
| **onsite fields:** | |
| location_name string null | "Kantor Pusat" |
| location_address text null | |
| location_map_url string null | |
| **AI fields:** | |
| ai_session_id FK ai_interview_sessions null cascade | bila mode=ai |
| **shared:** | |
| candidate_instructions longText null (rich) | |
| internal_notes text null | |
| requires_confirmation bool default true | |
| confirmed_at timestamp null | |
| reminder_sent_at timestamp null | |
| recording_url string null | |
| recording_consent bool default false | |
| scheduled_by_user_id FK users restrict | |
| created_at, updated_at | |

**Index:** `(application_id)`, `(scheduled_at, status)`, `(stage, status)`, `(scheduled_by_user_id)`.

#### `interview_participants`
`id, interview_id FK cascade, user_id FK cascade, role enum('candidate','interviewer','observer'), invitation_response enum('pending','accepted','declined','tentative') default 'pending', responded_at timestamp null, attended bool null, timestamps. Unique (interview_id, user_id)`.

#### `interview_reschedule_requests`
`id, interview_id FK cascade, requested_by_user_id, reason, proposed_slots json (array of timestamps), status enum('pending','approved','rejected'), reviewed_by_user_id null, reviewed_at, decision_note text null, timestamps`.

#### `interview_scorecards`
`id, interview_id FK cascade, reviewer_id FK users restrict, overall_score tinyInt 1-5, recommendation enum('strong_yes','yes','no','strong_no'), criteria_scores json (rubric dinamis: technical/communication/culture/etc 1-5), strengths text, weaknesses text, comments longText (rich), submitted_at timestamp, timestamps`. **Unique (interview_id, reviewer_id)**.

#### `google_calendar_tokens`
`id, user_id FK unique cascade, calendar_email, access_token text, refresh_token text null, expires_at timestamp null, scopes json, timestamps`.

---

### 7.6 AI Interview (mendalam) ★

#### `ai_interview_templates` (employer bisa simpan template)
`id, company_id FK cascade, job_id FK null cascade, name, description, mode enum('text','voice'), language enum('id','en'), duration_minutes, question_count, system_prompt longText null, is_default bool, timestamps`.

#### `ai_interview_sessions`
| Kolom | Tipe |
|---|---|
| id | |
| application_id FK cascade null | null bila mode practice (kandidat mandiri) |
| candidate_profile_id FK cascade | |
| job_id FK null restrict | snapshot job |
| template_id FK null restrict | |
| mode enum('text','voice') | |
| language enum('id','en') default 'id' | |
| status enum('pending','invited','in_progress','completed','expired','cancelled') default 'pending' | |
| invitation_token string unique null | link akses tanpa login |
| invited_at, started_at, completed_at, expires_at timestamp null | |
| duration_seconds unsignedInt null | |
| recording_url string null (audio/video) | |
| live_transcript longText null | full transcript |
| ai_provider string, ai_model string | snapshot |
| system_prompt_snapshot longText | reproducibility |
| reschedule_count tinyInt default 0 | |
| is_practice bool default false | mock interview kandidat |
| timestamps | |

#### `ai_interview_questions`
`id, session_id FK cascade, order_number, category enum('opening','technical','behavioral','situational','culture','closing'), question text, context text null, expected_keywords json null, max_duration_seconds smallInt default 120, timestamps`.

#### `ai_interview_responses`
`id, session_id, question_id, answer_text longText null, audio_url string null, transcript longText null, duration_seconds smallInt null, ai_score tinyInt null (0-100), sub_scores json (relevance, clarity, technical_accuracy, communication, depth), ai_feedback text null, evaluated_at timestamp null, timestamps`.

#### `ai_interview_analyses` (1-1 session, hasil final)
`id, session_id FK unique cascade, overall_score tinyInt, fit_score tinyInt, recommendation enum('strong_hire','hire','no_hire','strong_no_hire'), summary longText, strengths json, weaknesses json, skill_assessment json, communication_score tinyInt, technical_score tinyInt, problem_solving_score tinyInt, culture_fit_score tinyInt, red_flags json null, generated_at timestamp, timestamps`.

#### `ai_interview_reschedule_histories`
`id, session_id, requested_by_user_id, old_expires_at, new_expires_at, reason, status, reviewed_by, reviewed_at, timestamps`.

---

### 7.7 AI Career Coach

#### `ai_coach_sessions`
`id, user_id FK cascade, title, summary text null, status enum('active','archived'), last_message_at, timestamps`.

#### `ai_coach_messages`
`id, session_id FK cascade, role enum('user','assistant','system'), content longText, tokens_used unsignedInt null, model_snapshot string null, created_at`.

#### `ai_career_recommendations`
`id, user_id FK cascade, type enum('job_match','skill_gap','course','role_path'), payload json, generated_at, is_dismissed bool, timestamps`.

---

### 7.8 AI Match & Audit

#### `ai_match_scores` (cache match score job ↔ candidate)
`id, job_id, candidate_profile_id, score tinyInt, breakdown json (skills/experience/location/salary), explanation text null, computed_at, timestamps. Unique (job_id, candidate_profile_id)`.

#### `ai_audit_logs`
`id, user_id null, feature string ('ai_interview', 'cv_analyzer', 'coach', 'match'), provider, model, prompt_tokens, completion_tokens, total_cost_usd decimal(10,6), input_json json null, output_json json null, latency_ms, status enum, error_message text null, timestamps`.

---

### 7.9 Skill Assessment

#### `assessment_questions` (admin-managed bank)
`id, skill_id FK cascade, type enum('multiple_choice','code','text'), question longText, options json null, correct_answer json, difficulty enum('easy','medium','hard'), time_limit_seconds, is_active, timestamps`.

#### `skill_assessments` (sesi assessment kandidat)
`id, employee_profile_id FK cascade, skill_id FK cascade, status enum('pending','in_progress','completed','expired'), score tinyInt null, total_questions, correct_answers, started_at, completed_at, expires_at, timestamps`.

#### `skill_assessment_answers`
`id, assessment_id, question_id, answer json, is_correct bool, time_spent_seconds, created_at`.

---

### 7.10 Talent Search & Engagement

#### `employer_talent_candidates` (shortlist employer untuk kandidat tertentu)
`id, company_id, employee_profile_id, added_by_user_id, status enum('shortlisted','contacted','rejected'), note text, contacted_at, timestamps`.

#### `candidate_job_views`
`id, candidate_profile_id, job_id, viewed_at, source string null`.

---

### 7.11 Messaging

#### `conversations`
`id, type enum('direct','interview'), context_type, context_id (morph: application/interview/null), last_message_at, timestamps`.

#### `conversation_participants`
`id, conversation_id, user_id, joined_at, last_read_at, is_muted bool, timestamps`.

#### `messages`
`id, conversation_id FK cascade, sender_user_id FK restrict, body text, attachments json null, is_read bool, read_at, timestamps`.

#### `message_templates` (employer)
`id, company_id, name, body text, category enum('invitation','rejection','offer','followup','custom'), timestamps`.

---

### 7.12 Content & Resources

#### `announcements` `id, title, slug, body longText (rich), audience enum, is_published, published_at, author_id, timestamps`.
#### `career_resources` `id, title, slug unique, excerpt, body longText (rich), thumbnail_path, category, tags json, author_id, is_published, published_at, views_count, reading_minutes, timestamps`.
#### `salary_insights` `id, job_title string, role_category, city_id null, experience_level enum, min_salary, median_salary, max_salary, sample_size, source string, last_updated_at, timestamps`.
#### `faqs` `id, question, answer longText, category, order_number, is_published, timestamps`.
#### `legal_pages` `id, slug unique ('terms','privacy','cookie'), title, body longText (rich), updated_at, timestamps`. (atau bisa pakai `settings` saja)

---

### 7.13 Pricing & Payment (Duitku)

#### `pricing_plans`
`id, slug unique, name, target enum('employer','employee'), price_idr unsignedBigInt, duration_days smallInt, description text, features json (array fitur), is_active bool, sort_order, timestamps`.

#### `subscriptions`
`id, subscriber_type, subscriber_id (morph: user atau company), pricing_plan_id FK restrict, status enum('pending','active','expired','cancelled'), starts_at, ends_at timestamp, auto_renew bool default false, timestamps. Index (subscriber_type, subscriber_id, status)`.

#### `payments`
`id, subscription_id FK null restrict, payable_type, payable_id (morph: subscription / featured_job), user_id FK restrict, gateway string default 'duitku', merchant_order_id string unique, reference string null (dari Duitku), amount, fee, payment_method string null, status enum('pending','paid','failed','expired','refunded'), paid_at timestamp null, raw_response json null, signature_verified bool default false, timestamps`.

---

### 7.14 Notifications & Logs

- `notifications` (Laravel default `php artisan notifications:table`).
- `user_device_tokens` (FCM/web push) — `id, user_id, platform enum('web','android','ios'), token unique, last_used_at`.
- `audit_logs` (admin actions, morph auditable).
- `reports` `id, reporter_user_id, reportable_type, reportable_id, reason enum, description, status, reviewed_by, reviewed_at, timestamps`.
- `contact_messages` `id, name, email, subject, message, ip, status enum('new','read','responded'), timestamps`.

---

### 7.15 Settings (★ KEY MODULE)

Pakai **single table key-value** dengan group untuk fleksibilitas + cache di memory.

#### `settings`
| Kolom | Tipe |
|---|---|
| id | |
| group string | (general, branding, seo, ai, payment, email, feature_flags, legal) |
| key string | |
| value longText null | |
| type enum('string','text','int','float','bool','json','file','password') | password = encrypted |
| label string | label di UI |
| description text null | help text |
| is_public bool default false | apakah boleh expose di shared props publik |
| sort_order smallInt default 0 | |
| timestamps | |

**Unique:** `(group, key)`.

**Strategi:**

- `SettingService::get($key, $default)` — cache `Cache::rememberForever('settings.all', ...)`. Auto-decrypt password type.
- `SettingService::set($key, $value)` — invalidate cache.
- File type (logo/favicon) simpan path, gunakan `FileUploadService`.
- Password type: encrypt at rest pakai Laravel `Crypt`.

**Setting keys default (seed):**

| Group | Key | Type |
|---|---|---|
| general | app_name | string |
| general | app_tagline | string |
| general | contact_email | string |
| general | contact_phone | string |
| general | timezone | string |
| general | default_locale | string |
| branding | logo_path | file |
| branding | logo_dark_path | file |
| branding | favicon_path | file |
| branding | primary_color | string |
| branding | login_background_path | file |
| seo | meta_title | string |
| seo | meta_description | text |
| seo | meta_keywords | text |
| seo | og_image_path | file |
| seo | google_analytics_id | string |
| seo | google_tag_manager_id | string |
| ai | provider | string (openai) |
| ai | api_key | password |
| ai | model_chat | string (gpt-4o-mini) |
| ai | model_interview | string (gpt-4o) |
| ai | model_embed | string |
| ai | max_tokens | int |
| payment | duitku_merchant_code | string |
| payment | duitku_api_key | password |
| payment | duitku_environment | string (sandbox/production) |
| payment | duitku_callback_url | string |
| payment | duitku_return_url | string |
| email | mail_driver | string |
| email | mail_from_address | string |
| email | mail_from_name | string |
| email | smtp_host/port/username/password/encryption | (jika SMTP) |
| feature_flags | ai_interview_enabled | bool |
| feature_flags | ai_coach_enabled | bool |
| feature_flags | talent_search_enabled | bool |
| feature_flags | company_reviews_enabled | bool |
| feature_flags | salary_insight_enabled | bool |
| feature_flags | google_login_enabled | bool |
| legal | terms_body | text (rich) |
| legal | privacy_body | text (rich) |
| legal | cookie_body | text (rich) |

**Frontend access:** subset `is_public=true` di-share via Inertia (`HandleInertiaRequests`) — branding, SEO, feature flags. Rahasia (api keys) **tidak pernah** di-share.

---

## 8. Relasi Antar Tabel (ringkas)

```
User ──1:1── EmployeeProfile ──*── Education / WorkExperience / Certification / Cv
EmployeeProfile ──*:*── Skill (employee_skill)
EmployeeProfile ──*── Application ──1:1── Job

User ──*── Company (owner / company_members[role])
Company ──*── Job / CompanyOffice / CompanyVerification / CompanyReview / CompanyBadge
Company ──1── Subscription (active plan)

Job ──*── Application
Job ──*── JobScreeningQuestion
Job ──*:*── Skill (job_skill)
Application ──*── ApplicationScreeningAnswer
Application ──*── Interview ──*── InterviewParticipant
Interview ──1:1── AiInterviewSession (jika mode=ai)
Interview ──*── InterviewScorecard
AiInterviewSession ──*── AiInterviewQuestion ──*── AiInterviewResponse
AiInterviewSession ──1:1── AiInterviewAnalysis

User ──*── AiCoachSession ──*── AiCoachMessage
User ──*── AiCareerRecommendation

Conversation ──*── ConversationParticipant ──1── User
Conversation ──*── Message

Subscription/FeaturedJob ──*── Payment (morph)
```

---

## 9. Daftar Model Laravel

**User & Profile:** `User`, `EmployeeProfile`, `CandidateCv`, `Education`, `WorkExperience`, `Certification`, `Skill`.
**Company:** `Company`, `CompanyMember`, `CompanyOffice`, `CompanyVerification`, `CompanyBadge`, `CompanyReview`, `Industry`, `CompanySize`.
**Job:** `Job`, `JobCategory`, `JobScreeningQuestion`, `SavedJob`, `JobView`.
**Application:** `Application`, `ApplicationStatusLog`, `ApplicationScreeningAnswer`.
**Interview:** `Interview`, `InterviewParticipant`, `InterviewRescheduleRequest`, `InterviewScorecard`, `GoogleCalendarToken`.
**AI Interview:** `AiInterviewTemplate`, `AiInterviewSession`, `AiInterviewQuestion`, `AiInterviewResponse`, `AiInterviewAnalysis`, `AiInterviewRescheduleHistory`.
**AI Coach/Match:** `AiCoachSession`, `AiCoachMessage`, `AiCareerRecommendation`, `AiMatchScore`, `AiAuditLog`.
**Assessment:** `AssessmentQuestion`, `SkillAssessment`, `SkillAssessmentAnswer`.
**Talent:** `EmployerTalentCandidate`, `CandidateJobView`.
**Messaging:** `Conversation`, `ConversationParticipant`, `Message`, `MessageTemplate`.
**Content:** `Announcement`, `CareerResource`, `SalaryInsight`, `Faq`, `LegalPage`.
**Pricing:** `PricingPlan`, `Subscription`, `Payment`.
**System:** `Setting`, `Notification`, `UserDeviceToken`, `AuditLog`, `Report`, `ContactMessage`.
**Lookup:** `Province`, `City`.

**Konvensi:** enum cast, `casts()` method, attribute `#[Fillable]`/`#[Hidden]`, `$with` minimal & eksplisit, observer untuk counter & log, factory + state untuk testing.

---

## 10. Daftar Controller (ringkas)

(Detail nama file di §5. Highlight method:)

- **Public:** `Home`, `JobBrowse`, `CompanyBrowse`, `SalaryInsight`, `CareerResource`, `Contact`.
- **Employee:** Dashboard, Profile, Education, WorkExperience, Certification, **CvBuilder**, **CvUpload**, Application, SavedJob, **Interview** (lihat undangan + konfirmasi), **AiInterview** (jalani sesi), **SkillAssessment**, **CareerCoach** (chat), CompanyReview.
- **Employer:** Dashboard, CompanyProfile, **CompanyVerification**, **Team**, Job, **JobScreeningQuestion**, Applicant, ApplicationStatus, **Interview** (CRUD), **InterviewScorecard**, **AiInterviewTemplate**, **AiInterviewReview**, **TalentSearch**, **GoogleCalendar** (OAuth + callback), Message, **Billing**.
- **Admin:** Dashboard, User, Company, CompanyVerification, Job, JobCategory, Skill, **AssessmentQuestion**, Announcement, CareerResource, SalaryInsight, CompanyReviewModeration, Report, **PricingPlan**, **Subscription**, **Payment**, AiAuditLog, AuditLog, **Setting**.
- **Webhooks:** **DuitkuWebhookController** (verify signature, update Payment, activate Subscription).

---

## 11. Daftar Service Class (key)

| Service | Tanggung jawab |
|---|---|
| **SettingService** | get/set, cache, encrypt password fields, expose public subset |
| **DuitkuService** | createTransaction, verifyCallback, computeSignature, refund |
| **PaymentService** | bridge Duitku ↔ subscription/featured job |
| **SubscriptionService** | activate, expire, renew, gate fitur premium |
| **InterviewService** | create (3 mode), reschedule, cancel, kirim reminder |
| **InterviewSchedulingService** | cek conflict slot interviewer & kandidat |
| **GoogleMeetService** | OAuth refresh, create event with Meet link, sync attendees |
| **InterviewIcsExporter** | generate .ics buat email lampiran |
| **AiClientFactory** | abstrak provider (OpenAI/etc) — baca dari Setting |
| **AiInterviewService** | orchestrator: invite, start, submit answer, finalize |
| **AiQuestionGeneratorService** | dari job desc + skill → pertanyaan |
| **AiAnswerEvaluatorService** | skor jawaban + sub-scores |
| **AiInterviewAnalysisService** | summary final, strengths/weaknesses, fit score |
| **SpeechToTextService** | Whisper API wrapper |
| **AiCareerCoachService** | chat session, context retrieval (CV, riwayat) |
| **AiAuditService** | log token usage, cost |
| **JobMatchingService** | hitung match score job ↔ candidate (skill overlap, exp, salary, location) — dipanggil saat apply atau on-demand |
| **CvBuilderService** | render PDF dari `cv_builder_json` (dompdf) |
| **CvAnalyzerService** | parse PDF, extract skills/experience pakai AI, isi `analyzed_json` |
| **SkillAssessmentService** | start, scoring, expire |
| **TalentSearchService** | filter + score kandidat (visibility=public/recruiter_only) |
| **ConversationService**, **MessageService** | CRUD + read state |
| **CompanyVerificationService** | upload dokumen, approve/reject, set badge verified |
| **EmployeeProfileService** | hitung completion, set primary CV |
| **JobService** | publish/close/duplicate, slug, featured |
| **ApplicationService** | submit + match score auto + notif |
| **DashboardMetricsService** | KPI per role + cache |
| **HtmlSanitizerService** | wrap HTMLPurifier |
| **FileUploadService** | upload + validasi MIME + image resize |

---

## 12. Form Request Validation

Tiap entitas + flow punya request: Store/Update/Filter (jika perlu). Highlight tambahan:

- **Employer/StoreInterviewRequest** — `mode` enum, `scheduled_at` ≥ now, `duration_minutes` 15-240. Mode=online → `meeting_provider` required, `meeting_url` required jika provider=custom. Mode=onsite → `location_address` required. Mode=ai → `ai_template_id` required.
- **Employer/StoreScorecardRequest** — `criteria_scores` json object cocok rubric template, `overall_score` 1-5, `recommendation` enum.
- **Employee/SubmitAiAnswerRequest** — `session_id` exist & ongoing & milik kandidat, `question_id` cocok, `answer_text` ATAU `audio_file` required.
- **Admin/UpdateSettingsRequest** — per-group, validasi tipe per key, file upload validasi MIME.
- **Webhooks/DuitkuCallbackRequest** — validasi signature di `authorize()`.

---

## 13. Policy / Gate

Per entitas standar (view/create/update/delete) + spesifik:

- **InterviewPolicy:** `view`, `update`, `cancel`, `reschedule`, `submitScorecard`. Employer hanya untuk job di company-nya. Kandidat hanya untuk yang melibatkan dia (boleh `view` + `confirm` + `requestReschedule`).
- **AiInterviewSessionPolicy:** `start`, `submit`, `viewResult`. Kandidat owner-only. Employer hanya untuk session dari job-nya. Admin: read-only audit.
- **ConversationPolicy:** `view`, `send`. Hanya participant.
- **CompanyPolicy:** ditambah `manageTeam`, `requestVerification`.
- **SettingPolicy:** admin only.
- **PricingPlanPolicy:** admin only write.

Gate global: `access-admin/employer/employee` + `feature.{flag}` (baca dari Setting).

---

## 14. Daftar Halaman Frontend

(Detail di §6. Highlight tambahan dari v1:)

- **Public:** Salary Insight tool, Career Resources index/show.
- **Employee:** CV Builder wizard, CV List, Interviews (undangan), AI Interview Runner & Result, Skill Assessments, Career Coach (chat full-page), Company Reviews create.
- **Employer:** Company Verification (upload dokumen), Team (invite recruiter), Job + Screening Q, Applicants (dengan AI match + screening score), Interviews **kanban** per stage, Interview detail + scorecard form, AI Interview Templates + Results, Talent Search, Messages, Billing checkout.
- **Admin:** Settings (8 tabs), Pricing Plans CRUD, Subscriptions list, Payments list, AI Audit Logs, Career Resources CRUD, Salary Insights CRUD, Assessment Questions CRUD, Company Reviews moderasi, Reports moderasi.

---

## 15. Komponen Reusable (highlight)

(Detail di §6. Komponen baru penting:)

- **Interview Pipeline (kanban)** — drag antar stage (HR → User → Technical → Final).
- **AI Interview Runner** — UI immersive: timer, question card, mic recorder + waveform, live transcript stream (SSE/poll), progress bar, end session.
- **AI Interview Result** — chart radar (technical/communication/culture/problem), skor, transcript per pertanyaan, feedback AI, tombol Hire/Reject.
- **Match Score Badge** — donut + warna (≥80 hijau, 60-79 kuning, <60 merah).
- **Pricing Card** + Plan Comparison Table.
- **Settings Tabs** — wrapper konsisten untuk admin.

---

## 16. Alur Fitur Utama

### A. Apply Job + AI Match
1. Employee klik **Lamar** → cek profile_completion ≥ 60% (atau warning).
2. Modal/page: pilih CV aktif, isi cover letter, jawab screening questions.
3. `ApplicationService::submit()` (transaksi):
   - cek duplicate, snapshot CV path,
   - hitung **AI match score** sync (atau queue jika berat),
   - simpan screening answers + score,
   - jika `auto_invite_ai_interview=true` & match ≥ threshold → buat `AiInterviewSession` status `invited` + kirim email,
   - dispatch `ApplicationSubmitted` ke recruiter.
4. Toast → redirect ke `/employee/applications/{id}`.

### B. Schedule Interview (3 mode) — Employer
1. Dari `/employer/applicants/{id}` → button **Jadwalkan Interview**.
2. Form pilih: stage, mode (`ai/online/onsite`), tanggal+waktu, durasi, interviewer (multi).
3. Mode-specific:
   - **AI**: pilih template → set deadline → save.
   - **Online**: pilih provider; jika **Google Meet** & employer sudah connect Google Calendar → auto-create event + Meet link via `GoogleMeetService`. Jika belum connect → guide OAuth.
   - **Onsite**: input alamat + (opsional) pin map.
4. `InterviewSchedulingService` cek conflict slot interviewer.
5. `ScheduleInterviewAction`:
   - DB transaction: buat `Interview`, `InterviewParticipant` × N,
   - kirim notif `InterviewScheduled` ke kandidat & interviewer (email + .ics + Meet link),
   - schedule reminder job (1 hari + 1 jam sebelum) — pakai `delay()`.
6. Toast → redirect ke detail.

### C. Run AI Interview (Employee)
1. Email/dashboard → klik link sesi (token di URL atau auth).
2. Halaman `/employee/ai-interviews/run/{session}`:
   - cek consent (rekam audio jika voice), cek mic permission,
   - tampilkan instruksi & jumlah soal.
3. Klik **Mulai** → status `in_progress`, `started_at=now()`.
4. Loop tiap pertanyaan:
   - Card pertanyaan + timer.
   - Mode text: textarea + submit.
   - Mode voice: recorder → upload chunk → STT (Whisper) → transcript ditampilkan live → submit.
   - `SubmitAnswerAction` → simpan response → `AiAnswerEvaluatorService` (queue) skor.
5. Selesai semua → `FinalizeAiInterviewAction`:
   - status `completed`, hitung total durasi,
   - `AiInterviewAnalysisService` (queue) generate analisis final,
   - notif ke recruiter `AiInterviewCompleted`.
6. Halaman result → tampilkan skor (skeleton sambil analisis berjalan, polling tiap 5s sampai `analyses` muncul).

### D. Submit Scorecard (Employer)
1. Setelah interview `completed`, interviewer buka detail.
2. Form scorecard (rubric dinamis dari template per stage) → submit.
3. Trigger update aggregate di `application` (rata-rata skor stage).

### E. Subscription & Featured Job (Duitku)
1. Employer pilih plan di `/employer/billing/checkout`.
2. POST → `PaymentService::createForSubscription()` → `DuitkuService::createTransaction()` (signature MD5/SHA256 sesuai Duitku).
3. Redirect ke URL Duitku.
4. User bayar → Duitku callback (webhook) → `DuitkuWebhookController`:
   - verify signature → update `payments.status=paid` → `SubscriptionService::activate()` → notif `PaymentSucceeded`.
5. User di-redirect kembali ke return URL → frontend polling status atau langsung tampilkan sukses.

### F. Settings Update (Admin)
1. `/admin/settings/branding` upload logo baru.
2. `UpdateSettingsRequest` validasi → `SettingService::set()` per key → invalidate cache.
3. Logo baru langsung muncul di seluruh app via shared props (auto re-render Inertia).

---

## 17. Standar UI/UX

Sama dengan v1 + tambahan:

- **Layout per role** dengan sidebar terpisah & label role di header.
- **Branding dinamis** — logo, favicon, primary color, OG image dibaca dari Setting via shared props. Tag `<title>` & meta SEO juga dari Setting (server-side via Inertia head).
- **Mobile responsive** wajib termasuk AI interview runner (recorder mobile-friendly).
- **State**: loading skeleton, empty state, error state, success toast — wajib di setiap page.
- **Konfirmasi destruktif** wajib ConfirmDialog.
- **Page header** standar.
- **AI feature** tampilkan badge "AI-Powered" + disclaimer hasil tidak menggantikan keputusan manusia.

---

## 18. Standar Data Table

Sama v1: TanStack + shadcn, server-side paging/sort/filter via Inertia visit, default 15 per page, pilihan 10/15/25/50, faceted filter, bulk action dengan ConfirmDialog, empty state, skeleton loading.

---

## 19. Standar Form

Sama v1 + tambahan:

- **AI interview form** punya UI khusus (immersive, full-screen, distraction-free).
- **Settings form** pakai `Tabs`, save per-group untuk audit kejelasan.
- **Form payment**: ringkas, jelas total + breakdown pajak/fee, tombol "Bayar via Duitku" + ikon.

---

## 20. Standar Notifikasi (Sonner)

Sama v1. Tambahan event:
- Interview created/rescheduled/cancelled
- AI interview submitted/completed
- Payment success/failed
- Subscription expiring (7 hari sebelum)
- Match score generated
- Settings saved

Default 4 detik success, 6 detik error.

---

## 21. Standar Rich Editor (TipTap + HTMLPurifier)

Sama v1. Field tambahan: `companies.culture/benefits`, `career_resources.body`, `legal.terms_body/privacy_body/cookie_body`, `interviews.candidate_instructions`.

---

## 22. Strategi Eager Loading

Standar v1 + pola baru:

| Use case | `with` |
|---|---|
| Detail interview | `['application.job:id,title', 'application.employeeProfile.user', 'participants.user', 'scorecards.reviewer:id,name', 'aiSession.analysis']` |
| List interview employer (kanban) | `['application:id,job_id', 'application.job:id,title', 'application.employeeProfile.user:id,name']` |
| Detail AI session | `['questions', 'responses', 'analysis', 'application.job', 'candidate.user']` |
| Talent search | `['user:id,name,email,avatar_path', 'city.province', 'skills:id,name', 'primaryResume']` + `withExists(['shortlistedByCompany as is_shortlisted'])` |
| Employer dashboard | `['activeJobs', 'recentApplications.employeeProfile.user', 'upcomingInterviews']` (dengan limit) |

`Model::preventLazyLoading()` di non-prod tetap berlaku.

---

## 23. Strategi Permission / Role + Feature Flag

- **Role tunggal** per user di kolom `users.role` (enum). Middleware `role:admin|employer|employee`.
- **Feature flag** di `settings.feature_flags.*` — gate `feature.ai_coach`, dst.
- **Subscription gate** — middleware `EnsureSubscriptionActive` untuk fitur premium employer (talent_search, featured job, AI interview > N/bulan).
- **Multi-company per user** via `company_members`. Header sediakan switcher.
- **Frontend** baca `auth.user.role` & `features.*` dari shared props.

---

## 24. Catatan Keamanan

(Standar v1) + tambahan:

1. **Settings password fields** (api keys, smtp password, duitku api key) **encrypted at rest** via Laravel `Crypt`. Tidak pernah di-share ke FE.
2. **Duitku webhook**: verify signature MD5(merchantCode + amount + merchantOrderId + apiKey). Wrap di `authorize()` Form Request. Tolak request tanpa signature valid.
3. **Idempotency** payment: pakai `merchant_order_id` unique. Webhook dipanggil ulang harus aman.
4. **AI prompt injection**: sanitize input user sebelum dikirim ke AI. Jangan render output AI sebagai HTML mentah — selalu Markdown→sanitize.
5. **AI cost guard**: rate limit per user (mis. 10 AI interview/bulan free, lebih = subscription). Audit di `ai_audit_logs`.
6. **OAuth Google**: state token + PKCE, scope minimal (calendar.events). Refresh token disimpan terenkripsi.
7. **AI interview recording**: tampilkan consent eksplisit sebelum mulai. File audio di disk private + signed URL.
8. **CV file**: simpan di disk private, akses lewat controller cek policy.
9. **Talent search**: hanya kandidat dengan `visibility != private`. Audit tiap akses ke `audit_logs`.
10. **Webhook IP allowlist** Duitku (jika tersedia).
11. **Rate limit** endpoint AI: `throttle:60,1` per user.
12. **Anonymized review** — kandidat current/former employee, simpan tetap pakai `employee_profile_id` tapi tampilkan "Anonymous" jika `is_anonymous=true`.
13. **Settings changes** dicatat di `audit_logs` (sangat sensitif).

---

## 25. Catatan Performa

(Standar v1) + tambahan:

1. **AI calls async**: semua call AI lewat queue (`ShouldQueue`). User dapat status pending → polling/SSE.
2. **Match score caching**: `ai_match_scores` cache hasil per (job, candidate). Recompute hanya saat profile/job berubah signifikan (observer).
3. **Settings cache**: `Cache::rememberForever('settings.all', ...)` invalidate on update.
4. **Counter cache**: applications_count, views_count, reviews_count.
5. **Interview kanban**: paginate per kolom (limit 50/kolom), drag = patch endpoint.
6. **Talent search**: pertimbangkan Scout + Meilisearch jika kandidat > 50k.
7. **Live transcript AI interview**: gunakan polling 2-3s atau Echo broadcasting (post-MVP). MVP: poll.
8. **PDF generation** (CV) di queue, simpan path, kirim notif ketika ready.
9. **Image upload**: resize + WebP convert via Intervention.

---

## 26. Urutan Pengerjaan & Pembagian Tugas Claude vs Codex

> Strategi: **paralelisasi** sprint independen di awal (Claude + Codex jalan barengan), **sekuensial** di sprint yang punya dependency. Setiap sprint berhenti di state hijau (test lulus, lint lulus) sebelum lanjut.
>
> Konvensi sinkronisasi:
> - Branch: `sprint-{N}-{nama}` per agent.
> - Codex bekerja di file/folder yang sudah ditentukan, **tidak menyentuh** file di scope Claude.
> - Setelah keduanya selesai, Claude review hasil Codex (atau sebaliknya) sebelum merge.
> - Migration timestamp koordinasi: Codex pakai `2026_05_01_*`, Claude pakai `2026_05_02_*` (atau pakai prefix `01_*`/`02_*` agar urutan jelas).

### Sprint 0 — Fondasi (Claude solo, ±1 hari)
**Claude:**
1. Tambah composer & npm packages (purifier, dompdf, intervention, google api, openai, tanstack-table, tiptap, date-fns, dompurify, recharts).
2. Add komponen shadcn yang kurang (table, form, popover, calendar, command, tabs, textarea, empty, pagination, switch, radio-group, accordion, scroll-area, progress, chart, hover-card, slider).
3. `Enums/*` semua enum core.
4. Middleware `EnsureUserHasRole`, `EnsureCompanyApproved`, `EnsureSubscriptionActive`.
5. `Model::preventLazyLoading()` di dev.
6. Layout per role (kosongan): `AdminLayout`, `EmployerLayout`, `EmployeeLayout`, `PublicLayout`.
7. Skeleton folder `components/data-table`, `components/form`, `components/feedback`, `components/layout`, `components/shared`.
8. **`SettingService` + tabel `settings` + admin Settings page (8 tabs)** — base untuk seluruh app.
9. Extend `HandleInertiaRequests` share `auth.user.role`, `features.*`, `branding.*`, `seo.*`.
10. `HtmlSanitizerService`, `FileUploadService`.
11. RichTextEditor, MoneyInput, DatePickerField, FileUploadField, ImageUploadField, ConfirmDialog, EmptyState, LoadingSkeleton.
12. Test smoke layout + setting CRUD.

> **Output diserahkan ke Codex** sebagai foundation.

---

### Sprint 1 — Lookup & Master Data (Codex solo, ±0.5 hari)
**Codex:**
1. Migration + factory + seeder: `provinces`, `cities` (dataset Indonesia minimal — 38 provinsi + ibukota tiap provinsi).
2. Migration + seeder: `industries`, `company_sizes`, `job_categories`, `skills` (master umum + IT).
3. Model + relasi.
4. Admin CRUD pages (dialog form): `JobCategoryController`, `SkillController`, `IndustryController`, `CompanySizeController`.
5. Test feature CRUD admin.

---

### Sprint 2 — Employee Profile & CV (PARALEL: Claude + Codex)

**Codex:** (backend skeleton + simple pages)
- Migration: `employee_profiles`, `educations`, `work_experiences`, `certifications`, `candidate_cvs`, `employee_skill`.
- Model + relasi + factory.
- `Employee/ProfileController`, `EducationController`, `WorkExperienceController`, `CertificationController`, `CvUploadController`.
- Form Request + Resource.
- Pages: `/employee/profile/edit`, `/employee/profile/educations`, `/employee/profile/work-experiences`, `/employee/profile/certifications`, `/employee/cv/index`.
- Test CRUD.

**Claude:** (CV Builder kompleks + AI integration prep)
- `CvBuilderService` (form JSON → PDF dompdf template).
- Page `/employee/cv/builder` (multi-step wizard).
- `EmployeeProfileService::calculateCompletion()`.
- `CvAnalyzerService` skeleton (parse PDF; AI scoring di Sprint 7).

**Sync point:** merge keduanya.

---

### Sprint 3 — Company & Verification (PARALEL)

**Codex:**
- Migration: `companies`, `company_members`, `company_offices`, `company_badges`.
- Model + factory + seeder.
- `Employer/CompanyProfileController`, `Employer/TeamController`, `Admin/CompanyController`.
- Pages: `/employer/company/edit`, `/employer/team`, `/admin/companies/*`.
- Approve/suspend flow (notifications).

**Claude:**
- Migration `company_verifications`.
- `CompanyVerificationService` (upload dokumen, approve/reject).
- Pages `/employer/company/verification`, `/admin/company-verifications/*`.
- `Notifications/CompanyVerified`.

**Sync point.**

---

### Sprint 4 — Job & Public Browse (PARALEL)

**Codex:**
- Migration: `jobs`, `job_skill`, `saved_jobs`, `job_views`, `job_screening_questions`.
- Model + observer (slug, counter).
- `Employer/JobController`, `Employer/JobScreeningQuestionController`, `Employee/SavedJobController`, `Admin/JobController`.
- Pages employer jobs (index/create/edit/show), saved jobs.

**Claude:**
- `Public/JobBrowseController` + `JobBrowseFilter` pipeline.
- Page `/jobs` (browse + filter advanced) + `/jobs/{slug}` (detail).
- `JobMatchingService` (rule-based dulu — skill overlap, exp, location, salary; AI ditambah Sprint 7).
- Public/CompanyBrowse.

**Sync point.**

---

### Sprint 5 — Application + Status + Match Score (Claude lead, Codex assist)

**Claude:**
- Migration `applications`, `application_status_logs`, `application_screening_answers`.
- `ApplicationService` (submit + match score sync).
- Action `SubmitApplicationAction`, `ChangeApplicationStatusAction`.
- Pages `/employer/applicants/*` dengan match badge.
- Notifications.

**Codex:** (paralel)
- Pages `/employee/applications/*` (index, show + timeline).
- Test feature.

**Sync point.**

---

### Sprint 6 — Interview 3 Mode ★ (Claude lead, Codex assist)

**Claude:** (kompleks, integrasi Google Meet + scheduling)
- Migration: `interviews`, `interview_participants`, `interview_reschedule_requests`, `interview_scorecards`, `google_calendar_tokens`.
- `InterviewService`, `InterviewSchedulingService`, `GoogleMeetService`, `InterviewIcsExporter`.
- `Employer/GoogleCalendarController` (OAuth flow).
- `ScheduleInterviewAction`, `RescheduleInterviewAction`.
- Pages `/employer/interviews/*` (kanban + form 3 mode).
- Notifications + reminder jobs (queued, scheduled).

**Codex:** (paralel)
- Pages `/employee/interviews/*` (index + show + confirm/reschedule request).
- `Employee/InterviewController`.
- `InterviewScorecard` form + page.
- Test feature happy path.

**Sync point. ★ Milestone besar.**

---

### Sprint 7 — AI Interview ★ + AI Career Coach + AI Match (Claude solo, ±3-4 hari)

**Claude (kompleks, sequential):**
- Migration: `ai_interview_templates`, `ai_interview_sessions`, `ai_interview_questions`, `ai_interview_responses`, `ai_interview_analyses`, `ai_interview_reschedule_histories`, `ai_match_scores`, `ai_audit_logs`, `ai_coach_sessions`, `ai_coach_messages`, `ai_career_recommendations`.
- `AiClientFactory` + `OpenAiClient` (baca dari Setting).
- `AiQuestionGeneratorService`, `AiAnswerEvaluatorService`, `AiInterviewAnalysisService`.
- `SpeechToTextService` (Whisper).
- `AiCareerCoachService` + chat streaming via poll.
- `AiAuditService`.
- `Employee/AiInterviewController`, `Employee/CareerCoachController`.
- `Employer/AiInterviewTemplateController`, `Employer/AiInterviewReviewController`.
- Pages `/employee/ai-interviews/run` (immersive runner), `/employee/ai-interviews/result`, `/employee/career-coach`, `/employer/ai-interviews/*`.
- `JobMatchingService` upgrade pakai AI embedding (opsional MVP, fallback rule-based).

**Codex paralel di Sprint 8 sebagai talent search & assessment.**

---

### Sprint 8 — Skill Assessment + Talent Search + Messaging (PARALEL)

**Codex:**
- Migration: `assessment_questions`, `skill_assessments`, `skill_assessment_answers`.
- `Admin/AssessmentQuestionController` (CRUD bank soal).
- `Employee/SkillAssessmentController` (take assessment).
- Pages.

**Claude:**
- Migration: `employer_talent_candidates`, `candidate_job_views`, `conversations`, `conversation_participants`, `messages`, `message_templates`.
- `TalentSearchService`, `ConversationService`, `MessageService`.
- `Employer/TalentSearchController`, `Employer/MessageController`, `Employee/MessageController`.
- Pages `/employer/talent-search`, `/employer/messages`, `/employee/messages`.

**Sync point.**

---

### Sprint 9 — Pricing & Payment (Duitku) ★ (Claude solo, ±2 hari)

**Claude:**
- Migration: `pricing_plans`, `subscriptions`, `payments`.
- `DuitkuService` (createTransaction + signature).
- `Webhooks/DuitkuWebhookController`.
- `PaymentService`, `SubscriptionService`.
- `Admin/PricingPlanController`, `Admin/SubscriptionController`, `Admin/PaymentController`.
- `Employer/BillingController` + checkout flow.
- Middleware `EnsureSubscriptionActive` aktifkan untuk fitur premium.
- Setting Duitku merchant code/api key/env (sudah disiapkan Sprint 0).
- Pages billing.
- Test integrasi (sandbox Duitku).

---

### Sprint 10 — Content & Public (PARALEL)

**Codex:**
- Migration: `announcements`, `career_resources`, `salary_insights`, `faqs`, `legal_pages`, `company_reviews`, `reports`, `contact_messages`.
- Admin CRUD pages untuk semua.
- Public pages: career resources index/show, salary insight tool, FAQ, contact, legal pages.

**Claude:**
- `Employee/CompanyReviewController` + moderation flow.
- `Admin/CompanyReviewModerationController`, `Admin/ReportController`.
- Update home/landing dengan content terbaru.

**Sync point.**

---

### Sprint 11 — Polish & QA (Claude + Codex, ±2 hari)

**Bersama:**
1. Audit empty/loading/error state semua page.
2. Audit responsive mobile + dark mode.
3. Audit aksesibilitas (ARIA, fokus, kontras).
4. Audit query performance (`EXPLAIN`, tambah index).
5. Audit policy coverage (jangan ada endpoint tanpa policy).
6. Audit XSS (semua rich text di-render lewat `SafeHtml`).
7. Pest browser smoke test golden path tiap role.
8. Lighthouse pass (performance ≥85, a11y ≥95).

---

### Post-MVP (opsional, urutan bebas)
- AI video interview (face/voice analysis)
- Embedding + Meilisearch untuk semantic search
- Push notification (FCM/Web Push) — `user_device_tokens` sudah disiapkan
- Email digest harian/mingguan
- Multi-bahasa (i18n) penuh
- Open API + Sanctum
- Mentor program (jika nanti dibutuhkan)

---

## 27. Pembagian Tugas Singkat (kanvas singkat)

| Sprint | Owner utama | Sifat | Hari (estimasi) |
|---|---|---|---|
| 0 Fondasi | Claude | sequential, blocking | 1 |
| 1 Lookup | Codex | independent | 0.5 |
| 2 Profile/CV | Codex + Claude paralel | paralel, sync end | 2 |
| 3 Company | Codex + Claude paralel | paralel | 1.5 |
| 4 Job | Codex + Claude paralel | paralel | 2 |
| 5 Application | Claude lead | sequential | 1.5 |
| 6 Interview ★ | Claude lead, Codex assist | sequential | 3 |
| 7 AI ★ | Claude solo | sequential | 4 |
| 8 Assessment + Talent + Msg | Codex + Claude paralel | paralel | 2 |
| 9 Pricing/Duitku ★ | Claude solo | sequential | 2 |
| 10 Content & Public | Codex + Claude paralel | paralel | 1.5 |
| 11 Polish | Bersama | bersama | 2 |
| **Total** | | | **±23 hari kerja** |

**Aturan kerja paralel:**
- Codex **fokus boilerplate**: migration, model, factory, seeder, controller CRUD standar, page index/edit/create dengan komponen yang sudah Claude siapkan, test feature happy path.
- Claude **fokus kompleks**: arsitektur, integrasi eksternal (Google Meet, Duitku, AI providers), service domain logic non-trivial, UI immersive (AI interview runner), state machine (interview status, application status).
- File **shared** (router, AppServiceProvider, HandleInertiaRequests, layouts) hanya boleh diedit Claude — Codex usulkan diff via PR/note jika perlu.

---

## 28. Definition of Done (per fitur)

Sama v1: migration + factory + seeder; model + relasi + policy; form request lengkap; service/action terisolasi; controller tipis; resource transformer; eager loading tanpa N+1; halaman dengan loading/empty/error/success; form lengkap; konfirmasi destruktif; mobile + dark mode; test feature minimal happy + 1 negative; Pint + ESLint + types lulus; `php artisan test --compact` hijau.

**Tambahan untuk fitur AI/Payment:**
- Audit log tercatat (`ai_audit_logs` / `audit_logs`).
- Rate limit aktif.
- Token/biaya tercatat (AI).
- Webhook idempotent (Payment).
- Signature verified (Payment).

---

## 29. Catatan Akhir

- Semua **string user-facing Bahasa Indonesia**. Code/komentar/identifier Inggris.
- **Wayfinder** wajib — tidak ada hardcode URL di TSX.
- **Settings dinamis** = single source of truth untuk branding/SEO/AI/Payment/Feature flag. Edit dari menu admin, tidak perlu redeploy.
- Blueprint = **living document**. Perubahan signifikan harus update file ini.
- Sebelum mulai Sprint 1, **Sprint 0 wajib selesai & merge** karena semua sprint lain bergantung pada layout/setting/komponen di sana.

---

**Akhir blueprint v2.** Mohon review section §26-27 (pembagian tugas Claude vs Codex) — bila urutan/ownership perlu diubah, beri tahu sebelum implementasi dimulai.
