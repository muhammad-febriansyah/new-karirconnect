import { Link } from '@inertiajs/react';
import CertificationController from '@/actions/App/Http/Controllers/Employee/CertificationController';
import EducationController from '@/actions/App/Http/Controllers/Employee/EducationController';
import ProfileController from '@/actions/App/Http/Controllers/Employee/ProfileController';
import WorkExperienceController from '@/actions/App/Http/Controllers/Employee/WorkExperienceController';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUrl } from '@/hooks/use-current-url';

const tabs = [
    { label: 'Profil', href: ProfileController.edit().url },
    { label: 'Pendidikan', href: EducationController.index().url },
    { label: 'Pengalaman', href: WorkExperienceController.index().url },
    { label: 'Sertifikasi', href: CertificationController.index().url },
];

export function ProfileTabs() {
    const { currentUrl, isCurrentUrl } = useCurrentUrl();
    const activeTab = tabs.find((tab) => isCurrentUrl(tab.href))?.href ?? ProfileController.edit().url;

    return (
        <Tabs value={activeTab}>
            <TabsList className="flex w-full flex-wrap justify-start overflow-x-auto">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.href} value={tab.href} asChild>
                        <Link href={tab.href} prefetch preserveScroll data-current={isCurrentUrl(tab.href, currentUrl)}>
                            {tab.label}
                        </Link>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
    );
}
