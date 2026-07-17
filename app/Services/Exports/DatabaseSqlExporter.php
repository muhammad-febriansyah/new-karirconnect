<?php

namespace App\Services\Exports;

use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Process\Process;

/**
 * Streams a mysqldump of the application database as a downloadable .sql file.
 *
 * Credentials never reach the command line. mysqldump exposes its argv to every
 * user on the box via `ps`, so --password=secret would leak the database
 * password to any local process. They go into a 0600 defaults-file instead,
 * which mysqldump reads and nothing else can.
 *
 * Nothing here accepts caller input. The connection name is the only knob and
 * it is resolved against config, so no request value ever reaches the process.
 */
class DatabaseSqlExporter
{
    /**
     * Roughly two hours. A dump that outruns this is a dump that should be run
     * from the shell, not held open through a web request.
     */
    private const TIMEOUT_SECONDS = 7200;

    /**
     * Fail before any bytes are sent, so the browser gets a real error page
     * rather than a truncated .sql file that looks like a valid backup.
     *
     * @throws RuntimeException when mysqldump is missing or unusable
     */
    public function assertAvailable(): void
    {
        $binary = $this->binary();

        $probe = new Process([$binary, '--version']);
        $probe->setTimeout(15);
        $probe->run();

        if (! $probe->isSuccessful()) {
            throw new RuntimeException(
                "mysqldump tidak dapat dijalankan ({$binary}). ".
                'Pastikan mysql-client terpasang di server, atau set DB_DUMP_BINARY ke path lengkapnya.'
            );
        }
    }

    /**
     * @throws RuntimeException when mysqldump is missing or unusable
     */
    public function stream(): StreamedResponse
    {
        $this->assertAvailable();

        $config = $this->connectionConfig();
        $filename = sprintf('%s-%s.sql', $config['database'], now()->format('Ymd-His'));

        $headers = [
            'Content-Type' => 'application/sql',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'X-Accel-Buffering' => 'no',
        ];

        return response()->streamDownload(function () use ($config): void {
            $defaultsFile = $this->writeDefaultsFile($config);

            try {
                $process = new Process($this->command($defaultsFile, $config));
                $process->setTimeout(self::TIMEOUT_SECONDS);

                $out = fopen('php://output', 'w');

                $process->run(function (string $type, string $buffer) use ($out): void {
                    if ($type === Process::OUT) {
                        fwrite($out, $buffer);
                        flush();
                    }
                });

                // Headers are already on the wire, so this cannot become a 500.
                // Append the failure to the file itself: a backup that ends in a
                // visible error beats one that ends early and looks complete.
                if (! $process->isSuccessful()) {
                    fwrite($out, PHP_EOL.'-- DUMP GAGAL: '.trim($process->getErrorOutput()).PHP_EOL);
                }
            } finally {
                @unlink($defaultsFile);
            }
        }, $filename, $headers);
    }

    /**
     * @param  array<string, mixed>  $config
     * @return list<string>
     */
    private function command(string $defaultsFile, array $config): array
    {
        return [
            $this->binary(),
            // Must stay first: mysqldump ignores it anywhere else.
            '--defaults-extra-file='.$defaultsFile,
            // Dumps inside one transaction, so the file is a consistent snapshot
            // of a single moment without locking writers out of the live site.
            '--single-transaction',
            // Streams row by row instead of buffering whole tables in memory.
            '--quick',
            // Skips tablespace metadata, which needs the PROCESS privilege that
            // most managed database users are not granted.
            '--no-tablespaces',
            '--default-character-set='.($config['charset'] ?: 'utf8mb4'),
            $config['database'],
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function writeDefaultsFile(array $config): string
    {
        $path = tempnam(sys_get_temp_dir(), 'kcdump');

        if ($path === false) {
            throw new RuntimeException('Gagal membuat file kredensial sementara.');
        }

        // Narrow the window between creation and writing: tempnam already makes
        // the file 0600, this keeps it that way on hosts where umask differs.
        chmod($path, 0600);

        $ini = "[client]\n";
        $ini .= 'user="'.addslashes((string) $config['username']).'"'."\n";
        $ini .= 'password="'.addslashes((string) $config['password']).'"'."\n";

        if ($config['unix_socket']) {
            $ini .= 'socket="'.addslashes((string) $config['unix_socket']).'"'."\n";
        } else {
            $ini .= 'host="'.addslashes((string) $config['host']).'"'."\n";
            $ini .= 'port='.(int) $config['port']."\n";
        }

        file_put_contents($path, $ini);

        return $path;
    }

    /**
     * @return array<string, mixed>
     */
    private function connectionConfig(): array
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        if (! is_array($config) || ! in_array($config['driver'] ?? null, ['mysql', 'mariadb'], true)) {
            throw new RuntimeException('Export database hanya mendukung koneksi MySQL/MariaDB.');
        }

        return $config;
    }

    private function binary(): string
    {
        return (string) config('database.dump.binary', 'mysqldump');
    }
}
