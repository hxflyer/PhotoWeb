/**
 * Built-in Custom Shape preset library. Each shape is defined as an SVG path
 * data string inside a 100x100 coordinate box; the renderer scales/translates
 * the path to the drawn bounds via Path2D + transforms.
 */

export interface CustomShape {
    id: string;
    name: string;
    pathD: string;
}

const HEART = 'M50,86 C20,66 6,46 6,28 C6,16 14,8 26,8 C36,8 44,14 50,24 C56,14 64,8 74,8 C86,8 94,16 94,28 C94,46 80,66 50,86 Z';

const STAR_5 = (() => {
    const cx = 50, cy = 50, R = 46, r = R * 0.4;
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rad = i % 2 === 0 ? R : r;
        const x = cx + rad * Math.cos(a);
        const y = cy + rad * Math.sin(a);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(' ') + ' Z';
})();

const STAR_7 = (() => {
    const cx = 50, cy = 50, R = 46, r = R * 0.45;
    const pts: string[] = [];
    for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 7;
        const rad = i % 2 === 0 ? R : r;
        const x = cx + rad * Math.cos(a);
        const y = cy + rad * Math.sin(a);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(' ') + ' Z';
})();

const ARROW_DOWN_CIRCLE =
    'M50,4 A46,46 0 1,1 49.99,4 Z ' +
    'M40,28 L60,28 L60,54 L72,54 L50,76 L28,54 L40,54 Z';

const LIGHTNING_BOLT = 'M58,4 L18,54 L42,54 L34,96 L82,40 L56,40 L70,4 Z';

const SPEECH_BUBBLE =
    'M10,18 C10,10 16,4 24,4 L76,4 C84,4 90,10 90,18 L90,58 C90,66 84,72 76,72 L46,72 L26,92 L30,72 L24,72 C16,72 10,66 10,58 Z';

const GEAR = (() => {
    const cx = 50, cy = 50;
    const teeth = 8;
    const outer = 46, inner = 36, hole = 16;
    const halfTooth = Math.PI / (teeth * 2);
    const pts: string[] = [];
    for (let i = 0; i < teeth; i++) {
        const a0 = (i * 2 * Math.PI) / teeth - halfTooth;
        const a1 = (i * 2 * Math.PI) / teeth + halfTooth;
        const a2 = ((i + 1) * 2 * Math.PI) / teeth - halfTooth;
        pts.push(`${(cx + outer * Math.cos(a0)).toFixed(2)},${(cy + outer * Math.sin(a0)).toFixed(2)}`);
        pts.push(`${(cx + outer * Math.cos(a1)).toFixed(2)},${(cy + outer * Math.sin(a1)).toFixed(2)}`);
        pts.push(`${(cx + inner * Math.cos(a1)).toFixed(2)},${(cy + inner * Math.sin(a1)).toFixed(2)}`);
        pts.push(`${(cx + inner * Math.cos(a2)).toFixed(2)},${(cy + inner * Math.sin(a2)).toFixed(2)}`);
    }
    const outline = `M${pts[0]} ` + pts.slice(1).map(p => `L${p}`).join(' ') + ' Z';
    const holeCircle =
        `M${cx - hole},${cy} ` +
        `A${hole},${hole} 0 1,0 ${cx + hole},${cy} ` +
        `A${hole},${hole} 0 1,0 ${cx - hole},${cy} Z`;
    return `${outline} ${holeCircle}`;
})();

const CHECKMARK = 'M14,52 L38,76 L86,20 L74,12 L38,54 L22,40 Z';

const LIBRARY: CustomShape[] = [
    { id: 'heart', name: 'Heart', pathD: HEART },
    { id: 'star-5pt', name: '5-Point Star', pathD: STAR_5 },
    { id: 'star-7pt', name: '7-Point Star', pathD: STAR_7 },
    { id: 'arrow-down-circle', name: 'Down Arrow Circle', pathD: ARROW_DOWN_CIRCLE },
    { id: 'lightning-bolt', name: 'Lightning Bolt', pathD: LIGHTNING_BOLT },
    { id: 'speech-bubble', name: 'Speech Bubble', pathD: SPEECH_BUBBLE },
    { id: 'gear', name: 'Gear', pathD: GEAR },
    { id: 'checkmark', name: 'Checkmark', pathD: CHECKMARK },
];

export function getCustomShapeLibrary(): CustomShape[] {
    return LIBRARY.map(s => ({ ...s }));
}

export function getCustomShapeById(id: string): CustomShape | null {
    return LIBRARY.find(s => s.id === id) ?? null;
}

export const CUSTOM_SHAPE_VIEWBOX = 100;
