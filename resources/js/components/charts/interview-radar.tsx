import { useMemo } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';

type Scores = {
    technical: number | null;
    communication: number | null;
    problem_solving: number | null;
    culture_fit: number | null;
};

type Props = {
    scores: Scores;
    /** Numeric fallback list for screen readers and viewers who prefer numbers over chart. */
    showLegend?: boolean;
    title?: string;
};

const AXES: Array<{ key: keyof Scores; label: string }> = [
    { key: 'technical', label: 'Teknis' },
    { key: 'communication', label: 'Komunikasi' },
    { key: 'problem_solving', label: 'Pemecahan Masalah' },
    { key: 'culture_fit', label: 'Budaya' },
];

export function InterviewRadarChart({ scores, showLegend = true, title }: Props) {
    const data = useMemo(
        () =>
            AXES.map((axis) => ({
                axis: axis.label,
                score: scores[axis.key] ?? 0,
            })),
        [scores],
    );

    const allMissing = AXES.every((a) => scores[a.key] === null);

    if (allMissing) {
        return (
            <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Belum ada skor analisis untuk ditampilkan.
            </div>
        );
    }

    return (
        <figure
            className="space-y-3"
            role="figure"
            aria-label={title ?? 'Diagram radar skor wawancara: teknis, komunikasi, pemecahan masalah, budaya'}
        >
            <div className="h-64 w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data} outerRadius="78%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                            dataKey="axis"
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <PolarRadiusAxis
                            angle={90}
                            domain={[0, 100]}
                            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            tickCount={5}
                            axisLine={false}
                        />
                        <Tooltip
                            formatter={(value) => [`${value as number} / 100`, 'Skor']}
                            contentStyle={{
                                background: 'hsl(var(--popover))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: 6,
                                fontSize: 12,
                            }}
                        />
                        <Radar
                            name="Skor"
                            dataKey="score"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary))"
                            fillOpacity={0.2}
                            isAnimationActive={false}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
            {showLegend && (
                <figcaption className="sr-only">
                    Skor wawancara —{' '}
                    {AXES.map((a) => `${a.label}: ${scores[a.key] ?? 0} dari 100`).join(', ')}.
                </figcaption>
            )}
            {showLegend && (
                <ul className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-hidden="true">
                    {AXES.map((axis) => (
                        <li key={axis.key} className="rounded-md border bg-card p-2">
                            <div className="text-muted-foreground">{axis.label}</div>
                            <div className="font-semibold tabular-nums">
                                {scores[axis.key] ?? 0}
                                <span className="ml-0.5 text-muted-foreground/60"> / 100</span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </figure>
    );
}
