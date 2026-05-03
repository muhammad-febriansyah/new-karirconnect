import type { ApexOptions } from 'apexcharts';

/**
 * KarirConnect brand palette diambil dari logo:
 * - primary blue  #1080E0  (Connect)
 * - cyan accent   #10C0E0  (icon glow)
 * - navy          #001060  (Karir wordmark)
 */
export const BRAND_PALETTE = ['#1080E0', '#10C0E0', '#001060', '#3CD7F4', '#0066CC', '#5050B9'] as const;

export const BRAND_COLORS = {
    primary: '#1080E0',
    cyan: '#10C0E0',
    navy: '#001060',
    light: '#3CD7F4',
    dark: '#0066CC',
    accent: '#5050B9',
} as const;

/**
 * Default theme yang seragam buat semua chart KarirConnect.
 * Pakai font Poppins (sudah loaded global), grid lembut, animasi cepat.
 */
export function brandChartDefaults(): ApexOptions {
    return {
        chart: {
            fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif',
            toolbar: { show: false },
            zoom: { enabled: false },
            animations: { speed: 350, animateGradually: { enabled: false } },
            background: 'transparent',
        },
        colors: [...BRAND_PALETTE],
        grid: {
            borderColor: 'rgba(15,23,42,0.08)',
            strokeDashArray: 4,
            padding: { top: 0, right: 8, bottom: 0, left: 8 },
        },
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        legend: {
            position: 'bottom',
            fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif',
            fontSize: '12px',
            markers: { strokeWidth: 0 },
            itemMargin: { horizontal: 8, vertical: 4 },
        },
        tooltip: {
            theme: 'light',
            style: { fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif' },
            x: { show: true },
        },
        xaxis: {
            labels: {
                style: { fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif', fontSize: '11px', colors: '#64748B' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { fontFamily: 'Poppins, ui-sans-serif, system-ui, sans-serif', fontSize: '11px', colors: '#64748B' },
            },
        },
    };
}

export function mergeChartOptions(base: ApexOptions, override: ApexOptions): ApexOptions {
    return {
        ...base,
        ...override,
        chart: { ...base.chart, ...override.chart },
        grid: { ...base.grid, ...override.grid },
        legend: { ...base.legend, ...override.legend },
        tooltip: { ...base.tooltip, ...override.tooltip },
        xaxis: { ...base.xaxis, ...override.xaxis },
        yaxis: Array.isArray(override.yaxis) ? override.yaxis : { ...base.yaxis, ...override.yaxis },
    };
}
