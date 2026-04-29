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

        Skill::query()->upsert(
            collect($this->skills())->map(
                fn (array $skill): array => [
                    'name' => $skill['name'],
                    'slug' => Str::slug($skill['name']),
                    'category' => $skill['category'],
                    'description' => $skill['description'],
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            )->all(),
            uniqueBy: ['slug'],
            update: ['name', 'category', 'description', 'is_active', 'updated_at'],
        );
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
    private function skills(): array
    {
        return [
            ['name' => 'PHP', 'category' => 'Backend', 'description' => 'Pengembangan aplikasi web berbasis PHP.'],
            ['name' => 'Laravel', 'category' => 'Backend', 'description' => 'Framework Laravel untuk aplikasi web modern.'],
            ['name' => 'MySQL', 'category' => 'Database', 'description' => 'Perancangan dan optimasi basis data MySQL.'],
            ['name' => 'PostgreSQL', 'category' => 'Database', 'description' => 'Pengelolaan basis data PostgreSQL.'],
            ['name' => 'JavaScript', 'category' => 'Frontend', 'description' => 'Bahasa utama untuk interaksi web.'],
            ['name' => 'TypeScript', 'category' => 'Frontend', 'description' => 'JavaScript bertipe untuk aplikasi skala besar.'],
            ['name' => 'React', 'category' => 'Frontend', 'description' => 'Pembangunan antarmuka dengan React.'],
            ['name' => 'Next.js', 'category' => 'Frontend', 'description' => 'Framework React untuk aplikasi modern.'],
            ['name' => 'Tailwind CSS', 'category' => 'Frontend', 'description' => 'Utility-first CSS untuk UI cepat dan konsisten.'],
            ['name' => 'Node.js', 'category' => 'Backend', 'description' => 'Runtime JavaScript untuk layanan backend.'],
            ['name' => 'Python', 'category' => 'Programming', 'description' => 'Bahasa umum untuk backend, data, dan automasi.'],
            ['name' => 'Docker', 'category' => 'DevOps', 'description' => 'Containerization untuk pengembangan dan deployment.'],
            ['name' => 'Kubernetes', 'category' => 'DevOps', 'description' => 'Orkestrasi container skala produksi.'],
            ['name' => 'AWS', 'category' => 'Cloud', 'description' => 'Layanan cloud untuk komputasi, storage, dan jaringan.'],
            ['name' => 'Google Cloud', 'category' => 'Cloud', 'description' => 'Ekosistem cloud Google untuk aplikasi modern.'],
            ['name' => 'Figma', 'category' => 'Design', 'description' => 'Perancangan UI, prototyping, dan kolaborasi desain.'],
            ['name' => 'UI/UX Research', 'category' => 'Design', 'description' => 'Riset pengguna dan validasi desain produk.'],
            ['name' => 'SEO', 'category' => 'Marketing', 'description' => 'Optimasi konten dan teknis untuk mesin pencari.'],
            ['name' => 'Content Marketing', 'category' => 'Marketing', 'description' => 'Strategi konten untuk awareness dan conversion.'],
            ['name' => 'Project Management', 'category' => 'General', 'description' => 'Perencanaan, koordinasi, dan delivery proyek.'],
        ];
    }
}
