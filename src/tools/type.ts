import type { Tool, ToolPointerEvent } from './Tool';
import { registerTool } from './registry';
import type { TextStyle } from '../components/Canvas/TextEditOverlay';

export type TypeOrientation = 'horizontal' | 'vertical';

export interface TypeLayerData {
    id: string;
    text: string;
    style: TextStyle;
    orientation: TypeOrientation;
    transform: { x: number; y: number; width: number; height: number; rotation: number };
}

interface TypeToolState {
    editing: TypeLayerData | null;
    onCommit: ((data: TypeLayerData) => void) | null;
    onCancel: (() => void) | null;
}

export const typeToolState: TypeToolState = { editing: null, onCommit: null, onCancel: null };

export function bindTypeOverlayHandlers(commit: (data: TypeLayerData) => void, cancel: () => void): void {
    typeToolState.onCommit = commit;
    typeToolState.onCancel = cancel;
}

const typeListeners = new Set<() => void>();
export function subscribeTypeTool(fn: () => void): () => void {
    typeListeners.add(fn);
    return () => { typeListeners.delete(fn); };
}
function notifyTypeChange(): void {
    typeListeners.forEach(fn => fn());
}
export function setEditingType(data: TypeLayerData | null): void {
    typeToolState.editing = data;
    notifyTypeChange();
}
export function commitEditingType(text: string): void {
    if (!typeToolState.editing) return;
    const out: TypeLayerData = { ...typeToolState.editing, text };
    typeToolState.onCommit?.(out);
    typeToolState.editing = null;
    notifyTypeChange();
}
export function cancelEditingType(): void {
    typeToolState.onCancel?.();
    typeToolState.editing = null;
    notifyTypeChange();
}

export const defaultTextStyle: TextStyle = {
    fontFamily: 'system-ui',
    fontSize: 32,
    fontWeight: 400,
    fontStyle: 'normal',
    color: '#000000',
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: 'left',
};

function p(e: ToolPointerEvent) { return { x: e.canvasX, y: e.canvasY }; }

function makeTypeTool(id: string, label: string, orientation: TypeOrientation): Tool {
    return {
        id,
        label,
        cursor: 'text',
        onPointerDown: (e, ctx) => {
            if (e.button !== 0) return;
            const point = p(e);
            const store = ctx.getStore();
            setEditingType({
                id: crypto.randomUUID(),
                text: '',
                style: { ...defaultTextStyle, color: store.primaryColor },
                orientation,
                transform: {
                    x: point.x,
                    y: point.y - defaultTextStyle.fontSize,
                    width: 280,
                    height: defaultTextStyle.fontSize * 2,
                    rotation: 0,
                },
            });
        },
        onKeyDown: (e) => {
            if (e.key === 'Escape') cancelEditingType();
        },
    };
}

export const horizontalTypeTool = makeTypeTool('type-horizontal', 'Horizontal Type', 'horizontal');
export const verticalTypeTool = makeTypeTool('type-vertical', 'Vertical Type', 'vertical');

registerTool(horizontalTypeTool);
registerTool(verticalTypeTool);

export function commitTypeLayer(layerCanvas: HTMLCanvasElement, data: TypeLayerData): void {
    const ctx = layerCanvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.translate(data.transform.x, data.transform.y);
    ctx.rotate(data.transform.rotation);
    ctx.font = `${data.style.fontStyle} ${data.style.fontWeight} ${data.style.fontSize}px ${data.style.fontFamily}`;
    ctx.fillStyle = data.style.color;
    ctx.textBaseline = 'top';
    if (data.orientation === 'horizontal') {
        const lines = data.text.split('\n');
        lines.forEach((line, i) => {
            ctx.fillText(line, 0, i * data.style.fontSize * data.style.lineHeight);
        });
    } else {
        // Vertical type: stack characters
        const lines = data.text.split('\n');
        lines.forEach((line, lineIdx) => {
            line.split('').forEach((ch, i) => {
                ctx.fillText(ch, lineIdx * data.style.fontSize * 1.2, i * data.style.fontSize * data.style.lineHeight);
            });
        });
    }
    ctx.restore();
}
