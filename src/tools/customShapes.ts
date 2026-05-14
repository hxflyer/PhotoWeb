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

export interface CustomShapeGroup {
    id: string;
    name: string;
    shapes: CustomShape[];
    user?: boolean;
}

interface StoredCustomShapeGroup {
    id: string;
    name: string;
    shapes: CustomShape[];
}

export interface CustomShapeSetPayload {
    version: 1;
    kind: 'photoweb-custom-shape-set';
    group: StoredCustomShapeGroup;
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

const ARROW_RIGHT = 'M6,42 L58,42 L58,24 L94,50 L58,76 L58,58 L6,58 Z';
const BANNER_RIBBON = 'M8,18 L92,18 L82,50 L92,82 L8,82 L18,50 Z M22,30 L78,30 L78,70 L22,70 Z';
const BADGE = 'M50,4 L62,24 L86,20 L78,44 L96,60 L72,66 L70,92 L50,76 L30,92 L28,66 L4,60 L22,44 L14,20 L38,24 Z';
const PAW_PRINT = 'M34,48 C24,48 18,58 18,68 C18,80 30,88 50,88 C70,88 82,80 82,68 C82,58 76,48 66,48 C58,48 56,56 50,56 C44,56 42,48 34,48 Z M23,18 C16,18 12,25 12,34 C12,42 17,48 24,48 C31,48 35,41 35,32 C35,24 30,18 23,18 Z M50,10 C42,10 38,18 38,28 C38,38 43,45 50,45 C57,45 62,38 62,28 C62,18 58,10 50,10 Z M77,18 C70,18 65,24 65,32 C65,41 69,48 76,48 C83,48 88,42 88,34 C88,25 84,18 77,18 Z';
const FISH = 'M8,50 C24,22 62,22 82,50 C62,78 24,78 8,50 Z M82,50 L96,34 L96,66 Z M28,44 A5,5 0 1,1 27.99,44 Z';

const GROUPS: CustomShapeGroup[] = [
    {
        id: 'basics',
        name: 'Default Shapes',
        shapes: [
            { id: 'heart', name: 'Heart', pathD: HEART },
            { id: 'star-5pt', name: '5-Point Star', pathD: STAR_5 },
            { id: 'star-7pt', name: '7-Point Star', pathD: STAR_7 },
            { id: 'lightning-bolt', name: 'Lightning Bolt', pathD: LIGHTNING_BOLT },
            { id: 'speech-bubble', name: 'Speech Bubble', pathD: SPEECH_BUBBLE },
            { id: 'gear', name: 'Gear', pathD: GEAR },
            { id: 'checkmark', name: 'Checkmark', pathD: CHECKMARK },
        ],
    },
    {
        id: 'arrows',
        name: 'Arrows',
        shapes: [
            { id: 'arrow-down-circle', name: 'Down Arrow Circle', pathD: ARROW_DOWN_CIRCLE },
            { id: 'arrow-right', name: 'Right Arrow', pathD: ARROW_RIGHT },
        ],
    },
    {
        id: 'banners',
        name: 'Banners',
        shapes: [
            { id: 'banner-ribbon', name: 'Ribbon Banner', pathD: BANNER_RIBBON },
            { id: 'badge', name: 'Badge', pathD: BADGE },
        ],
    },
    {
        id: 'animals',
        name: 'Animals',
        shapes: [
            { id: 'paw-print', name: 'Paw Print', pathD: PAW_PRINT },
            { id: 'fish', name: 'Fish', pathD: FISH },
        ],
    },
];

const USER_GROUPS_KEY = 'photoweb:custom-shape-groups:v1';

function cloneShape(shape: CustomShape): CustomShape {
    return { ...shape };
}

function loadUserGroups(): StoredCustomShapeGroup[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(USER_GROUPS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as StoredCustomShapeGroup[];
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(group => group && typeof group.id === 'string' && Array.isArray(group.shapes));
    } catch {
        return [];
    }
}

let userGroups: StoredCustomShapeGroup[] = loadUserGroups();

function persistUserGroups(): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(USER_GROUPS_KEY, JSON.stringify(userGroups));
    } catch {
        // Browser storage can be disabled or full; the in-memory list still works for this session.
    }
}

