import { Bot, BriefcaseBusiness, Building2, CalendarClock, CreditCard, LayoutGrid, ShieldCheck, Sparkles, UserCheck, Users, UserSearch } from 'lucide-react';
import AiInterviewReviewController from '@/actions/App/Http/Controllers/Employer/AiInterviewReviewController';
import AiInterviewTemplateController from '@/actions/App/Http/Controllers/Employer/AiInterviewTemplateController';
import ApplicantController from '@/actions/App/Http/Controllers/Employer/ApplicantController';
import BillingController from '@/actions/App/Http/Controllers/Employer/BillingController';
import CompanyProfileController from '@/actions/App/Http/Controllers/Employer/CompanyProfileController';
import CompanyVerificationController from '@/actions/App/Http/Controllers/Employer/CompanyVerificationController';
import InterviewController from '@/actions/App/Http/Controllers/Employer/InterviewController';
import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import TalentSearchController from '@/actions/App/Http/Controllers/Employer/TalentSearchController';
import TeamController from '@/actions/App/Http/Controllers/Employer/TeamController';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export const employerMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Profil Perusahaan',
        href: CompanyProfileController.edit().url,
        icon: Building2,
    },
    {
        title: 'Verifikasi',
        href: CompanyVerificationController.index().url,
        icon: ShieldCheck,
    },
    {
        title: 'Lowongan',
        href: JobController.index().url,
        icon: BriefcaseBusiness,
    },
    {
        title: 'Pelamar',
        href: ApplicantController.index().url,
        icon: UserCheck,
    },
    {
        title: 'Talent Search',
        href: TalentSearchController.index().url,
        icon: UserSearch,
    },
    {
        title: 'Interview',
        href: InterviewController.index().url,
        icon: CalendarClock,
    },
    {
        title: 'AI Interview',
        href: AiInterviewReviewController.index().url,
        icon: Bot,
    },
    {
        title: 'Template AI',
        href: AiInterviewTemplateController.index().url,
        icon: Sparkles,
    },
    {
        title: 'Tim',
        href: TeamController.index().url,
        icon: Users,
    },
    {
        title: 'Billing',
        href: BillingController.index().url,
        icon: CreditCard,
    },
];
