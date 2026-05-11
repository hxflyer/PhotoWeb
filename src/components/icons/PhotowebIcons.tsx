import type { SVGProps } from 'react';

export type PhotowebIconProps = SVGProps<SVGSVGElement> & {
    size?: number;
    strokeWidth?: number;
};

function IconBase({
    size = 16,
    strokeWidth = 2,
    children,
    ...props
}: PhotowebIconProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            {children}
        </svg>
    );
}

export function SelectionNewIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
        </IconBase>
    );
}

export function SelectionAddIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="5" y="8" width="10" height="10" rx="1.5" />
            <path d="M15 5v6" />
            <path d="M12 8h6" />
        </IconBase>
    );
}

export function SelectionSubtractIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="5" y="8" width="10" height="10" rx="1.5" />
            <path d="M12 8h6" />
        </IconBase>
    );
}

export function SelectionIntersectIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="5" y="5" width="10" height="10" rx="1.5" />
            <rect x="9" y="9" width="10" height="10" rx="1.5" />
            <path d="M9 9h6v6H9z" />
        </IconBase>
    );
}

export function ShapeCombineIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <circle cx="10" cy="12" r="5" />
            <circle cx="14" cy="12" r="5" />
            <path d="M12 9v6" />
            <path d="M9 12h6" />
        </IconBase>
    );
}

export function ShapeSubtractIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <circle cx="10" cy="12" r="5" />
            <circle cx="14" cy="12" r="5" />
            <path d="M9 12h6" />
        </IconBase>
    );
}

export function ShapeIntersectIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <circle cx="10" cy="12" r="5" />
            <circle cx="14" cy="12" r="5" />
            <path d="M12 8.1a5 5 0 0 1 0 7.8" />
        </IconBase>
    );
}

export function ShapeExcludeIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <circle cx="10" cy="12" r="5" />
            <circle cx="14" cy="12" r="5" />
            <path d="M10.5 8.6a5 5 0 0 1 0 6.8" />
            <path d="M13.5 8.6a5 5 0 0 0 0 6.8" />
        </IconBase>
    );
}

export function QuickMaskIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="4" y="5" width="16" height="14" rx="2" />
            <circle cx="12" cy="12" r="4" />
            <path d="M8 19h8" />
        </IconBase>
    );
}

export function DefaultColorsIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="5" y="11" width="8" height="8" rx="1" />
            <rect x="11" y="5" width="8" height="8" rx="1" />
        </IconBase>
    );
}

export function ToolbarMarqueeIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="5" y="5" width="14" height="14" rx="1" strokeDasharray="3 2" />
        </IconBase>
    );
}

export function ToolbarQuickSelectionIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="4.5" y="4.5" width="11" height="11" rx="1" strokeDasharray="2 2" />
            <path d="M12 11l7 4-3.1 1.1 1.7 3.2-2 1.1-1.7-3.3-2.4 2z" />
        </IconBase>
    );
}

export function ToolbarGradientIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <rect x="4" y="6" width="16" height="12" rx="1.5" />
            <path d="M8 6v12" />
            <path d="M12 6v12" />
            <path d="M16 6v12" />
        </IconBase>
    );
}

export function ToolbarDodgeIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <circle cx="14.5" cy="6.5" r="3" />
            <path d="M12.4 8.6L5 16" />
            <path d="M4 20l3.5-1 1-3.5" />
        </IconBase>
    );
}

export function ToolbarBurnIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M7 18c-1.2-2-.6-4.5 1.5-6.2" />
            <path d="M9 14V7.5a1.5 1.5 0 0 1 3 0V12" />
            <path d="M12 12V6.5a1.5 1.5 0 0 1 3 0V13" />
            <path d="M15 13V8.5a1.5 1.5 0 0 1 3 0V15c0 3.5-2.3 5-5.2 5H11c-1.8 0-3.1-.7-4-2" />
            <path d="M7.5 12.5l-2-2" />
        </IconBase>
    );
}

