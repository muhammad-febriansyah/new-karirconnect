import { Head, Link } from '@inertiajs/react';
import {
    Award,
    Briefcase,
    GraduationCap,
    Github,
    Globe,
    Linkedin,
    MapPin,
    Pencil,
} from 'lucide-react';
import ProfileController from '@/actions/App/Http/Controllers/Employee/ProfileController';
import { PageHeader } from '@/components/layout/page-header';
import { Section } from '@/components/layout/section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format-date';

type Skill = { id: number; name: string };
type Education = {
    id: number;
    institution: string | null;
    level: string | null;
    major: string | null;
    start_year: number | null;
    end_year: number | null;
    gpa: number | string | null;
};
type WorkExperience = {
    id: number;
    company_name: string | null;
    position: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
};
type Certification = {
    id: number;
    name: string | null;
    issuer: string | null;
    issued_date: string | null;
};

type Profile = {
    name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    headline: string | null;
    about: string | null;
    date_of_birth: string | null;
    gender: string | null;
    province: string | null;
    city: string | null;
    current_position: string | null;
    experience_level: string | null;
    is_open_to_work: boolean;
    visibility: string;
    completion: number;
    portfolio_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
    skills: Skill[];
    educations: Education[];
    work_experiences: WorkExperience[];
    certifications: Certification[];
};

const visibilityLabels: Record<string, string> = {
    public: 'Publik',
    recruiter_only: 'Recruiter Only',
    employers: 'Recruiter Only',
    private: 'Private',
};

export default function EmployeeProfileShow({ profile }: { profile: Profile }) {
    const location = [profile.city, profile.province].filter(Boolean).join(', ');

    return (
        <>
            <Head title="Profil Saya" />

            <div className="space-y-6 p-4 sm:p-6">
                <PageHeader
                    title="Profil Saya"
                    description="Inilah profil yang dilihat perusahaan saat menelusuri kandidat."
                    actions={
                        <Button asChild>
                            <Link href={ProfileController.edit().url}>
                                <Pencil className="size-4" /> Edit Profil
                            </Link>
                        </Button>
                    }
                />

                {/* Identity header */}
                <Section>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Avatar className="size-20 ring-2 ring-border">
                            <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.name} />
                            <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-cyan text-xl font-bold text-white">
                                {profile.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                            <h2 className="text-xl font-bold text-brand-navy">{profile.name}</h2>
                            {profile.headline && <p className="text-sm text-muted-foreground">{profile.headline}</p>}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm text-muted-foreground">
                                {profile.current_position && (
                                    <span className="inline-flex items-center gap-1">
                                        <Briefcase className="size-3.5" /> {profile.current_position}
                                    </span>
                                )}
                                {location && (
                                    <span className="inline-flex items-center gap-1">
                                        <MapPin className="size-3.5" /> {location}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {profile.is_open_to_work && (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Open to Work</Badge>
                                )}
                                <Badge variant="secondary">Visibilitas: {visibilityLabels[profile.visibility] ?? profile.visibility}</Badge>
                                <Badge variant="outline">Kelengkapan {profile.completion}%</Badge>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* About */}
                <Section title="Tentang Saya">
                    {profile.about ? (
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{profile.about}</p>
                    ) : (
                        <EmptyText>Belum ada deskripsi.</EmptyText>
                    )}
                </Section>

                {/* Personal info */}
                <Section title="Informasi Pribadi">
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <InfoItem label="Email" value={profile.email} />
                        <InfoItem label="No. HP" value={profile.phone} />
                        <InfoItem label="Tanggal Lahir" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
                        <InfoItem label="Jenis Kelamin" value={profile.gender} />
                        <InfoItem label="Lokasi" value={location || null} />
                        <InfoItem label="Level Pengalaman" value={profile.experience_level} />
                    </dl>
                </Section>

                {/* Skills */}
                <Section title="Skills">
                    {profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill) => (
                                <Badge key={skill.id} variant="secondary">
                                    {skill.name}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <EmptyText>Belum ada skill ditambahkan.</EmptyText>
                    )}
                </Section>

                {/* Education */}
                <Section title="Pendidikan">
                    {profile.educations.length > 0 ? (
                        <ul className="space-y-4">
                            {profile.educations.map((edu) => (
                                <li key={edu.id} className="flex gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <GraduationCap className="size-5" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-brand-navy">{edu.institution}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {[edu.level, edu.major].filter(Boolean).join(' · ')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {[edu.start_year, edu.end_year].filter(Boolean).join(' – ')}
                                            {edu.gpa ? ` · IPK ${edu.gpa}` : ''}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyText>Belum ada riwayat pendidikan.</EmptyText>
                    )}
                </Section>

                {/* Work experience */}
                <Section title="Pengalaman Kerja">
                    {profile.work_experiences.length > 0 ? (
                        <ul className="space-y-4">
                            {profile.work_experiences.map((exp) => (
                                <li key={exp.id} className="flex gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <Briefcase className="size-5" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-brand-navy">{exp.position}</p>
                                        <p className="text-sm text-muted-foreground">{exp.company_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {exp.start_date ? formatDate(exp.start_date) : ''}
                                            {' – '}
                                            {exp.is_current ? 'Sekarang' : exp.end_date ? formatDate(exp.end_date) : ''}
                                        </p>
                                        {exp.description && (
                                            <p className="mt-1 whitespace-pre-line text-sm text-foreground/80">{exp.description}</p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyText>Belum ada pengalaman kerja.</EmptyText>
                    )}
                </Section>

                {/* Certifications */}
                {profile.certifications.length > 0 && (
                    <Section title="Sertifikasi">
                        <ul className="space-y-4">
                            {profile.certifications.map((cert) => (
                                <li key={cert.id} className="flex gap-3">
                                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                        <Award className="size-5" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-semibold text-brand-navy">{cert.name}</p>
                                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                                        {cert.issued_date && (
                                            <p className="text-xs text-muted-foreground">{formatDate(cert.issued_date)}</p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {/* Links */}
                {(profile.linkedin_url || profile.portfolio_url || profile.github_url) && (
                    <Section title="Tautan Online">
                        <div className="flex flex-wrap gap-2">
                            {profile.linkedin_url && (
                                <LinkChip href={profile.linkedin_url} icon={Linkedin} label="LinkedIn" />
                            )}
                            {profile.portfolio_url && (
                                <LinkChip href={profile.portfolio_url} icon={Globe} label="Portfolio" />
                            )}
                            {profile.github_url && <LinkChip href={profile.github_url} icon={Github} label="GitHub" />}
                        </div>
                    </Section>
                )}

                {/* Bottom edit button */}
                <div className="flex justify-end">
                    <Button asChild size="lg">
                        <Link href={ProfileController.edit().url}>
                            <Pencil className="size-4" /> Edit Profil
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    );
}

function InfoItem({ label, value }: { label: string; value: string | null }) {
    return (
        <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-sm text-foreground/90">{value || <span className="text-muted-foreground">—</span>}</dd>
        </div>
    );
}

function EmptyText({ children }: { children: React.ReactNode }) {
    return <p className="text-sm text-muted-foreground">{children}</p>;
}

function LinkChip({ href, icon: Icon, label }: { href: string; icon: typeof Linkedin; label: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-brand-navy transition-colors hover:border-brand-blue/40 hover:bg-brand-blue/5"
        >
            <Icon className="size-4 text-brand-blue" /> {label}
        </a>
    );
}

EmployeeProfileShow.layout = {
    breadcrumbs: [
        {
            title: 'Profil Saya',
            href: ProfileController.show().url,
        },
    ],
};
