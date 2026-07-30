<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Audit\AuditLogService;
use App\Services\Maintenance\ShowcaseDataPurger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin-only removal of the FreshShowcaseSeeder demo data from a live database.
 *
 * The deletion is permanent and cascades into job posts and applications, so
 * four controls stand in front of it: role:admin, a fresh password
 * confirmation, a throttle, and a typed confirmation phrase. The page always
 * shows a preview of the exact blast radius first -- the admin never presses a
 * button without seeing what it takes with it. Every purge is written to the
 * audit log with the counts it removed.
 */
class ShowcaseDataController extends Controller implements HasMiddleware
{
    /**
     * Phrase the admin must type to arm the button. Long enough that it cannot
     * be produced by a stray Enter on a focused field.
     */
    private const CONFIRMATION_PHRASE = 'HAPUS DATA DUMMY';

    public function __construct(
        private readonly ShowcaseDataPurger $purger,
        private readonly AuditLogService $auditLog,
    ) {}

    /**
     * Password confirmation guards `destroy` only. Putting it on `index` would
     * demand a password just to view the preview, which trains admins to type
     * their password on reflex -- the habit phishing relies on.
     */
    public static function middleware(): array
    {
        return [
            new Middleware('password.confirm', only: ['destroy']),
            new Middleware('throttle:3,60', only: ['destroy']),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('admin/showcase-data/index', [
            'preview' => $this->purger->preview(),
            'confirmationPhrase' => self::CONFIRMATION_PHRASE,
            'recentPurges' => $this->auditLog->recentByAction('showcase.purge', 10),
        ]);
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'confirmation' => ['required', 'string', 'in:'.self::CONFIRMATION_PHRASE],
        ], [
            'confirmation.in' => 'Ketik "'.self::CONFIRMATION_PHRASE.'" persis untuk melanjutkan.',
        ]);

        // Re-read rather than trusting the counts the page was rendered with:
        // the tab may have sat open while the data underneath it changed.
        $preview = $this->purger->preview();

        if ($preview['employers'] === 0 && $preview['candidates'] === 0) {
            return back()->with('error', 'Tidak ada data showcase yang tersisa untuk dihapus.');
        }

        $deleted = $this->purger->purge();

        // Recorded after the fact on purpose: the deletion runs in a transaction,
        // so a failure leaves nothing behind and would make a pre-written entry
        // claim a purge that never happened.
        $this->auditLog->record('showcase.purge', before: $preview, after: $deleted);

        return back()->with('success', sprintf(
            'Data showcase dihapus: %d perusahaan, %d akun employer, %d akun kandidat.',
            $deleted['companies'],
            $deleted['employers'],
            $deleted['candidates'],
        ));
    }
}
