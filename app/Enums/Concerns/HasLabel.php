<?php

namespace App\Enums\Concerns;

trait HasLabel
{
    /**
     * Get human-readable label for the enum value (Bahasa Indonesia).
     */
    abstract public function label(): string;

    /**
     * Build [value => label] map for select inputs.
     *
     * @return array<string, string>
     */
    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $case) => [$case->value => $case->label()])
            ->all();
    }

    /**
     * Build list of objects { value, label } for shadcn Select / Combobox.
     *
     * @return array<int, array{value: string, label: string}>
     */
    public static function selectItems(): array
    {
        return collect(self::cases())
            ->map(fn (self $case) => [
                'value' => $case->value,
                'label' => $case->label(),
            ])
            ->values()
            ->all();
    }

    /**
     * Get list of all string values.
     *
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
