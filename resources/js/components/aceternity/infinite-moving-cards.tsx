import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Direction = 'left' | 'right';
type Speed = 'fast' | 'normal' | 'slow';

type InfiniteMovingCardsProps = {
    items: ReactNode[];
    direction?: Direction;
    speed?: Speed;
    pauseOnHover?: boolean;
    className?: string;
};

/**
 * Smooth horizontal infinite scroll. Items get duplicated on mount so the
 * loop seam stays invisible. Animation runs as CSS scroll/translate driven
 * by custom properties so we can pause on hover via `[animation-play-state]`.
 */
export function InfiniteMovingCards({
    items,
    direction = 'left',
    speed = 'normal',
    pauseOnHover = true,
    className,
}: InfiniteMovingCardsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLUListElement>(null);
    const [start, setStart] = useState(false);

    useEffect(() => {
        if (!containerRef.current || !scrollerRef.current) return;

        const scroller = scrollerRef.current;
        const original = Array.from(scroller.children);
        original.forEach((child) => {
            const clone = child.cloneNode(true);
            scroller.appendChild(clone);
        });

        containerRef.current.style.setProperty(
            '--animation-direction',
            direction === 'left' ? 'forwards' : 'reverse',
        );
        const duration = speed === 'fast' ? '20s' : speed === 'slow' ? '80s' : '40s';
        containerRef.current.style.setProperty('--animation-duration', duration);

        setStart(true);
    }, [direction, speed]);

    return (
        <div
            ref={containerRef}
            className={cn(
                'scroller relative z-20 max-w-7xl overflow-hidden',
                '[mask-image:linear-gradient(to_right,transparent,white_8%,white_92%,transparent)]',
                className,
            )}
        >
            <ul
                ref={scrollerRef}
                className={cn(
                    'flex w-max min-w-full shrink-0 flex-nowrap gap-3 py-3',
                    start && 'animate-[scroll_var(--animation-duration,40s)_linear_infinite_var(--animation-direction,forwards)]',
                    pauseOnHover && 'hover:[animation-play-state:paused]',
                )}
            >
                {items.map((item, idx) => (
                    <li key={idx} className="shrink-0">
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
