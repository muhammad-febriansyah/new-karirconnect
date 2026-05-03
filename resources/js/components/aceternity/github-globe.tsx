import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
    AmbientLight,
    Color,
    DirectionalLight,
    Fog,
    type Mesh,
    PerspectiveCamera,
    PointLight,
    Scene,
    Vector3,
} from 'three';
import ThreeGlobe from 'three-globe';

/**
 * GitHub-style WebGL globe with animated arcs between Indonesian cities.
 * Uses three-globe directly (no react-three-fiber wrapper for the globe
 * mesh itself) so we control its lifecycle precisely.
 */

type Position = {
    order: number;
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    arcAlt: number;
    color: string;
};

type GlobeConfig = {
    pointSize?: number;
    globeColor?: string;
    showAtmosphere?: boolean;
    atmosphereColor?: string;
    atmosphereAltitude?: number;
    emissive?: string;
    emissiveIntensity?: number;
    shininess?: number;
    polygonColor?: string;
    ambientLight?: string;
    directionalLeftLight?: string;
    directionalTopLight?: string;
    pointLight?: string;
    arcTime?: number;
    arcLength?: number;
    rings?: number;
    maxRings?: number;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
};

type WorldProps = {
    globeConfig: GlobeConfig;
    data: Position[];
};

const RING_PROPAGATION_SPEED = 3;
const aspect = 1.2;
const cameraZ = 300;

export type { Position, GlobeConfig };

