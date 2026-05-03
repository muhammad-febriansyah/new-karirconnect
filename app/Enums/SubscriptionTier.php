<?php

namespace App\Enums;

enum SubscriptionTier: string
{
    case Free = 'free';
    case Starter = 'starter';
    case Pro = 'pro';
    case Enterprise = 'enterprise';

    public function label(): string
    {
        return match ($this) {
            self::Free => 'Free',
            self::Starter => 'Starter',
            self::Pro => 'Pro',
            self::Enterprise => 'Enterprise',
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
