<?php

namespace App\Services\Files;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\ImageManager;

class FileUploadService
{
    private const DISK = 'public';

    /**
     * Store a file with a randomized name; returns the relative storage path.
     */
    public function store(UploadedFile $file, string $directory): string
    {
        $name = Str::random(32).'.'.$file->getClientOriginalExtension();

        return $file->storeAs($directory, $name, self::DISK);
    }

    /**
     * Store an image, optionally resizing to a max width while preserving ratio.
     * Returns the relative storage path. Re-encodes to keep payload small.
     */
    public function storeImage(UploadedFile $file, string $directory, ?int $maxWidth = 1024): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = Str::random(32).'.'.$extension;
        $relative = $directory.'/'.$name;
        $absolute = Storage::disk(self::DISK)->path($relative);

        Storage::disk(self::DISK)->makeDirectory($directory);

        $manager = ImageManager::gd();
        $image = $manager->read($file->getRealPath());

        if ($maxWidth !== null && $image->width() > $maxWidth) {
            $image->scaleDown(width: $maxWidth);
        }

        $image->save($absolute);

        return $relative;
    }

    /**
     * Delete a previously stored file. Safe to call with null.
     */
    public function delete(?string $path): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        Storage::disk(self::DISK)->delete($path);
    }
}
