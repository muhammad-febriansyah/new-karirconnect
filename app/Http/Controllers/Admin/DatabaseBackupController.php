<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Audit\AuditLogService;
use App\Services\Exports\DatabaseSqlExporter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin-only export of the whole database.
 *
 * The dump contains every password hash, every two-factor secret and every
 * applicant's personal data, so this endpoint is the single highest-value
 * target in the app. Three controls stand in front of it: role:admin, a fresh
 * password confirmation, and a throttle. Every download is written to the audit
 * log before a byte leaves, so an export always leaves a trace even if the
 * download itself is later abandoned.
 */
class DatabaseBackupController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly DatabaseSqlExporter $exporter,
        private readonly AuditLogService $auditLog,
    ) {}

    /**
     * Password confirmation applies to `download` only. Guarding `index` too
     * would prompt for a password just to look at the page, which trains admins
     * to type their password on reflex -- the habit phishing relies on.
     */
    public static function middleware(): array
    {
        return [
            new Middleware('password.confirm', only: ['download']),
            new Middleware('throttle:3,60', only: ['download']),
        ];
    }

    public function index(): Response
    {
        $available = true;
        $error = null;

        try {
            $this->exporter->assertAvailable();
        } catch (RuntimeException $e) {
            $available = false;
            $error = $e->getMessage();
        }

        return Inertia::render('admin/database/index', [
            'available' => $available,
            'error' => $error,
            'connection' => config('database.default'),
            'database' => config('database.connections.'.config('database.default').'.database'),
            'recentExports' => $this->auditLog->recentByAction('database.export', 10),

            // The download must be a real browser navigation, not an XHR, or the
            // file never reaches disk. That rules out Inertia's router and means
            // a plain <form> -- which needs the token passed explicitly.
            'csrfToken' => csrf_token(),
        ]);
    }

    public function download(): StreamedResponse|RedirectResponse
    {
        try {
            $this->exporter->assertAvailable();
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        // Recorded before streaming starts. If it were written afterwards, a
        // client that disconnects mid-download would take the evidence with it.
        $this->auditLog->record('database.export');

        return $this->exporter->stream();
    }
}
