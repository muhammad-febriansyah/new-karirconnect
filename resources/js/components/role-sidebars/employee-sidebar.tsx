import { Bell, Bookmark, Bot, CalendarClock, Coins, FileText, IdCard, Inbox, LayoutGrid, MessageCircle, MessagesSquare, Send, Sparkles, Star, Wand2 } from 'lucide-react';
import AiInterviewController from '@/actions/App/Http/Controllers/Employee/AiInterviewController';
import ApplicationController from '@/actions/App/Http/Controllers/Employee/ApplicationController';
import CareerCoachController from '@/actions/App/Http/Controllers/Employee/CareerCoachController';
import CompanyReviewController from '@/actions/App/Http/Controllers/Employee/CompanyReviewController';
import CvUploadController from '@/actions/App/Http/Controllers/Employee/CvUploadController';
import InterviewController from '@/actions/App/Http/Controllers/Employee/InterviewController';
import JobAlertController from '@/actions/App/Http/Controllers/Employee/JobAlertController';
import JobRecommendationController from '@/actions/App/Http/Controllers/Employee/JobRecommendationController';
import MessageController from '@/actions/App/Http/Controllers/Employee/MessageController';
import ProfileController from '@/actions/App/Http/Controllers/Employee/ProfileController';
import SalarySubmissionController from '@/actions/App/Http/Controllers/Employee/SalarySubmissionController';
import SavedJobController from '@/actions/App/Http/Controllers/Employee/SavedJobController';
import SkillAssessmentController from '@/actions/App/Http/Controllers/Employee/SkillAssessmentController';
import { dashboard } from '@/routes';
import { index as conversationsIndex } from '@/routes/conversations';
import { edit as cvBuilderEdit } from '@/routes/employee/cv/builder';
import type { NavSection } from '@/types';

export const employeeMainNavSections: NavSection[] = [
    {
        label: 'Ringkasan',
        items: [
            {
                title: 'Beranda Karier',
                href: dashboard(),
                icon: LayoutGrid,
            },
            {
                title: 'Profil Saya',
                href: ProfileController.edit().url,
                icon: IdCard,
            },
            {
                title: 'CV & Resume',
                href: CvUploadController.index().url,
                icon: FileText,
            },
            {
                title: 'Buat CV Otomatis',
                href: cvBuilderEdit().url,
                icon: Sparkles,
            },
        ],
    },
    {
        label: 'Pencarian Kerja',
        items: [
            {
                title: 'Rekomendasi Lowongan',
                href: JobRecommendationController.index().url,
                icon: Wand2,
            },
            {
                title: 'Bookmark Lowongan',
                href: SavedJobController.index().url,
                icon: Bookmark,
            },
            {
                title: 'Notifikasi Lowongan',
                href: JobAlertController.index().url,
                icon: Bell,
            },
            {
                title: 'Lamaran Kerja',
                href: ApplicationController.index().url,
                icon: Send,
            },
            {
                title: 'Jadwal Interview',
                href: InterviewController.index().url,
                icon: CalendarClock,
            },
        ],
    },
    {
        label: 'Pengembangan Karier',
        items: [
            {
                title: 'Simulasi Interview AI',
                href: AiInterviewController.index().url,
                icon: Bot,
            },
            {
                title: 'Konsultasi Karier AI',
                href: CareerCoachController.index().url,
                icon: MessagesSquare,
            },
            {
                title: 'Tes Skill',
                href: SkillAssessmentController.index().url,
                icon: Sparkles,
            },
        ],
    },
    {
        label: 'Interaksi & Reputasi',
        items: [
            {
                title: 'Pesan',
                href: conversationsIndex().url,
                icon: MessageCircle,
            },
            {
                title: 'Outreach Recruiter',
                href: MessageController.index().url,
                icon: Inbox,
            },
            {
                title: 'Ulasan Perusahaan Saya',
                href: CompanyReviewController.index().url,
                icon: Star,
            },
            {
                title: 'Laporan Gaji',
                href: SalarySubmissionController.index().url,
                icon: Coins,
            },
        ],
    },
];
