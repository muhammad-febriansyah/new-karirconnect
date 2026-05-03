import createGlobe, { type COBEOptions } from 'cobe';
import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type Marker = {
    location: [number, number];
    size: number;
};

type GlobeProps = {
    className?: string;
    config?: Partial<COBEOptions>;
};

const INDONESIAN_CITIES: Marker[] = [
    { location: [-6.2088, 106.8456], size: 0.12 }, // Jakarta
    { location: [-6.9175, 107.6191], size: 0.08 }, // Bandung
    { location: [-7.2575, 112.7521], size: 0.09 }, // Surabaya
    { location: [3.5952, 98.6722], size: 0.08 }, // Medan
    { location: [-7.7956, 110.3695], size: 0.07 }, // Yogyakarta
    { location: [-8.65, 115.2167], size: 0.07 }, // Denpasar
    { location: [-5.1477, 119.4327], size: 0.07 }, // Makassar
    { location: [0.5333, 101.45], size: 0.06 }, // Pekanbaru
    { location: [-1.6101, 103.6131], size: 0.06 }, // Jambi
    { location: [-0.789275, 113.921327], size: 0.05 }, // Indonesia center
];

const DEFAULT_CONFIG: COBEOptions = {
    width: 800,
    height: 800,
    onRender: () => undefined,
    devicePixelRatio: 2,
    phi: 0,
    theta: 0.3,
    dark: 0,
    diffuse: 0.4,
    mapSamples: 16000,
    mapBrightness: 1.2,
    baseColor: [0.92, 0.94, 0.98],
    markerColor: [16 / 255, 128 / 255, 224 / 255],
    glowColor: [16 / 255, 192 / 255, 224 / 255],
    markers: INDONESIAN_CITIES,
};

/**
 * Auto-rotating WebGL globe centered on Indonesia. Cobe handles the heavy
 * lifting; we just feed it markers and a phi value that increments each
 * frame. Lazy mounts so it never runs in SSR.
 */
export function Globe({ className, config = {} }: GlobeProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const phiRef = useRef(2.0); // start near Indonesia (~120° east)
    const widthRef = useRef(0);

    const onResize = useCallback(() => {
        if (canvasRef.current) {
            widthRef.current = canvasRef.current.offsetWidth;
        }
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        window.addEventListener('resize', onResize);
        onResize();

        const globe = createGlobe(canvasRef.current, {
            ...DEFAULT_CONFIG,
            ...config,
            width: widthRef.current * 2,
            height: widthRef.current * 2,
            onRender: (state) => {
                phiRef.current += 0.003;
                state.phi = phiRef.current;
                state.width = widthRef.current * 2;
                state.height = widthRef.current * 2;
            },
        });

        // Fade in
        if (canvasRef.current) {
            canvasRef.current.style.opacity = '1';
        }

        return () => {
            globe.destroy();
            window.removeEventListener('resize', onResize);
        };
    }, [config, onResize]);

    return (
        <div className={cn('relative aspect-square w-full max-w-[600px]', className)}>
            <canvas
                ref={canvasRef}
                className="size-full opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
                style={{ aspectRatio: '1 / 1' }}
            />
        </div>
    );
}
