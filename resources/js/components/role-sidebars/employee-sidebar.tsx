import { Bookmark, Bot, BriefcaseBusiness, CalendarClock, FileText, GraduationCap, IdCard, Inbox, LayoutGrid, MessagesSquare, Send, Sparkles } from 'lucide-react';
import AiInterviewController from '@/actions/App/Http/Controllers/Employee/AiInterviewController';
import ApplicationController from '@/actions/App/Http/Controllers/Employee/ApplicationController';
import CareerCoachController from '@/actions/App/Http/Controllers/Employee/CareerCoachController';
import CertificationController from '@/actions/App/Http/Controllers/Employee/CertificationController';
import CvUploadController from '@/actions/App/Http/Controllers/Employee/CvUploadController';
import EducationController from '@/actions/App/Http/Controllers/Employee/EducationController';
import InterviewController from '@/actions/App/Http/Controllers/Employee/InterviewController';
import MessageController from '@/actions/App/Http/Controllers/Employee/MessageController';
import ProfileController from '@/actions/App/Http/Controllers/Employee/ProfileController';
import SavedJobController from '@/actions/App/Http/Controllers/Employee/SavedJobController';
import WorkExperienceController from '@/actions/App/Http/Controllers/Employee/WorkExperienceController';
import { dashboard } from '@/routes';
import { edit as cvBuilderEdit } from '@/routes/employee/cv/builder';
import type { NavItem } from '@/types';

export const employeeMainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Profil',
        href: ProfileController.edit().url,
        icon: IdCard,
    },
    {
        title: 'Pendidikan',
        href: EducationController.index().url,
        icon: GraduationCap,
    },
    {
        title: 'Pengalaman Kerja',
        href: WorkExperienceController.index().url,
        icon: BriefcaseBusiness,
    },
    {
        title: 'Sertifikasi',
        href: CertificationController.index().url,
        icon: FileText,
    },
    {
        title: 'CV Saya',
        href: CvUploadController.index().url,
        icon: FileText,
    },
    {
        title: 'CV Builder',
        href: cvBuilderEdit().url,
        icon: Sparkles,
    },
    {
        title: 'Lowongan Tersimpan',
        href: SavedJobController.index().url,
        icon: Bookmark,
    },
    {
        title: 'Lamaran Saya',
        href: ApplicationController.index().url,
        icon: Send,
    },
    {
        title: 'Interview',
        href: InterviewController.index().url,
        icon: CalendarClock,
    },
    {
        title: 'AI Interview',
        href: AiInterviewController.index().url,
        icon: Bot,
    },
    {
        title: 'AI Career Coach',
        href: CareerCoachController.index().url,
        icon: MessagesSquare,
    },
    {
        title: 'Pesan Recruiter',
        href: MessageController.index().url,
        icon: Inbox,
    },
];
