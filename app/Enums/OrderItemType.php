<?php

namespace App\Enums;

enum OrderItemType: string
{
    case SubscriptionPlan = 'subscription_plan';
    case JobBoost = 'job_boost';
    case AiInterviewPack = 'ai_interview_pack';
}
