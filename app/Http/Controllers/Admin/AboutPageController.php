<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAboutPageRequest;
use App\Models\AboutPage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AboutPageController extends Controller
{
    private const HERO_DIR = 'about/hero';

    private const TEAM_DIR = 'about/team';

    public function edit(): Response
    {
        $page = AboutPage::firstSingleton();

        return Inertia::render('admin/about-page/edit', [
            'page' => [
                'hero_title' => $page->hero_title,
                'hero_subtitle' => $page->hero_subtitle,
                'hero_image_path' => $page->hero_image_path,
                'hero_image_url' => $page->hero_image_path ? Storage::disk('public')->url($page->hero_image_path) : null,
                'story_body' => $page->story_body,
                'vision' => $page->vision,
                'mission' => $page->mission,
                'values' => $page->values ?? [],
                'stats' => $page->stats ?? [],
                'team_members' => collect($page->team_members ?? [])->map(fn (array $m) => [
                    ...$m,
                    'photo_url' => isset($m['photo_path']) && $m['photo_path']
                        ? Storage::disk('public')->url($m['photo_path'])
                        : null,
                ])->values()->all(),
                'office_address' => $page->office_address,
                'office_map_embed' => $page->office_map_embed,
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
            ],
        ]);
    }

    public function update(UpdateAboutPageRequest $request): RedirectResponse
    {
        $page = AboutPage::firstSingleton();
        $data = $request->validated();

        $heroPath = $this->resolveHeroPath($request, $page);
        $teamMembers = $this->resolveTeamMembers($request, $page);

        $page->update([
            'hero_title' => $data['hero_title'] ?? null,
            'hero_subtitle' => $data['hero_subtitle'] ?? null,
            'hero_image_path' => $heroPath,
            'story_body' => $data['story_body'] ?? null,
            'vision' => $data['vision'] ?? null,
            'mission' => $data['mission'] ?? null,
            'values' => $this->cleanValues($data['values'] ?? []),
            'stats' => $this->cleanStats($data['stats'] ?? []),
            'team_members' => $teamMembers,
            'office_address' => $data['office_address'] ?? null,
            'office_map_embed' => $data['office_map_embed'] ?? null,
            'seo_title' => $data['seo_title'] ?? null,
            'seo_description' => $data['seo_description'] ?? null,
        ]);

        return redirect()
            ->route('admin.about-page.edit')
            ->with('success', 'Halaman Tentang Kami berhasil diperbarui.');
    }

    private function resolveHeroPath(UpdateAboutPageRequest $request, AboutPage $page): ?string
    {
        if ($request->boolean('remove_hero_image')) {
            $this->deleteIfExists($page->hero_image_path);

            return null;
        }

        $file = $request->file('hero_image');
        if ($file instanceof UploadedFile) {
            $this->deleteIfExists($page->hero_image_path);

            return $file->store(self::HERO_DIR, 'public');
        }

        return $page->hero_image_path;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function resolveTeamMembers(UpdateAboutPageRequest $request, AboutPage $page): array
    {
        $existing = collect($page->team_members ?? [])
            ->pluck('photo_path')
            ->filter()
            ->values()
            ->all();

        $rawMembers = $request->input('team_members', []);
        $files = $request->file('team_members') ?? [];
        $resolved = [];
        $kept = [];

        foreach (is_array($rawMembers) ? $rawMembers : [] as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '') {
                // Drop rows without a name; if it had a stale photo_path, that
                // file becomes orphaned and gets swept below.
                continue;
            }

            $photoPath = $row['photo_path'] ?? null;
            $newFile = $files[$index]['photo'] ?? null;

            if ($newFile instanceof UploadedFile) {
                if ($photoPath) {
                    $this->deleteIfExists($photoPath);
                }
                $photoPath = $newFile->store(self::TEAM_DIR, 'public');
            }

            $resolved[] = [
                'name' => $name,
                'role' => trim((string) ($row['role'] ?? '')) ?: null,
                'bio_short' => trim((string) ($row['bio_short'] ?? '')) ?: null,
                'linkedin_url' => trim((string) ($row['linkedin_url'] ?? '')) ?: null,
                'photo_path' => $photoPath ?: null,
            ];

            if ($photoPath) {
                $kept[] = $photoPath;
            }
        }

        // Sweep orphaned photos for members that were removed entirely
        foreach ($existing as $oldPath) {
            if (! in_array($oldPath, $kept, true)) {
                $this->deleteIfExists($oldPath);
            }
        }

        return $resolved;
    }

    /**
     * @param  array<int, array<string, mixed>>  $values
     * @return array<int, array{icon: ?string, title: string, body: ?string}>
     */
    private function cleanValues(array $values): array
    {
        return collect($values)
            ->filter(fn ($v) => is_array($v) && filled($v['title'] ?? null))
            ->map(fn (array $v) => [
                'icon' => trim((string) ($v['icon'] ?? '')) ?: null,
                'title' => trim((string) $v['title']),
                'body' => trim((string) ($v['body'] ?? '')) ?: null,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $stats
     * @return array<int, array{number: string, label: string, description: ?string}>
     */
    private function cleanStats(array $stats): array
    {
        return collect($stats)
            ->filter(fn ($s) => is_array($s) && filled($s['number'] ?? null) && filled($s['label'] ?? null))
            ->map(fn (array $s) => [
                'number' => trim((string) $s['number']),
                'label' => trim((string) $s['label']),
                'description' => trim((string) ($s['description'] ?? '')) ?: null,
            ])
            ->values()
            ->all();
    }

    private function deleteIfExists(?string $path): void
    {
        if ($path && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }
}
