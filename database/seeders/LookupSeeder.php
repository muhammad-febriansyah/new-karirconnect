<?php

namespace Database\Seeders;

use App\Models\CompanySize;
use App\Models\Industry;
use App\Models\JobCategory;
use App\Models\Skill;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LookupSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedIndustries();
        $this->seedCompanySizes();
        $this->seedJobCategories();
        $this->seedSkills();
    }

    private function seedIndustries(): void
    {
        $now = now();

        Industry::query()->upsert(
            collect($this->industries())->values()->map(
                fn (array $industry, int $index): array => [
                    'name' => $industry['name'],
                    'slug' => Str::slug($industry['name']),
                    'description' => $industry['description'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            )->all(),
            uniqueBy: ['slug'],
            update: ['name', 'description', 'is_active', 'sort_order', 'updated_at'],
        );
    }

    private function seedCompanySizes(): void
    {
        $now = now();

        CompanySize::query()->upsert(
            collect($this->companySizes())->values()->map(
                fn (array $size, int $index): array => [
                    'name' => $size['name'],
                    'slug' => Str::slug($size['name']),
                    'employee_range' => $size['employee_range'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            )->all(),
            uniqueBy: ['slug'],
            update: ['name', 'employee_range', 'is_active', 'sort_order', 'updated_at'],
        );
    }

    private function seedJobCategories(): void
    {
        $now = now();

        JobCategory::query()->upsert(
            collect($this->jobCategories())->values()->map(
                fn (array $category, int $index): array => [
                    'name' => $category['name'],
                    'slug' => Str::slug($category['name']),
                    'description' => $category['description'],
                    'is_active' => true,
                    'sort_order' => $index + 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            )->all(),
            uniqueBy: ['slug'],
            update: ['name', 'description', 'is_active', 'sort_order', 'updated_at'],
        );
    }

    private function seedSkills(): void
    {
        $now = now();
        $skills = collect($this->skills());

        Skill::query()->upsert(
            $skills->map(
                fn (array $skill): array => [
                    'name' => $skill['name'],
                    'slug' => Str::slug($skill['name']),
                    'type' => $skill['type'],
                    'category' => $skill['category'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            )->all(),
            uniqueBy: ['slug'],
            update: ['name', 'type', 'category', 'is_active', 'updated_at'],
        );

        // Replace-total: prune skills no longer in the taxonomy. FK on
        // job_skill / employee_skill / assessment_questions / skill_assessments
        // is cascadeOnDelete, so their links go with the removed skills.
        $keepSlugs = $skills->map(fn (array $skill): string => Str::slug($skill['name']))->all();

        Skill::query()->whereNotIn('slug', $keepSlugs)->delete();
    }

    /**
     * @return array<int, array{name: string, description: string}>
     */
    private function industries(): array
    {
        return [
            ['name' => 'Teknologi Informasi', 'description' => 'Perusahaan software, platform digital, dan infrastruktur teknologi.'],
            ['name' => 'Keuangan', 'description' => 'Perbankan, fintech, asuransi, dan layanan keuangan lainnya.'],
            ['name' => 'Kesehatan', 'description' => 'Rumah sakit, klinik, healthtech, dan farmasi.'],
            ['name' => 'Pendidikan', 'description' => 'Sekolah, universitas, dan platform edutech.'],
            ['name' => 'Manufaktur', 'description' => 'Produksi barang, otomotif, dan pabrik.'],
            ['name' => 'Ritel', 'description' => 'Perdagangan, e-commerce, dan distribusi.'],
            ['name' => 'Logistik', 'description' => 'Pengiriman, warehousing, dan supply chain.'],
            ['name' => 'Konstruksi', 'description' => 'Kontraktor, properti, dan pengembangan infrastruktur.'],
            ['name' => 'Media dan Kreatif', 'description' => 'Agensi, media, produksi konten, dan entertainment.'],
            ['name' => 'Konsultan', 'description' => 'Konsultasi bisnis, teknologi, dan manajemen.'],
        ];
    }

    /**
     * @return array<int, array{name: string, employee_range: string}>
     */
    private function companySizes(): array
    {
        return [
            ['name' => '1-10 Karyawan', 'employee_range' => '1-10'],
            ['name' => '11-50 Karyawan', 'employee_range' => '11-50'],
            ['name' => '51-200 Karyawan', 'employee_range' => '51-200'],
            ['name' => '201-500 Karyawan', 'employee_range' => '201-500'],
            ['name' => '500+ Karyawan', 'employee_range' => '500+'],
        ];
    }

    /**
     * @return array<int, array{name: string, description: string}>
     */
    private function jobCategories(): array
    {
        return [
            ['name' => 'Software Engineering', 'description' => 'Backend, frontend, full-stack, mobile, dan platform engineering.'],
            ['name' => 'Data dan AI', 'description' => 'Data analyst, data engineer, machine learning, dan AI.'],
            ['name' => 'Product Management', 'description' => 'Product manager, product owner, dan product operations.'],
            ['name' => 'Design', 'description' => 'UI/UX, product design, graphic design, dan riset pengguna.'],
            ['name' => 'Marketing', 'description' => 'Digital marketing, performance, brand, dan content marketing.'],
            ['name' => 'Sales dan Business Development', 'description' => 'Sales executive, account management, dan kemitraan.'],
            ['name' => 'Human Resources', 'description' => 'Talent acquisition, people ops, dan learning development.'],
            ['name' => 'Finance dan Accounting', 'description' => 'Akuntansi, pajak, finance planning, dan audit.'],
        ];
    }

    /**
     * @return array<int, array{name: string, category: string, description: string}>
     */
    /**
     * Recruiter skill taxonomy used by the job-posting picker. Grouped by
     * type (soft/hard) → category → individual skills. Edit here to change the
     * master list; the seeder upserts these and prunes anything not listed.
     *
     * @return array<int, array{name: string, type: string, category: string}>
     */
    private function skills(): array
    {
        $taxonomy = [
            'soft' => [
                'Komunikasi & Kolaborasi' => [
                    'Komunikasi Lisan', 'Komunikasi Tulisan', 'Presentasi', 'Negosiasi',
                    'Kerja Sama Tim (Teamwork)', 'Public Speaking', 'Active Listening',
                ],
                'Kepemimpinan & Manajemen' => [
                    'Leadership', 'Manajemen Tim', 'Pengambilan Keputusan', 'Delegasi',
                    'Mentoring/Coaching', 'Manajemen Konflik',
                ],
                'Problem Solving & Berpikir' => [
                    'Pemecahan Masalah (Problem Solving)', 'Berpikir Kritis (Critical Thinking)',
                    'Berpikir Analitis', 'Kreativitas & Inovasi', 'Pengambilan Keputusan Berbasis Data',
                ],
                'Manajemen Diri' => [
                    'Manajemen Waktu', 'Adaptabilitas', 'Manajemen Stres', 'Disiplin',
                    'Inisiatif', 'Etos Kerja', 'Manajemen Prioritas',
                ],
                'Manajemen Proyek' => [
                    'Project Management', 'Perencanaan Strategis', 'Multitasking',
                    'Time Management', 'Organisasi',
                ],
                'Interpersonal' => [
                    'Empati', 'Kecerdasan Emosional (Emotional Intelligence)', 'Networking',
                    'Customer Orientation', 'Resolusi Konflik',
                ],
            ],
            'hard' => [
                'Teknologi & Programming' => [
                    'Bahasa Pemrograman', 'Web Development', 'Database', 'Cloud Computing',
                    'DevOps', 'Mobile Development', 'Cybersecurity', 'Machine Learning/AI',
                ],
                'Data & Analitik' => [
                    'Data Analysis', 'Data Visualization', 'Excel Tingkat Lanjut', 'SQL',
                    'Statistik', 'Data Science', 'Big Data',
                ],
                'Desain' => [
                    'UI/UX Design', 'Graphic Design', 'Adobe Creative Suite', 'Figma',
                    'Sketch', 'Motion Graphics', '3D Modeling',
                ],
                'Marketing & Digital' => [
                    'SEO/SEM', 'Google Analytics', 'Social Media Marketing', 'Content Marketing',
                    'Email Marketing', 'Google Ads', 'Marketing Automation Tools',
                ],
                'Keuangan & Akuntansi' => [
                    'Akuntansi', 'Financial Modeling', 'Perpajakan', 'Audit',
                    'Software Akuntansi', 'Budgeting & Forecasting',
                ],
                'Bahasa' => [
                    'Bahasa Inggris', 'Bahasa Mandarin', 'Bahasa Jepang', 'Bahasa Asing Lainnya',
                ],
                'Office & Administrasi' => [
                    'Microsoft Office', 'Google Workspace', 'Manajemen Dokumen', 'Entri Data',
                ],
                'Teknik' => [
                    'AutoCAD', 'SolidWorks', 'Civil 3D', 'Mechanical Design', 'Electrical Systems',
                ],
                'Penjualan' => [
                    'CRM Tools', 'Sales Forecasting', 'Lead Generation', 'Account Management',
                ],
                'Sertifikasi Umum' => [
                    'PMP', 'Six Sigma', 'Google Certified', 'AWS Certified',
                ],
            ],
        ];

        $rows = [];

        foreach ($taxonomy as $type => $categories) {
            foreach ($categories as $category => $names) {
                foreach ($names as $name) {
                    $rows[] = ['name' => $name, 'type' => $type, 'category' => $category];
                }
            }
        }

        return $rows;
    }
}
