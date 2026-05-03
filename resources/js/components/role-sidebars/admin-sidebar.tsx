import {
    Activity,
    AlertTriangle,
    BookOpen,
    Bot,
    BriefcaseBusiness,
    Building2,
    ClipboardList,
    CreditCard,
    HelpCircle,
    LayoutGrid,
    Megaphone,
    Newspaper,
    Receipt,
    ScrollText,
    Settings as SettingsIcon,
    ShieldCheck,
    Sparkles,
    Star,
    Tag,
    TrendingUp,
    UserSearch,
} from 'lucide-react';
import AboutPageController from '@/actions/App/Http/Controllers/Admin/AboutPageController';
import AiAuditLogController from '@/actions/App/Http/Controllers/Admin/AiAuditLogController';
import AnnouncementController from '@/actions/App/Http/Controllers/Admin/AnnouncementController';
import AuditLogController from '@/actions/App/Http/Controllers/Admin/AuditLogController';
import AssessmentQuestionController from '@/actions/App/Http/Controllers/Admin/AssessmentQuestionController';
import CareerResourceController from '@/actions/App/Http/Controllers/Admin/CareerResourceController';
import CompanyController from '@/actions/App/Http/Controllers/Admin/CompanyController';
import CompanyVerificationController from '@/actions/App/Http/Controllers/Admin/CompanyVerificationController';
import FaqController from '@/actions/App/Http/Controllers/Admin/FaqController';
import JobController from '@/actions/App/Http/Controllers/Admin/JobController';
import LegalPageController from '@/actions/App/Http/Controllers/Admin/LegalPageController';
import OrderController from '@/actions/App/Http/Controllers/Admin/OrderController';
import PaymentController from '@/actions/App/Http/Controllers/Admin/PaymentController';
import ReportController from '@/actions/App/Http/Controllers/Admin/ReportController';
import ReviewModerationController from '@/actions/App/Http/Controllers/Admin/ReviewModerationController';
import SalaryInsightController from '@/actions/App/Http/Controllers/Admin/SalaryInsightController';
import SubscriptionController from '@/actions/App/Http/Controllers/Admin/SubscriptionController';
import SubscriptionPlanController from '@/actions/App/Http/Controllers/Admin/SubscriptionPlanController';
import TalentSearchLogController from '@/actions/App/Http/Controllers/Admin/TalentSearchLogController';
import { dashboard } from '@/routes';
import { edit as adminSettingsEdit } from '@/routes/admin/settings';
import { index as jobCategoriesIndex } from '@/routes/admin/job-categories';
import { index as skillsIndex } from '@/routes/admin/skills';
import type { NavSection } from '@/types';

export const adminMainNavSections: NavSection[] = [
    {
        label: 'Beranda',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
        ],
    },
    {
        label: 'Perusahaan',
        items: [
            {
                title: 'Daftar Perusahaan',
                href: CompanyController.index().url,
                icon: Building2,
            },
            {
                title: 'Verifikasi Perusahaan',
                href: CompanyVerificationController.index().url,
                icon: ShieldCheck,
            },
            {
                title: 'Moderasi Ulasan',
                href: ReviewModerationController.index().url,
                icon: Star,
            },
        ],
    },
    {
        label: 'Lowongan & Talent',
        items: [
            {
                title: 'Lowongan',
                href: JobController.index().url,
                icon: BriefcaseBusiness,
            },
            {
                title: 'Kategori Pekerjaan',
                href: jobCategoriesIndex().url,
                icon: Tag,
            },
            {
                title: 'Keahlian',
                href: skillsIndex().url,
                icon: Sparkles,
            },
            {
                title: 'Soal Asesmen',
                href: AssessmentQuestionController.index().url,
                icon: ClipboardList,
            },
        ],
    },
    {
        label: 'Konten',
        items: [
            {
                title: 'Pengumuman',
                href: AnnouncementController.index().url,
                icon: Megaphone,
            },
            {
                title: 'Sumber Daya Karier',
                href: CareerResourceController.index().url,
                icon: BookOpen,
            },
            {
                title: 'Insight Gaji',
                href: SalaryInsightController.index().url,
                icon: TrendingUp,
            },
            {
                title: 'FAQ',
                href: FaqController.index().url,
                icon: HelpCircle,
            },
            {
                title: 'Halaman Legal',
                href: LegalPageController.index().url,
                icon: ScrollText,
            },
            {
                title: 'Tentang Kami',
                href: AboutPageController.edit().url,
                icon: Newspaper,
            },
        ],
    },
    {
        label: 'Transaksi',
        items: [
            {
                title: 'Paket Berlangganan',
                href: SubscriptionPlanController.index().url,
                icon: Tag,
            },
            {
                title: 'Langganan Aktif',
                href: SubscriptionController.index().url,
                icon: Activity,
            },
            {
                title: 'Pesanan',
                href: OrderController.index().url,
                icon: CreditCard,
            },
            {
                title: 'Pembayaran',
                href: PaymentController.index().url,
                icon: Receipt,
            },
        ],
    },
    {
        label: 'Laporan & Log',
        items: [
            {
                title: 'Laporan Pelanggaran',
                href: ReportController.index().url,
                icon: AlertTriangle,
            },
            {
                title: 'Log Aktivitas AI',
                href: AiAuditLogController.index().url,
                icon: Bot,
            },
            {
                title: 'Audit Log',
                href: AuditLogController.index().url,
                icon: ShieldCheck,
            },
            {
                title: 'Log Pencarian Talent',
                href: TalentSearchLogController.index().url,
                icon: UserSearch,
            },
        ],
    },
    {
        label: 'Sistem',
        items: [
            {
                title: 'Pengaturan Sistem',
                href: adminSettingsEdit().url,
                icon: SettingsIcon,
            },
        ],
    },
];
