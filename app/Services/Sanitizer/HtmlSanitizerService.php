<?php

namespace App\Services\Sanitizer;

use Mews\Purifier\Facades\Purifier;

class HtmlSanitizerService
{
    /**
     * Allowed tags for rich text fields. Configured at the call-site so we
     * can compose stricter / looser variants without editing config/purifier.
     *
     * @var array<int, string>
     */
    private const DEFAULT_ALLOWED = [
        'p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'h4',
        'ul', 'ol', 'li', 'a[href|target|rel]', 'blockquote',
        'code', 'pre', 'img[src|alt|width|height]',
    ];

    /**
     * Sanitize untrusted HTML coming from rich-text editors.
     */
    public function clean(?string $html, ?array $allowed = null): string
    {
        if ($html === null || trim($html) === '') {
            return '';
        }

        $config = [
            'HTML.Allowed' => implode(',', $allowed ?? self::DEFAULT_ALLOWED),
            'HTML.TargetBlank' => true,
            'HTML.Nofollow' => true,
            'AutoFormat.AutoParagraph' => false,
            'AutoFormat.RemoveEmpty' => true,
            'URI.AllowedSchemes' => ['http' => true, 'https' => true, 'mailto' => true],
        ];

        return Purifier::clean($html, $config);
    }

    /**
     * Stricter variant for short fields (announcements summaries, etc).
     */
    public function cleanInline(?string $html): string
    {
        return $this->clean($html, ['strong', 'em', 'u', 'a[href|target|rel]', 'br']);
    }
}
