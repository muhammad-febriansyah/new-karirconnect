<?php

namespace App\Enums;

enum SkillType: string
{
    case Soft = 'soft';
    case Hard = 'hard';

    public function label(): string
    {
        return match ($this) {
            self::Soft => 'Soft Skills (Skill Umum)',
            self::Hard => 'Hard Skills (Skill Teknis)',
        };
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    public static function selectItems(): array
    {
        return array_map(
            fn (self $case) => ['value' => $case->value, 'label' => $case->label()],
            self::cases(),
        );
    }
}