export function ToolbarSpongeIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M7.5 7.5c2.6-2.6 7.1-2.5 9.3.2 2 2.4 1.6 6.2-.8 8.6-2.7 2.7-7.2 2.6-9.4-.1-2-2.4-1.6-6.2.9-8.7z" />
            <circle cx="10" cy="10" r=".8" />
            <circle cx="14" cy="9.5" r=".8" />
            <circle cx="12" cy="14" r=".8" />
            <circle cx="16" cy="13" r=".8" />
        </IconBase>
    );
}

export function GradientLinearIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 12h14" />
            <path d="M15 8l4 4-4 4" />
            <path d="M5 8v8" />
        </IconBase>
    );
}

export function GradientRadialIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="7" />
        </IconBase>
    );
}

export function GradientAngleIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M12 12V5" />
            <path d="M12 12l6 4" />
            <path d="M12 12a7 7 0 0 1 6 4" />
        </IconBase>
    );
}

export function GradientReflectedIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M12 5v14" />
            <path d="M5 12h14" />
            <path d="M8 9l-3 3 3 3" />
            <path d="M16 9l3 3-3 3" />
        </IconBase>
    );
}

export function GradientDiamondIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M12 4l8 8-8 8-8-8z" />
            <path d="M12 8l4 4-4 4-4-4z" />
        </IconBase>
    );
}

export function WarpTextIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M7 7h10" />
            <path d="M12 7v10" />
            <path d="M9 17h6" />
            <path d="M5 13c2-2 4 2 6 0s4 2 8 0" />
        </IconBase>
    );
}

export function FontSizeIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M8 6h8" />
            <path d="M12 6v12" />
            <path d="M9 18h6" />
            <path d="M18 7v10" />
            <path d="M16 9l2-2 2 2" />
            <path d="M16 15l2 2 2-2" />
        </IconBase>
    );
}

export function LeadingIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M7 6h8" />
            <path d="M7 12h8" />
            <path d="M7 18h8" />
            <path d="M19 6v12" />
            <path d="M17 8l2-2 2 2" />
            <path d="M17 16l2 2 2-2" />
        </IconBase>
    );
}

export function VerticalScaleIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M8 8h8" />
            <path d="M12 8v8" />
            <path d="M9 16h6" />
            <path d="M5 5v14" />
            <path d="M3 7l2-2 2 2" />
            <path d="M3 17l2 2 2-2" />
        </IconBase>
    );
}

export function HorizontalScaleIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M8 8h8" />
            <path d="M12 8v8" />
            <path d="M9 16h6" />
            <path d="M4 20h16" />
            <path d="M6 18l-2 2 2 2" />
            <path d="M18 18l2 2-2 2" />
        </IconBase>
    );
}

export function BaselineShiftIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 17l4-10 4 10" />
            <path d="M6.5 13h5" />
            <path d="M15 6v12" />
            <path d="M13 8l2-2 2 2" />
            <path d="M13 16l2 2 2-2" />
            <path d="M4 19h16" />
        </IconBase>
    );
}

export function KerningIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M4 6l4 12 4-12" />
            <path d="M14 18l3-12 3 12" />
            <path d="M15 14h4" />
            <path d="M11 8l2 2" />
        </IconBase>
    );
}

export function TrackingIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M4 16l3-9 3 9" />
            <path d="M5.4 13h3.2" />
            <path d="M14 7l3 9 3-9" />
            <path d="M4 20h16" />
            <path d="M6 18l-2 2 2 2" />
            <path d="M18 18l2 2-2 2" />
        </IconBase>
    );
}

export function TextColorIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 17l5-12 5 12" />
            <path d="M7 13h6" />
            <path d="M17 6v11" />
            <path d="M15 8l2-2 2 2" />
            <path d="M4 20h16" />
        </IconBase>
    );
}

export function FauxBoldIcon(props: PhotowebIconProps) {
    return (
        <IconBase strokeWidth={2.4} {...props}>
            <path d="M5 6h14" />
            <path d="M12 6v13" />
            <path d="M8 19h8" />
        </IconBase>
    );
}

export function FauxItalicIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M10 6h9" />
            <path d="M14 6l-4 13" />
            <path d="M6 19h9" />
        </IconBase>
    );
}

