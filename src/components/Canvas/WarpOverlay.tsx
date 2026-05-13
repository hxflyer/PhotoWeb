/**
 * WarpOverlay — Photoshop-style destructive Warp preview for raster content.
 * It supports preset/custom grids, split lines, point selection, reset,
 * Enter/Esc, and live preview against the active layer snapshot.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, RotateCcw, X as XIcon } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { applyMeshWarp, warpPresetControlPoints, type WarpControlPoint, type WarpPreset } from '../../core/imageTransforms';

const PRESETS: WarpPreset[] = [
    'none', 'arc', 'arch', 'bulge', 'shell-lower', 'shell-upper',
    'flag', 'wave', 'fish', 'fisheye', 'inflate', 'squeeze',
];

const PRESET_LABELS: Record<WarpPreset, string> = {
    none: 'None',
    arc: 'Arc',
    arch: 'Arch',
    bulge: 'Bulge',
    'shell-lower': 'Shell Lower',
    'shell-upper': 'Shell Upper',
    flag: 'Flag',
    wave: 'Wave',
    fish: 'Fish',
    fisheye: 'Fisheye',
    inflate: 'Inflate',
    squeeze: 'Squeeze',
};

type GridMode = 'default' | '3x3' | '4x4' | '5x5' | 'custom';
type SplitMode = 'none' | 'cross' | 'vertical' | 'horizontal';
type DragState =
    | { type: 'point'; idx: number; selected: number[]; startX: number; startY: number; points: WarpControlPoint[] }
    | { type: 'selection-move'; selected: number[]; startX: number; startY: number; points: WarpControlPoint[] }
    | { type: 'selection-scale'; selected: number[]; startX: number; startY: number; points: WarpControlPoint[]; box: SelectionBox }
    | { type: 'selection-rotate'; selected: number[]; startX: number; startY: number; points: WarpControlPoint[]; box: SelectionBox; startAngle: number }
    | { type: 'marquee'; startX: number; startY: number; currentX: number; currentY: number };

export interface WarpState {
    layerId: string;
    snapshot: ImageData;
    source: ImageData;
    sourceX: number;
    sourceY: number;
}

interface Props {
    state: WarpState;
    zoom: number;
    panX: number;
    panY: number;
    onCommit: () => void;
    onCancel: () => void;
}

interface SelectionBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    cx: number;
    cy: number;
}

function clonePoints(points: WarpControlPoint[]): WarpControlPoint[] {
    return points.map(p => ({ x: p.x, y: p.y }));
}

function imageDataToCanvas(image: ImageData): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = image.width;
    c.height = image.height;
    c.getContext('2d')!.putImageData(image, 0, 0);
    return c;
}

function clampUnit(value: number): number {
    return Math.max(0.02, Math.min(0.98, value));
}

function pointsForGrid(preset: WarpPreset, source: ImageData, cols: number, rows: number): WarpControlPoint[] {
    return warpPresetControlPoints(preset, source.width, source.height, cols, rows);
}

function cellCountForMode(mode: GridMode, customCols: number, customRows: number): { cols: number; rows: number } {
    if (mode === '3x3') return { cols: 4, rows: 4 };
    if (mode === '4x4') return { cols: 5, rows: 5 };
    if (mode === '5x5') return { cols: 6, rows: 6 };
    if (mode === 'custom') return { cols: Math.max(2, customCols + 1), rows: Math.max(2, customRows + 1) };
    return { cols: 2, rows: 2 };
}

function selectionBox(points: WarpControlPoint[], selected: Set<number>): SelectionBox | null {
    if (selected.size < 2) return null;
    const chosen = [...selected].map(idx => points[idx]).filter(Boolean);
    if (chosen.length < 2) return null;
    const xs = chosen.map(p => p.x);
    const ys = chosen.map(p => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function insertColumn(points: WarpControlPoint[], cols: number, rows: number, u: number): { points: WarpControlPoint[]; cols: number } {
    const left = Math.min(cols - 2, Math.max(0, Math.floor(clampUnit(u) * (cols - 1))));
    const t = clampUnit(u) * (cols - 1) - left;
    const next: WarpControlPoint[] = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            next.push({ ...points[row * cols + col] });
            if (col === left) {
                const a = points[row * cols + left];
                const b = points[row * cols + left + 1];
                next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            }
        }
    }
    return { points: next, cols: cols + 1 };
}

function insertRow(points: WarpControlPoint[], cols: number, rows: number, v: number): { points: WarpControlPoint[]; rows: number } {
    const top = Math.min(rows - 2, Math.max(0, Math.floor(clampUnit(v) * (rows - 1))));
    const t = clampUnit(v) * (rows - 1) - top;
    const next: WarpControlPoint[] = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) next.push({ ...points[row * cols + col] });
        if (row === top) {
            for (let col = 0; col < cols; col++) {
                const a = points[top * cols + col];
                const b = points[(top + 1) * cols + col];
                next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            }
        }
    }
    return { points: next, rows: rows + 1 };
}

function removeColumn(points: WarpControlPoint[], cols: number, remove: number): { points: WarpControlPoint[]; cols: number } {
    if (cols <= 2 || remove <= 0 || remove >= cols - 1) return { points, cols };
    return {
        cols: cols - 1,
        points: points.filter((_, idx) => idx % cols !== remove),
    };
}

function removeRow(points: WarpControlPoint[], cols: number, rows: number, remove: number): { points: WarpControlPoint[]; rows: number } {
    if (rows <= 2 || remove <= 0 || remove >= rows - 1) return { points, rows };
    return {
        rows: rows - 1,
        points: points.filter((_, idx) => Math.floor(idx / cols) !== remove),
    };
}

export function WarpOverlay({ state, zoom, panX, panY, onCommit, onCancel }: Props) {
    const { layers } = useEditorStore();
    const layer = layers.find(l => l.id === state.layerId);
    const [preset, setPreset] = useState<WarpPreset>('none');
    const [gridMode, setGridMode] = useState<GridMode>('default');
    const [customCols, setCustomCols] = useState(6);
    const [customRows, setCustomRows] = useState(6);
    const initialGrid = useMemo(() => cellCountForMode('default', customCols, customRows), [customCols, customRows]);
    const [gridCols, setGridCols] = useState(initialGrid.cols);
    const [gridRows, setGridRows] = useState(initialGrid.rows);
    const [controlPoints, setControlPoints] = useState<WarpControlPoint[]>(() =>
        pointsForGrid('none', state.source, initialGrid.cols, initialGrid.rows)
    );
    const [splitMode, setSplitMode] = useState<SplitMode>('none');
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [contextPoint, setContextPoint] = useState<{ idx: number; x: number; y: number } | null>(null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const dragRef = useRef<DragState | null>(null);
    const undoStack = useRef<WarpControlPoint[][]>([]);

    const pushUndo = useCallback((points = controlPoints) => {
        undoStack.current.push(clonePoints(points));
        if (undoStack.current.length > 50) undoStack.current.shift();
    }, [controlPoints]);

    const toScreen = useCallback((x: number, y: number) => ({
        sx: (state.sourceX + x) * zoom + panX,
        sy: (state.sourceY + y) * zoom + panY,
    }), [panX, panY, state.sourceX, state.sourceY, zoom]);

    const fromScreen = useCallback((clientX: number, clientY: number) => ({
        x: (clientX - panX) / zoom - state.sourceX,
        y: (clientY - panY) / zoom - state.sourceY,
    }), [panX, panY, state.sourceX, state.sourceY, zoom]);

    useEffect(() => {
        if (!layer) return;
        const sourceCanvas = imageDataToCanvas(state.source);
        const result = applyMeshWarp(sourceCanvas, controlPoints, state.source.width, state.source.height, gridCols, gridRows);
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.ctx.putImageData(state.snapshot, 0, 0);
        layer.ctx.clearRect(state.sourceX, state.sourceY, state.source.width, state.source.height);
        layer.ctx.drawImage(result, state.sourceX, state.sourceY);
        layer.markDirty(null);
        useEditorStore.setState(s => ({ layers: [...s.layers] }));
    }, [controlPoints, gridCols, gridRows, layer, state]);

    const resetGrid = useCallback((mode: GridMode, nextPreset = preset, colsOverride = customCols, rowsOverride = customRows) => {
        const next = cellCountForMode(mode, colsOverride, rowsOverride);
        setGridMode(mode);
        setGridCols(next.cols);
        setGridRows(next.rows);
        setSelected(new Set());
        undoStack.current = [];
        setControlPoints(pointsForGrid(nextPreset, state.source, next.cols, next.rows));
    }, [customCols, customRows, preset, state.source]);

    const setPresetAndReset = useCallback((nextPreset: WarpPreset) => {
        setPreset(nextPreset);
        setControlPoints(pointsForGrid(nextPreset, state.source, gridCols, gridRows));
        setSelected(new Set());
        undoStack.current = [];
    }, [gridCols, gridRows, state.source]);

    const applySplit = useCallback((u: number, v: number, mode: SplitMode) => {
        if (mode === 'none') return;
        pushUndo();
        let nextPoints = controlPoints;
        let nextCols = gridCols;
        let nextRows = gridRows;
        if (mode === 'cross' || mode === 'vertical') {
            const inserted = insertColumn(nextPoints, nextCols, nextRows, u);
            nextPoints = inserted.points;
            nextCols = inserted.cols;
        }
        if (mode === 'cross' || mode === 'horizontal') {
            const inserted = insertRow(nextPoints, nextCols, nextRows, v);
            nextPoints = inserted.points;
            nextRows = inserted.rows;
        }
        setPreset('none');
        setGridMode('custom');
        setGridCols(nextCols);
        setGridRows(nextRows);
        setSelected(new Set());
        setControlPoints(nextPoints);
        setSplitMode('none');
    }, [controlPoints, gridCols, gridRows, pushUndo]);

    const autoSplitMode = useCallback((u: number, v: number): SplitMode => {
        const xStep = 1 / (gridCols - 1);
        const yStep = 1 / (gridRows - 1);
        const nearVertical = Array.from({ length: gridCols }, (_, col) => col * xStep).some(x => Math.abs(x - u) < 0.04);
        const nearHorizontal = Array.from({ length: gridRows }, (_, row) => row * yStep).some(y => Math.abs(y - v) < 0.04);
        if (nearVertical && !nearHorizontal) return 'horizontal';
        if (nearHorizontal && !nearVertical) return 'vertical';
        return 'cross';
    }, [gridCols, gridRows]);

    const handleStageMouseDown = useCallback((e: React.MouseEvent<SVGRectElement>) => {
        const local = fromScreen(e.clientX, e.clientY);
        const u = local.x / state.source.width;
        const v = local.y / state.source.height;
        if (e.altKey || splitMode !== 'none') {
            applySplit(u, v, e.altKey ? autoSplitMode(u, v) : splitMode);
            return;
        }
        if (e.shiftKey) {
            const drag: DragState = { type: 'marquee', startX: e.clientX, startY: e.clientY, currentX: e.clientX, currentY: e.clientY };
            dragRef.current = drag;
            setDragState(drag);
            return;
        }
        setContextPoint(null);
        setSelected(new Set());
    }, [applySplit, autoSplitMode, fromScreen, splitMode, state.source.height, state.source.width]);

    const handlePointMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
        e.stopPropagation();
        setContextPoint(null);
        if (e.shiftKey) {
            setSelected(prev => {
                const next = new Set(prev);
                if (next.has(idx)) next.delete(idx);
                else next.add(idx);
                return next;
            });
            return;
        }
        pushUndo();
        const active = selected.has(idx) && selected.size > 1 ? [...selected] : [idx];
        if (!selected.has(idx)) setSelected(new Set([idx]));
        const drag: DragState = {
            type: 'point',
            idx,
            selected: active,
            startX: e.clientX,
            startY: e.clientY,
            points: clonePoints(controlPoints),
        };
        dragRef.current = drag;
        setDragState(drag);
    }, [controlPoints, pushUndo, selected]);

    const box = selectionBox(controlPoints, selected);

    const startSelectionDrag = useCallback((e: React.MouseEvent, type: 'selection-move' | 'selection-scale' | 'selection-rotate') => {
        if (!box) return;
        e.stopPropagation();
        pushUndo();
        const base = { selected: [...selected], startX: e.clientX, startY: e.clientY, points: clonePoints(controlPoints), box };
        const local = fromScreen(e.clientX, e.clientY);
        const drag: DragState = type === 'selection-move'
            ? { type, selected: base.selected, startX: base.startX, startY: base.startY, points: base.points }
            : type === 'selection-scale'
                ? { type, ...base }
                : { type, ...base, startAngle: Math.atan2(local.y - box.cy, local.x - box.cx) };
        dragRef.current = drag;
        setDragState(drag);
    }, [box, controlPoints, fromScreen, pushUndo, selected]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            if (drag.type === 'marquee') {
                const next = { ...drag, currentX: e.clientX, currentY: e.clientY };
                dragRef.current = next;
                setDragState(next);
                return;
            }
            const dx = (e.clientX - drag.startX) / zoom;
            const dy = (e.clientY - drag.startY) / zoom;
            if (drag.type === 'point' || drag.type === 'selection-move') {
                setControlPoints(drag.points.map((p, idx) => (
                    drag.selected.includes(idx) ? { x: p.x + dx, y: p.y + dy } : { ...p }
                )));
                return;
            }
            if (drag.type === 'selection-scale') {
                const sx = Math.max(0.1, 1 + dx / Math.max(1, drag.box.maxX - drag.box.minX));
                const sy = Math.max(0.1, 1 + dy / Math.max(1, drag.box.maxY - drag.box.minY));
                setControlPoints(drag.points.map((p, idx) => {
                    if (!drag.selected.includes(idx)) return { ...p };
                    return {
                        x: drag.box.cx + (p.x - drag.box.cx) * sx,
                        y: drag.box.cy + (p.y - drag.box.cy) * sy,
                    };
                }));
                return;
            }
            const local = fromScreen(e.clientX, e.clientY);
            const angle = Math.atan2(local.y - drag.box.cy, local.x - drag.box.cx);
            const delta = angle - drag.startAngle;
            const cos = Math.cos(delta);
            const sin = Math.sin(delta);
            setControlPoints(drag.points.map((p, idx) => {
                if (!drag.selected.includes(idx)) return { ...p };
                const x = p.x - drag.box.cx;
                const y = p.y - drag.box.cy;
                return { x: drag.box.cx + x * cos - y * sin, y: drag.box.cy + x * sin + y * cos };
            }));
        };
        const onUp = () => {
            const drag = dragRef.current;
            if (drag?.type === 'marquee') {
                const minX = Math.min(drag.startX, drag.currentX);
                const maxX = Math.max(drag.startX, drag.currentX);
                const minY = Math.min(drag.startY, drag.currentY);
                const maxY = Math.max(drag.startY, drag.currentY);
                setSelected(new Set(controlPoints.flatMap((p, idx) => {
                    const screen = toScreen(p.x, p.y);
                    return screen.sx >= minX && screen.sx <= maxX && screen.sy >= minY && screen.sy <= maxY ? [idx] : [];
                })));
            }
            dragRef.current = null;
            setDragState(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [controlPoints, fromScreen, toScreen, zoom]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.metaKey || e.ctrlKey;
            if (meta && e.key.toLowerCase() === 'z') {
                const previous = undoStack.current.pop();
                if (previous) {
                    e.preventDefault();
                    setControlPoints(previous);
                }
                return;
            }
            if (e.key === 'Enter') { e.preventDefault(); onCommit(); }
            if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel, onCommit]);

    const gridLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols - 1; col++) {
            const p0 = toScreen(controlPoints[row * gridCols + col].x, controlPoints[row * gridCols + col].y);
            const p1 = toScreen(controlPoints[row * gridCols + col + 1].x, controlPoints[row * gridCols + col + 1].y);
            gridLines.push({ x1: p0.sx, y1: p0.sy, x2: p1.sx, y2: p1.sy });
        }
    }
    for (let col = 0; col < gridCols; col++) {
        for (let row = 0; row < gridRows - 1; row++) {
            const p0 = toScreen(controlPoints[row * gridCols + col].x, controlPoints[row * gridCols + col].y);
            const p1 = toScreen(controlPoints[(row + 1) * gridCols + col].x, controlPoints[(row + 1) * gridCols + col].y);
            gridLines.push({ x1: p0.sx, y1: p0.sy, x2: p1.sx, y2: p1.sy });
        }
    }

    const stage = {
        x: state.sourceX * zoom + panX,
        y: state.sourceY * zoom + panY,
        w: state.source.width * zoom,
        h: state.source.height * zoom,
    };
    const marquee = dragState?.type === 'marquee' ? dragState : null;

    return (
        <svg
            data-testid="warp-overlay"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
            <foreignObject x={0} y={0} width={760} height={42} style={{ pointerEvents: 'all' }}>
                <div style={{ display: 'flex', gap: 8, padding: '4px 8px', background: 'rgba(0,0,0,0.75)', borderRadius: 4, fontSize: 11, color: 'white', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Warp:
                        <select data-testid="warp-preset" value={preset} onChange={e => setPresetAndReset(e.target.value as WarpPreset)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'white', fontSize: 11, padding: '2px 4px' }}>
                            {PRESETS.map(p => <option key={p} value={p} style={{ background: '#333' }}>{PRESET_LABELS[p]}</option>)}
                        </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        Grid:
                        <select data-testid="warp-grid" value={gridMode} onChange={e => resetGrid(e.target.value as GridMode)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'white', fontSize: 11, padding: '2px 4px' }}>
                            <option value="default" style={{ background: '#333' }}>Default</option>
                            <option value="3x3" style={{ background: '#333' }}>3 x 3</option>
                            <option value="4x4" style={{ background: '#333' }}>4 x 4</option>
                            <option value="5x5" style={{ background: '#333' }}>5 x 5</option>
                            <option value="custom" style={{ background: '#333' }}>Custom</option>
                        </select>
                    </label>
                    {gridMode === 'custom' && (
                        <>
                            <input data-testid="warp-custom-cols" type="number" min={1} max={12} value={customCols} onChange={e => { const value = Number(e.target.value) || 1; setCustomCols(value); resetGrid('custom', preset, value, customRows); }} style={{ width: 40, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'white', fontSize: 11 }} />
                            <input data-testid="warp-custom-rows" type="number" min={1} max={12} value={customRows} onChange={e => { const value = Number(e.target.value) || 1; setCustomRows(value); resetGrid('custom', preset, customCols, value); }} style={{ width: 40, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 3, color: 'white', fontSize: 11 }} />
                        </>
                    )}
                    <button data-testid="warp-split-cross" onClick={() => setSplitMode('cross')} title="Split Crosswise" style={{ padding: '2px 6px', background: splitMode === 'cross' ? '#0090ff' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 11 }}>+</button>
                    <button data-testid="warp-split-vertical" onClick={() => setSplitMode('vertical')} title="Split Vertical" style={{ padding: '2px 6px', background: splitMode === 'vertical' ? '#0090ff' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 11 }}>|</button>
                    <button data-testid="warp-split-horizontal" onClick={() => setSplitMode('horizontal')} title="Split Horizontal" style={{ padding: '2px 6px', background: splitMode === 'horizontal' ? '#0090ff' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 11 }}>-</button>
                    <button data-testid="warp-reset" onClick={() => resetGrid(gridMode)} title="Reset Warp" style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center' }}><RotateCcw size={13} /></button>
                    <button data-testid="warp-commit" onClick={onCommit} title="Commit warp" style={{ padding: '2px 8px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                    <button data-testid="warp-cancel" onClick={onCancel} title="Cancel warp" style={{ padding: '2px 8px', background: 'rgba(255,80,80,0.8)', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center' }}><XIcon size={13} /></button>
                </div>
            </foreignObject>

            <rect
                data-testid="warp-stage"
                x={stage.x}
                y={stage.y}
                width={stage.w}
                height={stage.h}
                fill="transparent"
                stroke="#0090ff"
                strokeWidth={1}
                style={{ pointerEvents: 'all', cursor: splitMode === 'none' ? 'default' : 'crosshair' }}
                onMouseDown={handleStageMouseDown}
            />

            {gridLines.map((l, i) => (
                <line key={i} data-testid="warp-grid-line" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#0090ff" strokeWidth={1} strokeDasharray="4 2" />
            ))}

            {box && (() => {
                const p0 = toScreen(box.minX, box.minY);
                const p1 = toScreen(box.maxX, box.maxY);
                const rotate = toScreen(box.cx, box.minY - 24 / zoom);
                return (
                    <g>
                        <rect data-testid="warp-selection-box" x={p0.sx} y={p0.sy} width={p1.sx - p0.sx} height={p1.sy - p0.sy} fill="rgba(0,144,255,0.08)" stroke="#ffffff" strokeDasharray="3 2" style={{ pointerEvents: 'all', cursor: 'move' }} onMouseDown={e => startSelectionDrag(e, 'selection-move')} />
                        <circle data-testid="warp-selection-scale" cx={p1.sx} cy={p1.sy} r={5} fill="white" stroke="#0090ff" style={{ pointerEvents: 'all', cursor: 'nwse-resize' }} onMouseDown={e => startSelectionDrag(e, 'selection-scale')} />
                        <circle data-testid="warp-selection-rotate" cx={rotate.sx} cy={rotate.sy} r={5} fill="white" stroke="#0090ff" style={{ pointerEvents: 'all', cursor: 'grab' }} onMouseDown={e => startSelectionDrag(e, 'selection-rotate')} />
                    </g>
                );
            })()}

            {controlPoints.map((p, idx) => {
                const { sx, sy } = toScreen(p.x, p.y);
                const isSelected = selected.has(idx);
                return (
                    <circle
                        key={idx}
                        data-testid={`warp-point-${idx}`}
                        data-warp-point="true"
                        cx={sx}
                        cy={sy}
                        r={isSelected ? 6 : 5}
                        fill={isSelected ? '#0090ff' : 'white'}
                        stroke="#0090ff"
                        strokeWidth={1}
                        style={{ pointerEvents: 'all', cursor: 'move' }}
                        onMouseDown={e => handlePointMouseDown(e, idx)}
                        onContextMenu={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            setContextPoint({ idx, x: e.clientX, y: e.clientY });
                        }}
                    />
                );
            })}

            {marquee && (
                <rect
                    data-testid="warp-marquee"
                    x={Math.min(marquee.startX, marquee.currentX)}
                    y={Math.min(marquee.startY, marquee.currentY)}
                    width={Math.abs(marquee.currentX - marquee.startX)}
                    height={Math.abs(marquee.currentY - marquee.startY)}
                    fill="rgba(0,144,255,0.12)"
                    stroke="#0090ff"
                    strokeDasharray="3 2"
                />
            )}

            {contextPoint && (
                <foreignObject x={contextPoint.x} y={contextPoint.y} width={160} height={32} style={{ pointerEvents: 'all' }}>
                    <button
                        data-testid="warp-remove-split"
                        onClick={() => {
                            pushUndo();
                            const row = Math.floor(contextPoint.idx / gridCols);
                            const col = contextPoint.idx % gridCols;
                            if (row > 0 && row < gridRows - 1) {
                                const next = removeRow(controlPoints, gridCols, gridRows, row);
                                setControlPoints(next.points);
                                setGridRows(next.rows);
                            } else if (col > 0 && col < gridCols - 1) {
                                const next = removeColumn(controlPoints, gridCols, col);
                                setControlPoints(next.points);
                                setGridCols(next.cols);
                            }
                            setContextPoint(null);
                            setSelected(new Set());
                        }}
                        style={{ background: 'rgba(30,30,30,0.95)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 4, padding: '6px 8px', fontSize: 11, cursor: 'pointer' }}
                    >Remove Warp Split</button>
                </foreignObject>
            )}
        </svg>
    );
}
