import { Globe, Mail, MapPin, Phone } from 'lucide-react';

type Personal = {
    full_name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    website: string;
};

type ExperienceItem = {
    company: string;
    position: string;
    period: string;
    description: string;
};

type EducationItem = {
    institution: string;
    major: string;
    period: string;
    gpa: string;
};

type CertificationItem = {
    name: string;
    issuer: string;
    year: string;
};

export type CvPreviewData = {
    personal: Personal;
    summary: string;
    experiences: ExperienceItem[];
    educations: EducationItem[];
    skills: string[];
    certifications: CertificationItem[];
};

type Props = {
    data: CvPreviewData;
    /** Render at A4 ratio (suitable for modals). Default true. */
    a4?: boolean;
};

const SectionHeading = ({ children }: { children: string }) => (
    <h2 className="mb-2 mt-5 border-b-[1.5px] border-slate-900 pb-1 text-[10pt] font-bold uppercase tracking-[0.6pt] text-slate-900 first:mt-0">
        {children}
    </h2>
);

export function CvPreview({ data, a4 = true }: Props) {
    const personal = data.personal;
    const hasContact =
        personal.email || personal.phone || personal.location || personal.website;

    const experiences = data.experiences.filter(
        (e) => e.company.trim() || e.position.trim() || e.description.trim(),
    );
    const educations = data.educations.filter((e) => e.institution.trim());
    const certifications = data.certifications.filter((c) => c.name.trim());
    const skills = data.skills.map((s) => s.trim()).filter(Boolean);

    return (
        <div
            className={a4 ? 'mx-auto w-full max-w-[794px] bg-white shadow-md ring-1 ring-slate-200/70' : 'w-full bg-white'}
            style={a4 ? { aspectRatio: '794 / 1123', minHeight: 'min(1123px, 100%)' } : undefined}
        >
            <div className="px-10 py-10 text-[11pt] leading-relaxed text-slate-900" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
                {/* Header */}
                <header className="mb-4">
                    <h1 className="text-[22pt] font-bold leading-tight tracking-tight text-slate-900">
                        {personal.full_name || 'Nama Lengkap'}
                    </h1>
                    {personal.headline && (
                        <p className="mt-0.5 text-[10pt] text-slate-500">{personal.headline}</p>
                    )}
                    {hasContact && (
                        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[9.5pt] text-slate-600">
                            {personal.email && (
                                <span className="inline-flex items-center gap-1">
                                    <Mail className="size-3" /> {personal.email}
                                </span>
                            )}
                            {personal.phone && (
                                <span className="inline-flex items-center gap-1">
                                    <Phone className="size-3" /> {personal.phone}
                                </span>
                            )}
                            {personal.location && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="size-3" /> {personal.location}
                                </span>
                            )}
                            {personal.website && (
                                <span className="inline-flex items-center gap-1">
                                    <Globe className="size-3" /> {personal.website}
                                </span>
                            )}
                        </div>
                    )}
                </header>

                {/* Summary */}
                {data.summary.trim() && (
                    <section>
                        <SectionHeading>Ringkasan Profesional</SectionHeading>
                        <p className="whitespace-pre-line text-[10.5pt]">{data.summary}</p>
                    </section>
                )}

                {/* Experiences */}
                {experiences.length > 0 && (
                    <section>
                        <SectionHeading>Pengalaman Kerja</SectionHeading>
                        <div className="space-y-3">
                            {experiences.map((exp, i) => (
                                <article key={i}>
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-[10.5pt] font-semibold text-slate-900">
                                            {exp.position || '—'}
                                            {exp.position && exp.company && ' — '}
                                            {exp.company}
                                        </h3>
                                        {exp.period && (
                                            <span className="shrink-0 text-[9pt] text-slate-500">{exp.period}</span>
                                        )}
                                    </div>
                                    {exp.description && (
                                        <p className="mt-1 whitespace-pre-line text-[10pt] text-slate-700">
                                            {exp.description}
                                        </p>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {/* Educations */}
                {educations.length > 0 && (
                    <section>
                        <SectionHeading>Pendidikan</SectionHeading>
                        <div className="space-y-2.5">
                            {educations.map((edu, i) => (
                                <article key={i}>
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-[10.5pt] font-semibold text-slate-900">
                                            {edu.institution || '—'}
                                            {edu.institution && edu.major && ' — '}
                                            {edu.major}
                                        </h3>
                                        {edu.period && (
                                            <span className="shrink-0 text-[9pt] text-slate-500">{edu.period}</span>
                                        )}
                                    </div>
                                    {edu.gpa && (
                                        <p className="mt-0.5 text-[9.5pt] text-slate-500">IPK: {edu.gpa}</p>
                                    )}
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                    <section>
                        <SectionHeading>Keahlian</SectionHeading>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.map((skill) => (
                                <span
                                    key={skill}
                                    className="rounded bg-slate-100 px-2 py-0.5 text-[9pt] text-slate-700"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Certifications */}
                {certifications.length > 0 && (
                    <section>
                        <SectionHeading>Sertifikasi</SectionHeading>
                        <div className="space-y-2">
                            {certifications.map((cert, i) => (
                                <article key={i}>
                                    <h3 className="text-[10.5pt] font-semibold text-slate-900">{cert.name}</h3>
                                    <p className="mt-0.5 text-[9.5pt] text-slate-500">
                                        {cert.issuer}
                                        {cert.issuer && cert.year && ' — '}
                                        {cert.year}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state */}
                {!data.summary.trim() &&
                    experiences.length === 0 &&
                    educations.length === 0 &&
                    skills.length === 0 &&
                    certifications.length === 0 && (
                        <div className="mt-12 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                            Mulai isi form di kiri — preview akan terupdate secara realtime.
                        </div>
                    )}
            </div>
        </div>
    );
}
