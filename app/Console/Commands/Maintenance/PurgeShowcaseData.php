<?php

namespace App\Console\Commands\Maintenance;

use App\Services\Maintenance\ShowcaseDataPurger;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * CLI front end for {@see ShowcaseDataPurger}. Same job as the admin page at
 * `admin/showcase-data`, for when SSH is easier than logging in.
 *
 * Dry-run by default. Pass --apply to delete.
 */
#[Signature('showcase:purge
    {--apply : Perform the deletion. Without this flag the command only reports what it would remove}
    {--skip-password-check : Also purge marker-matched accounts whose password is no longer the seeder default}
    {--force : Skip the interactive confirmation prompt}')]
#[Description('Hapus data dummy FreshShowcaseSeeder dari database yang sudah berisi data asli.')]
class PurgeShowcaseData extends Command
{
    public function __construct(private readonly ShowcaseDataPurger $purger)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $skipPasswordCheck = (bool) $this->option('skip-password-check');
        $preview = $this->purger->preview($skipPasswordCheck);

        if ($preview['employers'] === 0 && $preview['candidates'] === 0) {
            $this->info('Tidak ada data showcase yang cocok. Database bersih.');
            $this->reportSuspects($preview['suspects']);

            return self::SUCCESS;
        }

        $this->newLine();
        $this->table(['Objek', 'Jumlah'], [
            ['Akun employer dummy', $preview['employers']],
            ['Akun kandidat dummy', $preview['candidates']],
            ['Perusahaan dummy', $preview['companies']],
            ['Lowongan dummy (cascade)', $preview['jobs']],
            ['Lamaran pada lowongan dummy', $preview['applications']],
            ['- dari kandidat ASLI (ikut terhapus)', $preview['applications_from_real_candidates']],
        ]);

        $this->reportSuspects($preview['suspects']);

        if ($preview['applications_from_real_candidates'] > 0) {
            $this->newLine();
            $this->error("PERINGATAN: {$preview['applications_from_real_candidates']} lamaran milik kandidat asli akan ikut terhapus.");
            $this->line('Lamaran itu menempel pada lowongan dummy (applications.job_id cascade on delete).');
            $this->line('Ekspor dulu kalau riwayatnya masih dibutuhkan.');
        }

        if (! $this->option('apply')) {
            $this->newLine();
            $this->comment('Mode dry-run. Tidak ada yang dihapus. Jalankan ulang dengan --apply untuk menghapus.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm('Hapus permanen semua baris di atas?', false)) {
            $this->info('Dibatalkan.');

            return self::SUCCESS;
        }

        $deleted = $this->purger->purge($skipPasswordCheck);

        $this->newLine();
        $this->info("Terhapus: {$deleted['companies']} perusahaan, {$deleted['employers']} employer, {$deleted['candidates']} kandidat. Data asli tidak tersentuh.");

        return self::SUCCESS;
    }

    /**
     * @param  list<array{id: int, email: string, role: string, created_at: string|null}>  $suspects
     */
    private function reportSuspects(array $suspects): void
    {
        if ($suspects === []) {
            return;
        }

        $this->newLine();
        $this->warn('Dilewati - email cocok pola dummy tapi password sudah diganti (kemungkinan akun asli):');

        foreach ($suspects as $suspect) {
            $this->line("  #{$suspect['id']}  {$suspect['email']}  (dibuat {$suspect['created_at']})");
        }

        $this->line('Periksa manual. Pakai --skip-password-check kalau memang mau ikut dihapus.');
    }
}
