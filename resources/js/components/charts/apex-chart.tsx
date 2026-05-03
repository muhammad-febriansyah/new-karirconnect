import type { ApexAxisChartSeries, ApexNonAxisChartSeries, ApexOptions } from 'apexcharts';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';

type ReactApexChartProps = {
    type: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'radialBar' | 'scatter' | 'bubble' | 'heatmap';
    series: ApexAxisChartSeries | ApexNonAxisChartSeries;
    options?: ApexOptions;
    width?: string | number;
    height?: string | number;
};

type Loaded = ComponentType<ReactApexChartProps> | null | 'error';

const Skeleton = ({ height }: { height?: string | number }) => (
    <div
        className="w-full animate-pulse rounded-md bg-muted/60"
        style={{ height: typeof height === 'number' ? `${height}px` : (height ?? '280px') }}
    />
);

export function ApexChart(props: ReactApexChartProps) {
    const [Chart, setChart] = useState<Loaded>(null);

    useEffect(() => {
        let active = true;
        import('react-apexcharts')
            .then((mod) => {
                if (!active) return;
                const Component = (mod as { default?: ComponentType<ReactApexChartProps> }).default;
                if (typeof Component !== 'function') {
                    console.error('[ApexChart] react-apexcharts default export is not a component', mod);
                    setChart('error');
                    return;
                }
                setChart(() => Component);
            })
            .catch((err) => {
                console.error('[ApexChart] failed to load react-apexcharts', err);
                if (active) setChart('error');
            });
        return () => {
            active = false;
        };
    }, []);

    if (Chart === 'error') {
        return (
            <div
                className="flex w-full items-center justify-center rounded-md border border-dashed border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-600"
                style={{ height: typeof props.height === 'number' ? `${props.height}px` : (props.height ?? '280px') }}
            >
                Gagal memuat chart. Cek console.
            </div>
        );
    }

    if (!Chart) {
        return <Skeleton height={props.height} />;
    }

    return <Chart {...props} />;
}