function GlobeMesh({ globeConfig, data }: WorldProps) {
    const groupRef = useRef<Mesh | null>(null);
    const globeRef = useRef<ThreeGlobe | null>(null);

    const defaultProps: Required<GlobeConfig> = {
        pointSize: 1,
        atmosphereColor: '#10C0E0',
        showAtmosphere: true,
        atmosphereAltitude: 0.1,
        polygonColor: 'rgba(255,255,255,0.7)',
        globeColor: '#062a5a',
        emissive: '#062a5a',
        emissiveIntensity: 0.1,
        shininess: 0.9,
        arcTime: 2000,
        arcLength: 0.9,
        rings: 1,
        maxRings: 3,
        ambientLight: '#3a8bd8',
        directionalLeftLight: '#ffffff',
        directionalTopLight: '#ffffff',
        pointLight: '#ffffff',
        autoRotate: true,
        autoRotateSpeed: 0.5,
        ...globeConfig,
    };

    const _buildData = useMemo(() => {
        const points = data.flatMap((arc) => [
            { lat: arc.startLat, lng: arc.startLng, color: arc.color },
            { lat: arc.endLat, lng: arc.endLng, color: arc.color },
        ]);
        const seen = new Set<string>();
        return points.filter((p) => {
            const key = `${p.lat},${p.lng}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [data]);

    useEffect(() => {
        if (!groupRef.current) return;

        if (!globeRef.current) {
            globeRef.current = new ThreeGlobe();
            groupRef.current.add(globeRef.current);
        }

        const globe = globeRef.current;
        const material = globe.globeMaterial() as unknown as {
            color: Color;
            emissive: Color;
            emissiveIntensity: number;
            shininess: number;
        };
        material.color = new Color(defaultProps.globeColor);
        material.emissive = new Color(defaultProps.emissive);
        material.emissiveIntensity = defaultProps.emissiveIntensity;
        material.shininess = defaultProps.shininess;

        globe
            .showAtmosphere(defaultProps.showAtmosphere)
            .atmosphereColor(defaultProps.atmosphereColor)
            .atmosphereAltitude(defaultProps.atmosphereAltitude)
            .hexPolygonResolution(3)
            .hexPolygonMargin(0.7)
            .hexPolygonColor(() => defaultProps.polygonColor);

        // Lazy-load country polygons. File served from /public so we don't
        // depend on an external CDN (the unpkg path varied across versions).
        fetch('/globe-countries.geojson')
            .then((r) => r.json())
            .then((countries: { features: unknown[] }) => {
                if (!globeRef.current) return;
                globeRef.current.hexPolygonsData(countries.features);
            })
            .catch(() => undefined);
    }, [
        defaultProps.atmosphereAltitude,
        defaultProps.atmosphereColor,
        defaultProps.emissive,
        defaultProps.emissiveIntensity,
        defaultProps.globeColor,
        defaultProps.polygonColor,
        defaultProps.shininess,
        defaultProps.showAtmosphere,
    ]);

    useEffect(() => {
        if (!globeRef.current) return;
        const globe = globeRef.current;

        globe
            .arcsData(data)
            .arcStartLat((d) => (d as Position).startLat)
            .arcStartLng((d) => (d as Position).startLng)
            .arcEndLat((d) => (d as Position).endLat)
            .arcEndLng((d) => (d as Position).endLng)
            .arcColor((d) => (d as Position).color)
            .arcAltitude((d) => (d as Position).arcAlt)
            .arcStroke(() => [0.32, 0.28, 0.3][Math.floor(Math.random() * 3)])
            .arcDashLength(defaultProps.arcLength)
            .arcDashInitialGap((d) => (d as Position).order * 1)
            .arcDashGap(15)
            .arcDashAnimateTime(() => defaultProps.arcTime);

        globe
            .pointsData(_buildData)
            .pointColor((d) => (d as { color: string }).color)
            .pointsMerge(true)
            .pointAltitude(0.0)
            .pointRadius(2);

        globe
            .ringsData([])
            .ringColor(() => defaultProps.polygonColor)
            .ringMaxRadius(defaultProps.maxRings)
            .ringPropagationSpeed(RING_PROPAGATION_SPEED)
            .ringRepeatPeriod((defaultProps.arcTime * defaultProps.arcLength) / defaultProps.rings);
    }, [_buildData, data, defaultProps.arcLength, defaultProps.arcTime, defaultProps.maxRings, defaultProps.polygonColor, defaultProps.rings]);

    // Periodically pulse rings on a random subset of points.
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (!globeRef.current) return;
            const numbersOfRings = Math.floor(Math.random() * 1.5 * _buildData.length);
            const rings = _buildData
                .filter((_, i) => Array.from({ length: numbersOfRings }, () => Math.floor(Math.random() * _buildData.length)).includes(i))
                .slice(0, 5);
            globeRef.current.ringsData(rings);
        }, 2000);
        return () => window.clearInterval(interval);
    }, [_buildData]);

    useFrame(() => {
        if (groupRef.current && defaultProps.autoRotate) {
            groupRef.current.rotation.y += (defaultProps.autoRotateSpeed * Math.PI) / 180 / 60;
        }
    });

    return <mesh ref={groupRef} />;
}

function WebGLRendererConfig() {
    const { gl, size } = useThree();
    useEffect(() => {
        gl.setPixelRatio(window.devicePixelRatio);
        gl.setSize(size.width, size.height);
        gl.setClearColor(0xffaaff, 0);
    }, [gl, size]);
    return null;
}

export function World({ globeConfig, data }: WorldProps) {
    const scene = useMemo(() => {
        const s = new Scene();
        s.fog = new Fog(0xffffff, 400, 2000);
        return s;
    }, []);

    const camera = useMemo(() => new PerspectiveCamera(50, aspect, 180, 1800), []);

    return (
        <Canvas scene={scene} camera={camera}>
            <WebGLRendererConfig />
            <ambientLight color={globeConfig.ambientLight ?? '#3a8bd8'} intensity={0.6} />
            <directionalLight color={globeConfig.directionalLeftLight ?? '#ffffff'} position={new Vector3(-400, 100, 400)} />
            <directionalLight color={globeConfig.directionalTopLight ?? '#ffffff'} position={new Vector3(-200, 500, 200)} />
            <pointLight color={globeConfig.pointLight ?? '#ffffff'} position={new Vector3(-200, 500, 200)} intensity={0.8} />
            <GlobeMesh globeConfig={globeConfig} data={data} />
        </Canvas>
    );
}

void PointLight;
void AmbientLight;
void DirectionalLight;
