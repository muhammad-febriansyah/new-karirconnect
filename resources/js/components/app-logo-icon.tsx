import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M20 16h7v14.5l11-14.5h8.5L34.5 31.5 47.5 48H38.5L27 33v15h-7V16z"
            />
        </svg>
    );
}