function allGroups(): CustomShapeGroup[] {
    return [
        ...GROUPS,
        ...userGroups.map(group => ({ ...group, user: true })),
    ];
}

function allShapes(): CustomShape[] {
    return allGroups().flatMap(group => group.shapes);
}

function slugify(value: string): string {
    const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return slug || 'shape';
}

export function getCustomShapeLibrary(): CustomShape[] {
    return allShapes().map(cloneShape);
}

export function getCustomShapeGroups(): CustomShapeGroup[] {
    return allGroups().map(group => ({
        ...group,
        shapes: group.shapes.map(cloneShape),
    }));
}

export function getCustomShapeById(id: string): CustomShape | null {
    return allShapes().find(s => s.id === id) ?? null;
}

export function addUserCustomShape(name: string, pathD: string, groupName = 'Custom Shapes'): CustomShape {
    const cleanName = name.trim() || 'Custom Shape';
    let group = userGroups.find(item => item.name === groupName);
    if (!group) {
        group = { id: `user-${slugify(groupName)}`, name: groupName, shapes: [] };
        userGroups = [...userGroups, group];
    }
    const idBase = `user-${slugify(cleanName)}`;
    let id = idBase;
    let suffix = 2;
    const existingIds = new Set(allShapes().map(shape => shape.id));
    while (existingIds.has(id)) id = `${idBase}-${suffix++}`;
    const shape = { id, name: cleanName, pathD };
    group.shapes = [...group.shapes, shape];
    persistUserGroups();
    return cloneShape(shape);
}

export function resetUserCustomShapes(): void {
    userGroups = [];
    persistUserGroups();
}

export function exportCustomShapeSet(groupId: string): string | null {
    const group = allGroups().find(item => item.id === groupId);
    if (!group) return null;
    const payload: CustomShapeSetPayload = {
        version: 1,
        kind: 'photoweb-custom-shape-set',
        group: {
            id: group.user ? group.id : `user-${group.id}`,
            name: group.name,
            shapes: group.shapes.map(cloneShape),
        },
    };
    return JSON.stringify(payload);
}

export function importCustomShapeSet(serialized: string): CustomShapeGroup | null {
    try {
        const payload = JSON.parse(serialized) as CustomShapeSetPayload;
        if (payload.kind !== 'photoweb-custom-shape-set' || !payload.group || !Array.isArray(payload.group.shapes)) return null;
        const baseName = payload.group.name?.trim() || 'Imported Shapes';
        const group: StoredCustomShapeGroup = {
            id: `user-${slugify(baseName)}`,
            name: baseName,
            shapes: payload.group.shapes
                .filter(shape => shape && typeof shape.name === 'string' && typeof shape.pathD === 'string')
                .map(shape => ({ id: `user-${slugify(shape.name)}`, name: shape.name, pathD: shape.pathD })),
        };
        if (group.shapes.length === 0) return null;
        const existingGroupIds = new Set(userGroups.map(item => item.id));
        let nextGroupId = group.id;
        let groupSuffix = 2;
        while (existingGroupIds.has(nextGroupId)) nextGroupId = `${group.id}-${groupSuffix++}`;
        group.id = nextGroupId;
        const existingShapeIds = new Set(allShapes().map(shape => shape.id));
        group.shapes = group.shapes.map(shape => {
            let id = shape.id;
            let suffix = 2;
            while (existingShapeIds.has(id)) id = `${shape.id}-${suffix++}`;
            existingShapeIds.add(id);
            return { ...shape, id };
        });
        userGroups = [...userGroups, group];
        persistUserGroups();
        return { ...group, user: true, shapes: group.shapes.map(cloneShape) };
    } catch {
        return null;
    }
}

export const CUSTOM_SHAPE_VIEWBOX = 100;