export function AllCapsIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M3 17l4-11 4 11" />
            <path d="M5 13h4" />
            <path d="M13 17l4-11 4 11" />
            <path d="M15 13h4" />
        </IconBase>
    );
}

export function SmallCapsIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M4 17l4-11 4 11" />
            <path d="M6 13h4" />
            <path d="M14 17l2.5-7 2.5 7" />
            <path d="M15 14h3" />
        </IconBase>
    );
}

export function SuperscriptIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 8h8" />
            <path d="M9 8v11" />
            <path d="M6 19h6" />
            <path d="M16 5h3" />
            <path d="M18.5 5v6" />
            <path d="M16.5 11h4" />
        </IconBase>
    );
}

export function SubscriptIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 6h8" />
            <path d="M9 6v11" />
            <path d="M6 17h6" />
            <path d="M16 13h3" />
            <path d="M18.5 13v6" />
            <path d="M16.5 19h4" />
        </IconBase>
    );
}

export function UnderlineTextIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M6 6h12" />
            <path d="M12 6v10" />
            <path d="M8 16h8" />
            <path d="M6 20h12" />
        </IconBase>
    );
}

export function StrikethroughTextIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M6 6h12" />
            <path d="M12 6v12" />
            <path d="M8 18h8" />
            <path d="M5 12h14" />
        </IconBase>
    );
}

export function LigatureIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M8 19V8a4 4 0 0 1 4-4" />
            <path d="M5 11h8" />
            <path d="M15 11v8" />
            <path d="M15 7h.01" />
            <path d="M11 4c4 0 6 3 6 7" />
        </IconBase>
    );
}

export function AlternateGlyphIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M6 17c0-5 3-10 8-10 3 0 5 2 5 5s-2 5-5 5c-3 0-5-2-5-5" />
            <path d="M5 19c5 0 9-3 12-8" />
        </IconBase>
    );
}

export function ContextualAlternatesIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 16c1.5 2 6 2 6-1 0-4-6-1-6-5 0-3 4-3 6-1" />
            <path d="M15 6v11" />
            <path d="M12 9h7" />
            <path d="M15 17c0 2 3 2 4 1" />
        </IconBase>
    );
}

export function SwashIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 18l6-12 5 12" />
            <path d="M8 14h6" />
            <path d="M4 18c5 3 11 3 16-2" />
        </IconBase>
    );
}

export function StylisticAlternatesIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M5 16c0-3 2-5 5-5h2v7" />
            <path d="M12 13c-4 0-6 1-6 3 0 1.5 1.5 2 3 2s3-.7 3-2" />
            <path d="M16 8h4" />
            <path d="M18 6l2 2-2 2" />
        </IconBase>
    );
}

export function TitlingAlternatesIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M7 6h12" />
            <path d="M13 6l-3 13" />
            <path d="M6 19h10" />
            <path d="M18 9c1.5 2 1 5-1 7" />
        </IconBase>
    );
}

export function OrdinalsIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M6 7l3-2v14" />
            <path d="M14 9c.7-1 3-1 3 1 0 2-3 1-3 3 0 1.5 2 2 4 1" />
            <path d="M19 8v7" />
            <path d="M17 10h4" />
        </IconBase>
    );
}

export function FractionsIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M6 7l3-2v7" />
            <path d="M18 5L6 19" />
            <path d="M14 14c0-2 4-2 4 0 0 1-1 2-4 5h5" />
        </IconBase>
    );
}

export function AntiAliasIcon(props: PhotowebIconProps) {
    return (
        <IconBase {...props}>
            <path d="M4 17c0-3 2-5 5-5h2v7" />
            <path d="M11 14c-4 0-6 1-6 3 0 1.5 1.5 2 3 2s3-.7 3-2" />
            <path d="M15 17c0-3 1.8-5 4-5h1v7" />
            <path d="M20 15c-3 0-4.5 1-4.5 2.5 0 1 1 1.5 2.2 1.5 1.3 0 2.3-.6 2.3-2" />
        </IconBase>
    );
}
