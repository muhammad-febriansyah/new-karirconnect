import { Bot, BriefcaseBusiness, Building2, CalendarClock, CreditCard, LayoutGrid, MapPin, MessageCircle, MessageSquare, ShieldCheck, Sparkles, UserCheck, Users, UserSearch } from 'lucide-react';
import AiInterviewReviewController from '@/actions/App/Http/Controllers/Employer/AiInterviewReviewController';
import AiInterviewTemplateController from '@/actions/App/Http/Controllers/Employer/AiInterviewTemplateController';
import ApplicantController from '@/actions/App/Http/Controllers/Employer/ApplicantController';
import BillingController from '@/actions/App/Http/Controllers/Employer/BillingController';
import CompanyOfficeController from '@/actions/App/Http/Controllers/Employer/CompanyOfficeController';
import CompanyProfileController from '@/actions/App/Http/Controllers/Employer/CompanyProfileController';
import CompanyReviewResponseController from '@/actions/App/Http/Controllers/Employer/CompanyReviewResponseController';
import CompanyVerificationController from '@/actions/App/Http/Controllers/Employer/CompanyVerificationController';
import InterviewController from '@/actions/App/Http/Controllers/Employer/InterviewController';
import JobController from '@/actions/App/Http/Controllers/Employer/JobController';
import TalentSearchController from '@/actions/App/Http/Controllers/Employer/TalentSearchController';
import TeamController from '@/actions/App/Http/Controllers/Employer/TeamController';
import { dashboard } from '@/routes';
import { index as conversationsIndex } from '@/routes/conversations';
import type { NavSection } from '@/types';

export const employerMainNavSections: NavSection[] = [
    {
        label: 'Ringkasan',
        items: [
            {
                title: 'Beranda',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Profil Bisnis',
                href: CompanyProfileController.edit().url,
                icon: Building2,
            },
            {
                title: 'Verifikasi Perusahaan',
                href: CompanyVerificationController.index().url,
                icon: ShieldCheck,
            },
            {
                title: 'Lokasi Kantor',
                href: CompanyOfficeController.index().url,
                icon: MapPin,
            },
        ],
    },
    {
        label: 'Rekrutmen',
        items: [
            {
                title: 'Kelola Lowongan',
                href: JobController.index().url,
                icon: BriefcaseBusiness,
            },
            {
                title: 'Lamaran Masuk',
                href: ApplicantController.index().url,
                icon: UserCheck,
            },
            {
                title: 'Cari Kandidat',
                href: TalentSearchController.index().url,
                icon: UserSearch,
            },
            {
                title: 'Jadwal Interview',
                href: InterviewController.index().url,
                icon: CalendarClock,
            },
        ],
    },
    {
        label: 'AI Tools',
        items: [
            {
                title: 'Interview Otomatis (AI)',
                href: AiInterviewReviewController.index().url,
                icon: Bot,
            },
            {
                title: 'Template Pertanyaan AI',
                href: AiInterviewTemplateController.index().url,
                icon: Sparkles,
            },
        ],
    },
    {
        label: 'Kolaborasi',
        items: [
            {
                title: 'Pesan',
                href: conversationsIndex().url,
                icon: MessageCircle,
            },
            {
                title: 'Manajemen Tim',
                href: TeamController.index().url,
                icon: Users,
            },
            {
                title: 'Ulasan Perusahaan',
                href: CompanyReviewResponseController.index().url,
                icon: MessageSquare,
            },
        ],
    },
    {
        label: 'Langganan',
        items: [
            {
                title: 'Tagihan & Paket',
                href: BillingController.index().url,
                icon: CreditCard,
            },
        ],
    },
];
