<?php

namespace App\Services\Files;

/**
 * Pure-PHP CV text extractor — no external dependency.
 * Supports PDF (via stream + BT/ET regex with optional zlib decompression)
 * and DOCX (via ZipArchive reading word/document.xml).
 */
class CvTextExtractorService
{
    private const MAX_CHARS = 6000;

    public function extractFromPath(string $absolutePath, string $mimeType): string
    {
        $text = match (true) {
            $this->isPdf($mimeType, $absolutePath) => $this->extractFromPdf($absolutePath),
            $this->isDocx($mimeType, $absolutePath) => $this->extractFromDocx($absolutePath),
            default => '',
        };

        return mb_substr(trim((string) preg_replace('/\s+/', ' ', $text)), 0, self::MAX_CHARS);
    }

    private function isPdf(string $mimeType, string $path): bool
    {
        return str_contains($mimeType, 'pdf') || str_ends_with(strtolower($path), '.pdf');
    }

    private function isDocx(string $mimeType, string $path): bool
    {
        return str_contains($mimeType, 'word')
            || str_contains($mimeType, 'openxmlformats')
            || str_ends_with(strtolower($path), '.docx');
    }

    private function extractFromDocx(string $path): string
    {
        if (! class_exists('ZipArchive')) {
            return '';
        }

        $zip = new \ZipArchive;

        if ($zip->open($path) !== true) {
            return '';
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            return '';
        }

        $xml = preg_replace('/<\/w:p>/', "\n", $xml) ?? $xml;
        $xml = preg_replace('/<\/w:r>/', ' ', $xml) ?? $xml;

        return strip_tags($xml);
    }

    private function extractFromPdf(string $path): string
    {
        $content = @file_get_contents($path);

        if ($content === false) {
            return '';
        }

        $text = '';

        if (preg_match_all('/stream\r?\n(.*?)\r?\nendstream/s', $content, $streamMatches)) {
            foreach ($streamMatches[1] as $stream) {
                $source = $stream;

                $decompressed = @gzuncompress($stream);
                if ($decompressed !== false) {
                    $source = $decompressed;
                } else {
                    $decompressed = @gzinflate($stream);
                    if ($decompressed !== false) {
                        $source = $decompressed;
                    }
                }

                $text .= $this->extractTextFromPdfStream($source);
            }
        }

        if (trim($text) === '') {
            $text = $this->extractTextFromPdfStream($content);
        }

        return $text;
    }

    private function extractTextFromPdfStream(string $stream): string
    {
        $text = '';

        if (preg_match_all('/BT(.*?)ET/s', $stream, $btMatches)) {
            foreach ($btMatches[1] as $block) {
                if (preg_match_all('/\(([^)\\\\]*(?:\\\\.[^)\\\\]*)*)\)/', $block, $strMatches)) {
                    foreach ($strMatches[1] as $str) {
                        $decoded = preg_replace('/\\\\([nrtbf()\\\\])/', ' ', $str) ?? $str;
                        $text .= ' '.trim((string) $decoded);
                    }
                }

                if (preg_match_all('/\[([^\]]+)\]/', $block, $arrayMatches)) {
                    foreach ($arrayMatches[1] as $arr) {
                        if (preg_match_all('/\(([^)\\\\]*(?:\\\\.[^)\\\\]*)*)\)/', $arr, $arrStrMatches)) {
                            foreach ($arrStrMatches[1] as $str) {
                                $decoded = preg_replace('/\\\\([nrtbf()\\\\])/', ' ', $str) ?? $str;
                                $text .= trim((string) $decoded);
                            }
                        }
                    }
                }
            }
        }

        return $text;
    }
}
