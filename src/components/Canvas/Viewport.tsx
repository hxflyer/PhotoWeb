import { useCallback, useEffect, useLayoutEffect, useRef, useState, memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { superFastBlur, superFastBlurToFloat32, getLayerContentBounds } from '../../utils/canvasUtils';
import { useEditorStore } from '../../store/editorStore';
import type { SelectionMode } from '../../store/editorStore';
import { useFreeEdit } from '../../hooks/useFreeEdit';
import { buildSelectionEdgePath, getSelectionBounds } from '../../utils/selectionUtils';
import { getTransformedHandles } from '../../utils/geometryUtils';
import { ensureStubsRegistered } from '../../tools/stubs';
import { getTool } from '../../tools/registry';
import type { ToolKeyEvent, ToolPointerEvent } from '../../tools/Tool';
import { Canvas2DCompositor } from '../../compositor/Canvas2DCompositor';
import { TypeLayerVisuals, TypeOverlayMount } from './TypeOverlayMount';
import { VIEWPORT_FIT_EVENT } from '../../utils/viewportFit';
import { ingestFiles, summaryToast } from '../../utils/fileIngest';
import { applyBrushDab } from '../../utils/brushEngine';
import { getCropRect } from '../../tools/crop';
import { getSelectionToolOperation } from '../../tools/selectionModifiers';

// Custom Cursor SVGs
const CURSOR_ADD = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L12 22M2 12L22 12" stroke="white" stroke-width="4"/><path d="M12 2L12 22M2 12L22 12" stroke="black" stroke-width="2"/></svg>') 12 12, crosshair`;
const CURSOR_CLONE_SAMPLE = `url('data:image/svg+xml;utf8,<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="10" fill="none" stroke="white" stroke-width="4"/><circle cx="14" cy="14" r="10" fill="none" stroke="black" stroke-width="2"/><path d="M9 18H19V21H9V18ZM11 18L12 12Q14 10 16 12L17 18" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/></svg>') 14 14, copy`;
const SELECTION_EDGE_THRESHOLD = 0.5;
const SELECTION_DRAG_THRESHOLD = 3;
const START_FREE_TRANSFORM_EVENT = 'photoweb:start-free-transform';

// Module-level helpers used by both compositor and overlay canvas
function drawShape(ctx: CanvasRenderingContext2D, pathData: { x: number; y: number }[], mode: SelectionMode): void {
    if (pathData.length < 2 && (mode === 'rect' || mode === 'circle')) return;
    ctx.beginPath();
    if (mode === 'rect') {
        const [p1, p2] = pathData;
        ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
    } else if (mode === 'circle') {
        const [p1, p2] = pathData;
        const cx = (p1.x + p2.x) / 2; const cy = (p1.y + p2.y) / 2;
        ctx.ellipse(cx, cy, Math.abs(p1.x - p2.x) / 2, Math.abs(p1.y - p2.y) / 2, 0, 0, Math.PI * 2);
    } else {
        if (pathData.length === 0) return;
        ctx.moveTo(pathData[0].x, pathData[0].y);
        for (let i = 1; i < pathData.length; i++) ctx.lineTo(pathData[i].x, pathData[i].y);
        ctx.closePath();
    }
}

function drawDashedShape(ctx: CanvasRenderingContext2D, path: { x: number; y: number }[], mode: SelectionMode, dash: number, zoom: number): void {
    ctx.save();
    drawShape(ctx, path, mode);
    ctx.clip();
    drawShape(ctx, path, mode);
    ctx.lineWidth = 2 / zoom;
    ctx.strokeStyle = '#000'; ctx.lineDashOffset = -dash / zoom; ctx.stroke();
    ctx.strokeStyle = '#FFF'; ctx.lineDashOffset = (-dash / zoom) + (4 / zoom); ctx.stroke();
    ctx.restore();
}

function drawSelectionMask(
    ctx: CanvasRenderingContext2D,
    mask: { data: Uint8ClampedArray; width: number; height: number },
): void {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;
    const imageData = maskCtx.createImageData(mask.width, mask.height);
    for (let i = 0; i < mask.data.length; i++) {
        imageData.data[i * 4] = 255;
        imageData.data[i * 4 + 1] = 255;
        imageData.data[i * 4 + 2] = 255;
        imageData.data[i * 4 + 3] = mask.data[i];
    }
    maskCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(maskCanvas, 0, 0);
}
const CURSOR_SUB = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 12L22 12" stroke="white" stroke-width="4"/><path d="M2 12L22 12" stroke="black" stroke-width="2"/></svg>') 12 12, crosshair`;
const CURSOR_INTERSECT = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M18 6L6 18" stroke="white" stroke-width="4"/><path d="M6 6L18 18M18 6L6 18" stroke="black" stroke-width="2"/></svg>') 12 12, crosshair`;
const SELECTION_CURSOR_TOOLS = new Set(['select', 'marquee-rect', 'marquee-ellipse', 'lasso', 'lasso-poly', 'magnetic-lasso', 'magic-wand', 'quick-selection', 'object-selection']);

interface ViewportProps {
    toolsBlocked?: boolean;
}

function ViewportComponent({ toolsBlocked = false }: ViewportProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const {
        width, height, zoom, pan,
        activeTool, setPan, setZoom,
        layers, activeLayerId, brushSettings,
        selection, setSelectionPath, setHasSelection, setIsDraggingSelection, clearSelection,
        addSelectionOperation, setSelectionOperations, setFreeEditMode, setPolyPoints,
        showRulers, showGrid, gridSize, activeChannel, channelVisibility, activeSnapTargets, viewedLayerMaskId,
    } = useEditorStore();
    // primaryColor is subscribed imperatively in the brush tip effect to avoid
    // re-rendering the entire Viewport on every color slider change.

    const [isDragging, setIsDragging] = useState(false);
    const lastMousePosRef = useRef({ x: 0, y: 0 });
    const lastMousePos = lastMousePosRef.current;
    const currentOpMode = useRef<'add' | 'sub' | 'new'>('new');
    const pendingSelectionMoveRef = useRef<{ x: number; y: number } | null>(null);
    const pendingSelectionStartRef = useRef<{ x: number; y: number } | null>(null);
    const [modifiers, setModifiers] = useState({ shift: false, alt: false, meta: false });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Tool registry plumbing (Phase 0.3). Stubs exist for every active tool ID;
    // pointer/key events are dispatched to the active Tool first, then the legacy
    // inline branches handle whatever the Tool doesn't claim.
    useEffect(() => { ensureStubsRegistered(); }, []);

    // Compositor for layer composite. Selection overlays etc. draw on the overlay canvas.
    const compositorRef = useRef(new Canvas2DCompositor());

    // Overlay canvas (separate from main canvas): draws selection/tool overlays via its own RAF loop,
    // so the main compositor doesn't re-run just for marching ants or in-progress drag paths.
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const dashOffsetRef = useRef(0);
    const overlayRafRef = useRef<number>(0);
    const overlayDrawFnRef = useRef<() => void>(() => {});
    const quickMaskCacheRef = useRef<HTMLCanvasElement | null>(null);
    const quickMaskSourceRef = useRef<HTMLCanvasElement | null>(null);
    // Transient buffer for Quick Mask painting. Brush/Eraser dabs stamp into this
    // canvas while quickMaskMode is on; toggling Quick Mask off converts the
    // accumulated mask into a selection via convertQuickMaskBufferToSelection.
    const quickMaskBufferRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const syncQuickMaskBuffer = (buffer: ImageData | null) => {
            if (!buffer) {
                quickMaskBufferRef.current = null;
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = buffer.width;
                canvas.height = buffer.height;
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.putImageData(buffer, 0, 0);
                quickMaskBufferRef.current = canvas;
            }
            quickMaskCacheRef.current = null;
            quickMaskSourceRef.current = null;
        };
        syncQuickMaskBuffer(useEditorStore.getState().quickMaskBuffer);
        return useEditorStore.subscribe((state, prev) => {
            if (state.quickMaskBuffer !== prev.quickMaskBuffer) {
                syncQuickMaskBuffer(state.quickMaskBuffer);
            }
        });
    }, []);

    // Ruler cursor marks — updated via direct DOM mutation so mousemove doesn't re-render the whole viewport.
    const hRulerMarkRef = useRef<HTMLDivElement>(null);
    const vRulerMarkRef = useRef<HTMLDivElement>(null);

    // Cached Unified Outline Path
    const [unifiedPath, setUnifiedPath] = useState<Path2D | null>(null);
    const [, setUnifiedPathVersion] = useState(0);
    const unifiedPathRef = useRef<Path2D | null>(null);

    // Stale Offset (Gap between drag end and tracer finish)
    const staleDragOffset = useRef({ x: 0, y: 0 });

    const [renderTick, setRenderTick] = useState(0);
    const rafPendingRef = useRef(false);
    const requestRender = useCallback(() => {
        if (rafPendingRef.current) return;
        rafPendingRef.current = true;
        requestAnimationFrame(() => {
            rafPendingRef.current = false;
            setRenderTick(t => t + 1);
        });
    }, []);

    const dispatchToolKey = (kind: 'down' | 'up', e: KeyboardEvent): void => {
        const tool = getTool(useEditorStore.getState().activeTool);
        if (!tool) return;
        const handler = kind === 'down' ? tool.onKeyDown : tool.onKeyUp;
        if (!handler) return;
        const evt: ToolKeyEvent = {
            key: e.key,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey,
            ctrl: e.ctrlKey,
            rawEvent: e,
        };
        const store = useEditorStore.getState();
        handler(evt, {
            store,
            getStore: () => useEditorStore.getState(),
            requestRender,
        });
    };

    // Cached Mask for Clipping / Operations
    const [selectionMask, setSelectionMask] = useState<HTMLCanvasElement | null>(null);
    // Float32 mask for high-precision brush operations (normalized 0-1)
    const [selectionMaskFloat, setSelectionMaskFloat] = useState<Float32Array | null>(null);

    const activeCropRect = activeTool === 'crop' ? getCropRect() : null;
    const cropHandlePad = activeTool === 'crop' ? Math.ceil(56 / Math.max(zoom, 0.01)) : 0;
    const overlayPad = activeTool === 'crop'
        ? {
            left: cropHandlePad + Math.ceil(Math.max(0, -(activeCropRect?.x ?? 0))),
            top: cropHandlePad + Math.ceil(Math.max(0, -(activeCropRect?.y ?? 0))),
            right: cropHandlePad + Math.ceil(Math.max(0, ((activeCropRect?.x ?? 0) + (activeCropRect?.w ?? width)) - width)),
            bottom: cropHandlePad + Math.ceil(Math.max(0, ((activeCropRect?.y ?? 0) + (activeCropRect?.h ?? height)) - height)),
        }
        : { left: 0, top: 0, right: 0, bottom: 0 };





    // Track Modifiers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            dispatchToolKey('down', e);
            if (e.key === 'Shift') setModifiers(m => ({ ...m, shift: true }));
            if (e.key === 'Alt') setModifiers(m => ({ ...m, alt: true }));
            if (e.key === 'Meta' || e.key === 'Control') setModifiers(m => ({ ...m, meta: true }));
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            dispatchToolKey('up', e);
            if (e.key === 'Shift') setModifiers(m => ({ ...m, shift: false }));
            if (e.key === 'Alt') setModifiers(m => ({ ...m, alt: false }));
            if (e.key === 'Meta' || e.key === 'Control') setModifiers(m => ({ ...m, meta: false }));
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Stroke buffer for high-quality masked painting
    // Accumulates paint during stroke, mask is applied once on mouse up
    interface StrokeBuffer {
        layerId: string;
        base: ImageData;
        work: ImageData;
        coverage: Float32Array;
    }
    const strokeBufferRef = useRef<StrokeBuffer | null>(null);

    // dashOffset is now a ref incremented by the overlay RAF loop — no React state, no re-renders

    const leftoverDistance = useRef(0);
    const brushTipRef = useRef<HTMLCanvasElement | null>(null);

    // Free Edit Hook
    const {
        floatingPixelsRef,
        activeTransformRef,
        freeEditCursor,
        ensureFloatingPixels,
        commit: commitFloatingPixels,
        handleMouseDown: handleFreeEditDown,
        handleMouseMove: handleFreeEditMove,
        handleMouseUp: handleFreeEditUp
    } = useFreeEdit(canvasRef, selectionMask, setUnifiedPathVersion);

    const fitDocumentToViewport = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const { width: docWidth, height: docHeight } = useEditorStore.getState();
        if (docWidth <= 0 || docHeight <= 0) return;
        const padding = 32;
        const availableWidth = Math.max(1, container.clientWidth - padding);
        const availableHeight = Math.max(1, container.clientHeight - padding);
        const nextZoom = Math.max(0.02, Math.min(32, Math.min(availableWidth / docWidth, availableHeight / docHeight)));
        setZoom(nextZoom);
        setPan(0, 0);
        requestRender();
    }, [requestRender, setPan, setZoom]);

    useEffect(() => {
        window.addEventListener(VIEWPORT_FIT_EVENT, fitDocumentToViewport);
        return () => window.removeEventListener(VIEWPORT_FIT_EVENT, fitDocumentToViewport);
    }, [fitDocumentToViewport]);

    // -- Composition Render (layers only — overlays are on the overlay canvas) --
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const compositor = compositorRef.current;
        const { zoom, pan } = useEditorStore.getState();
        const viewportInfo = { width, height, zoom, pan };
        compositor.beginFrame(canvas);
        const { globalLight } = useEditorStore.getState();
        const viewedMaskLayer = viewedLayerMaskId ? layers.find(layer => layer.id === viewedLayerMaskId) : null;
        if (viewedMaskLayer?.mask) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(viewedMaskLayer.mask.canvas, 0, 0, width, height);
        } else {
            compositor.render({ layers, activeLayerId, viewport: viewportInfo, target: canvas, activeChannel, channelVisibility, skipTypeLayers: !activeChannel || activeChannel === 'rgb', globalLight });
            compositor.present();
        }

        // Grid overlay
        if (showGrid) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0,144,255,0.3)';
            ctx.lineWidth = 1 / zoom;
            for (let x2 = 0; x2 <= width; x2 += gridSize) {
                ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, height); ctx.stroke();
            }
            for (let y2 = 0; y2 <= height; y2 += gridSize) {
                ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(width, y2); ctx.stroke();
            }
            ctx.restore();
        }

        // Guides — draw on top of layer content so they're always visible.
        const { guides, showGuides } = useEditorStore.getState();
        if (showGuides && guides.length > 0) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0,200,255,0.85)';
            ctx.lineWidth = 1 / zoom;
            for (const g of guides) {
                ctx.beginPath();
                if (g.orientation === 'horizontal') {
                    ctx.moveTo(0, g.position);
                    ctx.lineTo(width, g.position);
                } else {
                    ctx.moveTo(g.position, 0);
                    ctx.lineTo(g.position, height);
                }
                ctx.stroke();
            }
            ctx.restore();
        }

        // Smart guides — dashed magenta lines for every active snap target
        // during a drag. Cleared by the tool / overlay code on pointer-up.
        const liveSnap = useEditorStore.getState().activeSnapTargets;
        if (liveSnap && liveSnap.length > 0) {
            ctx.save();
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 3 / zoom]);
            for (const t of liveSnap) {
                ctx.beginPath();
                if (t.axis === 'x') {
                    ctx.moveTo(t.value, 0);
                    ctx.lineTo(t.value, height);
                } else {
                    ctx.moveTo(0, t.value);
                    ctx.lineTo(width, t.value);
                }
                ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Floating-pixels preview (layer content, not UI overlay)
        const sel = useEditorStore.getState().selection;
        layers.forEach(layer => {
            if (layer.visible && layer.canvas) {
                if (layer.id === activeLayerId && floatingPixelsRef.current) {
                    const fp = floatingPixelsRef.current;
                    ctx.save();
                    const bounds = getSelectionBounds(sel.path || [], sel.operations || [], sel.hasSelection, width, height);
                    if (bounds) {
                        const cx = bounds.x + bounds.w / 2;
                        const cy = bounds.y + bounds.h / 2;
                        ctx.translate(cx + fp.x, cy + fp.y);
                        ctx.rotate(fp.rotation);
                        ctx.scale(fp.scaleX, fp.scaleY);
                        ctx.translate(-cx, -cy);
                        ctx.drawImage(fp.canvas, 0, 0);
                    } else {
                        ctx.drawImage(fp.canvas, fp.x, fp.y);
                    }
                    ctx.restore();
                }
            }
        });

    }, [layers, activeLayerId, width, height, showGrid, gridSize, renderTick, activeChannel, activeSnapTargets, viewedLayerMaskId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Free Edit Initialization
    useEffect(() => {
        if (selection.isFreeEditMode) {
            ensureFloatingPixels();
            // Force re-render to show transformed handles
            setUnifiedPathVersion(v => v);
        }
    }, [selection.isFreeEditMode]);


    // ... Brush tip — rebuilt when size/hardness/tool change, or when primaryColor changes.
    // primaryColor is NOT in the component subscription; instead we subscribe imperatively
    // here so that color slider drags don't re-render the entire Viewport component.
    useEffect(() => {
        const buildTip = (primaryColor: string) => {
            const size = brushSettings.size;
            const hardness = brushSettings.hardness;
            const color = activeTool === 'eraser' ? '#000000' : primaryColor;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const radius = size / 2;
            const center = radius;
            if (hardness >= 0.98) {
                ctx.beginPath();
                ctx.arc(center, center, radius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            } else {
                const gradient = ctx.createRadialGradient(center, center, radius * hardness, center, center, radius);
                const getRgb = (colorStr: string) => {
                    const hex6 = colorStr.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
                    if (hex6) return { r: parseInt(hex6[1], 16), g: parseInt(hex6[2], 16), b: parseInt(hex6[3], 16) };
                    const tmp = document.createElement('canvas');
                    tmp.width = 1; tmp.height = 1;
                    const c = tmp.getContext('2d');
                    if (!c) return { r: 0, g: 0, b: 0 };
                    c.fillStyle = colorStr;
                    c.fillRect(0, 0, 1, 1);
                    const d = c.getImageData(0, 0, 1, 1).data;
                    return { r: d[0], g: d[1], b: d[2] };
                };
                const rgb = getRgb(color);
                const stops = 20;
                gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
                gradient.addColorStop(Math.max(0, hardness), `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
                const remaining = 1 - Math.max(0, hardness);
                for (let i = 1; i <= stops; i++) {
                    const t = i / stops;
                    const alpha = (1 + Math.cos(t * Math.PI)) / 2;
                    const pos = Math.min(1, Math.max(0, hardness) + (remaining * t));
                    gradient.addColorStop(pos, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
                }
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, size, size);
            }
            brushTipRef.current = canvas;
        };
        buildTip(useEditorStore.getState().primaryColor);
        return useEditorStore.subscribe((state, prev) => {
            if (state.primaryColor !== prev.primaryColor) buildTip(state.primaryColor);
        });
    }, [brushSettings.size, brushSettings.hardness, activeTool]); // eslint-disable-line react-hooks/exhaustive-deps


    const getCanvasCoords = (e: React.MouseEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const buildToolPointerEvent = (e: React.MouseEvent): ToolPointerEvent => {
        const coords = getCanvasCoords(e);
        const native = e.nativeEvent as PointerEvent;
        const pointerType = (native && 'pointerType' in native ? native.pointerType : 'mouse') as 'mouse' | 'pen' | 'touch';
        // Mouse and touch report a stub pressure (0.5 in many browsers). Only
        // pen input reports real per-event pressure; for mouse/touch we treat
        // every event as full pressure so pressureSize doesn't silently halve
        // brush strokes — matches Photoshop, where mouse = 100% pressure.
        const rawPressure = native && 'pressure' in native ? native.pressure : 1;
        const pressure = pointerType === 'pen' ? rawPressure : 1;
        return {
            canvasX: coords.x,
            canvasY: coords.y,
            clientX: e.clientX,
            clientY: e.clientY,
            button: e.button,
            buttons: e.buttons,
            shift: e.shiftKey,
            alt: e.altKey,
            meta: e.metaKey,
            ctrl: e.ctrlKey,
            pressure,
            pointerType,
            rawEvent: native,
        };
    };

    const dispatchToolPointer = (
        kind: 'down' | 'move' | 'up',
        e: React.MouseEvent,
    ): void => {
        if (toolsBlocked) return;
        // Brush and eraser still use the legacy Viewport stroke pipeline because it
        // has selection-mask and per-stroke opacity/flow handling.
        if (activeTool === 'brush' || activeTool === 'eraser') return;
        const tool = getTool(activeTool);
        if (!tool) return;
        const handler = kind === 'down' ? tool.onPointerDown : kind === 'move' ? tool.onPointerMove : tool.onPointerUp;
        if (!handler) return;
        const evt = buildToolPointerEvent(e);
        const store = useEditorStore.getState();
        handler(evt, {
            store,
            getStore: () => useEditorStore.getState(),
            requestRender,
        });
    };

    const isPointInShape = (pathData: { x: number, y: number }[], mode: SelectionMode, x: number, y: number): boolean => {
        if (pathData.length < 2) return false;
        const path = new Path2D();
        if (mode === 'rect') {
            const [p1, p2] = pathData;
            path.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        } else if (mode === 'circle') {
            const [p1, p2] = pathData;
            const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            const rx = Math.abs(p1.x - p2.x) / 2;
            const ry = Math.abs(p1.y - p2.y) / 2;
            path.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        } else {
            path.moveTo(pathData[0].x, pathData[0].y);
            for (let i = 1; i < pathData.length; i++) path.lineTo(pathData[i].x, pathData[i].y);
            path.closePath();
        }
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return false;
        return ctx.isPointInPath(path, x, y);
    };

    const isPointInSelection = (x: number, y: number): boolean => {
        if (!selectionMaskFloat) {
            if ((!selection.operations || selection.operations.length === 0) && selection.hasSelection) {
                return isPointInShape(selection.path, selection.mode, x, y);
            }
            return false;
        }

        const ix = Math.floor(x);
        const iy = Math.floor(y);
        if (ix < 0 || iy < 0 || ix >= width || iy >= height) return false;
        return selectionMaskFloat[iy * width + ix] >= SELECTION_EDGE_THRESHOLD;
    };


    // Track Context Menu
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const { toggleInvertSelection, addLayerFromContent, setFeatherDialogOpen } = useEditorStore(); // Get actions

    // Update Mask when selection changes
    useEffect(() => {
        if (!selection.hasSelection && (!selection.operations || selection.operations.length === 0)) {
            setSelectionMask(null);
            setSelectionMaskFloat(null);
            return;
        }
        const mCanvas = document.createElement('canvas');
        mCanvas.width = width;
        mCanvas.height = height;
        const ctx = mCanvas.getContext('2d', { willReadFrequently: true }); // Optimized for frequent reads (Tracer)
        if (!ctx) return;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Apply Feathering
        // 1. Draw Hard Selection (Boolean Ops) to Temp Canvas
        const tempC = document.createElement('canvas');
        tempC.width = width;
        tempC.height = height;
        const tempCtx = tempC.getContext('2d');
        if (!tempCtx) return;

        tempCtx.fillStyle = '#FFFFFF';
        if (selection.operations && selection.operations.length > 0) {
            selection.operations.forEach(op => {
                tempCtx.globalCompositeOperation = op.mode === 'add' ? 'source-over' : 'destination-out';
                if (op.mask) {
                    drawSelectionMask(tempCtx, op.mask);
                } else {
                    drawShape(tempCtx, op.path, op.type);
                    tempCtx.fill();
                }
            });
        } else if (selection.hasSelection && selection.path.length > 0) {
            tempCtx.globalCompositeOperation = 'source-over';
            drawShape(tempCtx, selection.path, selection.mode);
            tempCtx.fill();
        }

        // 2. Draw Final Mask with optional Feather
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(tempC, 0, 0);

        // Apply Software Blur if feather > 0 (for canvas-based operations like drag)
        if (selection.feather && selection.feather > 0) {
            superFastBlur(mCanvas, selection.feather);
        }

        setSelectionMask(mCanvas);

        // Generate Float32 mask for high-precision brush operations
        // Use tempC (unblurred hard selection) and apply blur directly in Float32
        const floatMask = superFastBlurToFloat32(tempC, selection.feather || 0);
        setSelectionMaskFloat(floatMask);
    }, [selection.operations, selection.hasSelection, selection.feather, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

    // Build selection outline path from the current raster mask so replace/add/subtract/feather
    // all share the same source of truth.
    useEffect(() => {
        if (!selectionMaskFloat) {
            setUnifiedPath(null);
            return;
        }
        setUnifiedPath(buildSelectionEdgePath(selectionMaskFloat, width, height, SELECTION_EDGE_THRESHOLD));
        staleDragOffset.current = { x: 0, y: 0 };
        setUnifiedPathVersion(v => v + 1);
    }, [selectionMaskFloat, width, height]);

    // Keep unifiedPathRef in sync so the overlay RAF loop can read it without subscribing
    useEffect(() => { unifiedPathRef.current = unifiedPath; }, [unifiedPath]);

    // Overlay draw function — defined before useLayoutEffect so the reference is resolved.
    // The overlay RAF loop calls overlayDrawFnRef.current() each frame. useLayoutEffect (no deps)
    // keeps that ref pointing at the latest closure after every render, so zoom/pan/width/height
    // are always current without the RAF loop needing React subscriptions.
    function drawOverlay() {
        const overlayCanvas = overlayCanvasRef.current;
        if (!overlayCanvas) return;
        const octx = overlayCanvas.getContext('2d');
        if (!octx) return;
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        octx.save();
        octx.translate(overlayPad.left, overlayPad.top);

        const st = useEditorStore.getState();
        const { zoom: oz, activeTool: oat, selection: osel, quickMaskMode: oqm } = st;
        const dash = dashOffsetRef.current;
        const fp = floatingPixelsRef.current;

        // 1. Quick mask — draw a 50% red protected-area overlay. The active
        // mask source stores selected coverage, so subtract it from the red
        // fill to leave selected pixels fully visible.
        if (oqm) {
            const selectedCoverage = quickMaskBufferRef.current ?? selectionMask;
            if (selectedCoverage && (
                quickMaskSourceRef.current !== selectedCoverage ||
                !quickMaskCacheRef.current
            )) {
                quickMaskSourceRef.current = selectedCoverage;
                const qc = document.createElement('canvas');
                qc.width = width; qc.height = height;
                const qCtx = qc.getContext('2d')!;
                qCtx.fillStyle = 'rgba(255,0,0,0.5)';
                qCtx.fillRect(0, 0, qc.width, qc.height);
                qCtx.globalCompositeOperation = 'destination-out';
                qCtx.drawImage(selectedCoverage, 0, 0);
                qCtx.globalCompositeOperation = 'source-over';
                quickMaskCacheRef.current = qc;
            }
            if (quickMaskCacheRef.current) {
                octx.drawImage(quickMaskCacheRef.current, 0, 0);
            }
        } else {
            quickMaskCacheRef.current = null;
            quickMaskSourceRef.current = null;
            quickMaskBufferRef.current = null;
        }

        // 2. Tool overlay (renderOverlay reads from tool module-level state — no store needed)
        const activeToolImpl = getTool(oat);
        if (!toolsBlocked && activeToolImpl?.renderOverlay) {
            activeToolImpl.renderOverlay(
                { ctx: octx, canvasWidth: width, canvasHeight: height, zoom: oz },
                { store: st, getStore: () => useEditorStore.getState(), requestRender },
            );
        }

        // 3. Selection marching ants (committed selections)
        if (st.showSelectionEdges && !osel.edgesHidden && !osel.isFreeEditMode && (osel.hasSelection || (oat === 'select' && osel.path.length > 0))) {
            octx.save();
            octx.lineWidth = 1 / oz;
            octx.setLineDash([4 / oz, 4 / oz]);

            let offsetX = 0; let offsetY = 0;
            if (fp && osel.isDraggingSelection) {
                offsetX = fp.x - fp.lastCommitX;
                offsetY = fp.y - fp.lastCommitY;
            } else if (staleDragOffset.current.x !== 0 || staleDragOffset.current.y !== 0) {
                offsetX = staleDragOffset.current.x;
                offsetY = staleDragOffset.current.y;
            }
            octx.translate(offsetX, offsetY);

            const up = unifiedPathRef.current;
            if (up) {
                octx.save();
                octx.translate(0.5, 0.5);
                octx.strokeStyle = '#000'; octx.lineDashOffset = -dash / oz; octx.stroke(up);
                octx.strokeStyle = '#FFF'; octx.lineDashOffset = (-dash / oz) + (4 / oz); octx.stroke(up);
                octx.restore();
            }

            // Legacy select-tool in-progress drag path
            if (oat === 'select' && osel.path.length > 0 && !osel.isDraggingSelection) {
                drawDashedShape(octx, osel.path, osel.mode, dash, oz);
            }

            octx.restore();
        }

        // 4. Free Edit bounding box
        if (osel.isFreeEditMode && (osel.hasSelection || (osel.operations && osel.operations.length > 0))) {
            const bounds = getSelectionBounds(osel.path || [], osel.operations || [], osel.hasSelection, width, height);
            if (bounds) {
                const tHandles = getTransformedHandles(bounds, fp || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
                octx.save();
                octx.strokeStyle = '#3b82f6';
                octx.lineWidth = 1 / oz;
                octx.setLineDash([]);
                octx.fillStyle = 'rgba(255,255,255,0.05)';
                if (tHandles) {
                    const { nw, ne, se, sw, n, e, s, w: wHandle } = tHandles;
                    octx.beginPath();
                    octx.moveTo(nw.x, nw.y); octx.lineTo(ne.x, ne.y);
                    octx.lineTo(se.x, se.y); octx.lineTo(sw.x, sw.y);
                    octx.closePath(); octx.fill(); octx.stroke();
                    const hs = 8 / oz; const hhs = hs / 2;
                    octx.fillStyle = '#fff';
                    [nw, n, ne, e, se, s, sw, wHandle].forEach(hp => {
                        octx.beginPath();
                        octx.rect(hp.x - hhs, hp.y - hhs, hs, hs);
                        octx.fill(); octx.stroke();
                    });
                }
                octx.restore();
            }
        }

        // 5. Polygonal lasso preview
        if (oat === 'select' && osel.mode === 'lasso-poly' && osel.polyPoints && osel.polyPoints.length > 0) {
            octx.save();
            octx.lineWidth = 1.5 / oz; octx.strokeStyle = '#000';
            octx.setLineDash([4 / oz, 4 / oz]);
            octx.beginPath();
            octx.moveTo(osel.polyPoints[0].x, osel.polyPoints[0].y);
            for (let i = 1; i < osel.polyPoints.length; i++) octx.lineTo(osel.polyPoints[i].x, osel.polyPoints[i].y);
            octx.lineTo(lastMousePosRef.current.x, lastMousePosRef.current.y);
            octx.stroke();
            octx.setLineDash([]);
            octx.fillStyle = '#fff'; octx.strokeStyle = '#000';
            osel.polyPoints.forEach(lp => {
                octx.beginPath();
                octx.arc(lp.x, lp.y, 3 / oz, 0, Math.PI * 2);
                octx.fill(); octx.stroke();
            });
            octx.restore();
        }
        octx.restore();
    }

    // Keep the ref pointing at the latest drawOverlay closure after every render
    useLayoutEffect(() => { overlayDrawFnRef.current = drawOverlay; }); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const tick = () => {
            dashOffsetRef.current = (dashOffsetRef.current + 0.5) % 16;
            overlayDrawFnRef.current();
            overlayRafRef.current = requestAnimationFrame(tick);
        };
        overlayRafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(overlayRafRef.current);
    }, []); // runs once — overlay loop is self-contained, reads state imperatively

    const handleWheel = (e: React.WheelEvent) => {
        // Photoshop convention: Alt+wheel zooms (anchored at cursor); plain
        // wheel pans. Ctrl+wheel also zooms (legacy photoweb shortcut) to
        // avoid breaking existing muscle memory; both behave identically.
        if (e.altKey || e.ctrlKey) {
            e.preventDefault();
            // Convert cursor screen position to canvas-space coords so the
            // anchor stays under the cursor through the zoom change.
            const docEl = (e.currentTarget as HTMLElement).querySelector('[data-photoweb-document]') as HTMLElement | null;
            let anchorCanvasX = 0;
            let anchorCanvasY = 0;
            if (docEl) {
                const rect = docEl.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    anchorCanvasX = ((e.clientX - rect.left) / rect.width) * width;
                    anchorCanvasY = ((e.clientY - rect.top) / rect.height) * height;
                }
            }
            // Exponential mapping keeps the wheel feel smooth at any zoom.
            const factor = Math.exp(-e.deltaY * 0.001);
            const clamped = Math.max(0.05, Math.min(32, zoom * factor));
            const newPanX = pan.x + anchorCanvasX * (zoom - clamped);
            const newPanY = pan.y + anchorCanvasY * (zoom - clamped);
            setZoom(clamped);
            setPan(newPanX, newPanY);
            requestRender();
        } else {
            setPan(pan.x - e.deltaX, pan.y - e.deltaY);
            requestRender();
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (toolsBlocked) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        dispatchToolPointer('down', e);
        requestRender();
        // Move tool fully owns canvas panning via the Tool interface.
        if (activeTool === 'move') return;
        if (e.button === 1) {
            setIsDragging(true); lastMousePosRef.current = { x: e.clientX, y: e.clientY }; return;
        }

        // Ignore Right Click
        if (e.button !== 0) return;

        let coords = getCanvasCoords(e);

        // FREE EDIT INTERACTION
        if (handleFreeEditDown(e)) return;


        if (activeTool === 'select') {
            e.preventDefault();

            // Polygonal Lasso Mode - Handle separately
            if (selection.mode === 'lasso-poly') {
                const currentPoints = selection.polyPoints || [];

                // Check for double-click (close to first point) to close polygon
                if (currentPoints.length > 2) {
                    const first = currentPoints[0];
                    const dist = Math.hypot(coords.x - first.x, coords.y - first.y);
                    if (dist < 10) {
                        // Close and commit
                        setSelectionPath(currentPoints);
                        setHasSelection(true);
                        addSelectionOperation({ mode: 'add', path: currentPoints, type: 'lasso-poly' });
                        setPolyPoints([]);
                        return;
                    }
                }

                // Add point
                setPolyPoints([...currentPoints, coords]);
                lastMousePosRef.current = coords; // Update mouse pos so preview line starts from click position
                return;
            }

            // CONSTRAINT: Rect Tool - Start point clamped to canvas
            if (selection.mode === 'rect') {
                coords = {
                    x: Math.max(0, Math.min(width, coords.x)),
                    y: Math.max(0, Math.min(height, coords.y))
                };
            }

            const isInside = isPointInSelection(coords.x, coords.y);
            const isShift = e.shiftKey;
            const isAlt = e.altKey || e.metaKey;

            if (isShift) currentOpMode.current = 'add';
            else if (isAlt) currentOpMode.current = 'sub';
            else currentOpMode.current = 'new';

            // Interaction Logic
            if (currentOpMode.current === 'new') {
                // If clicking inside EXISTING selection (without modifiers), it's a DRAG
                if (selection.hasSelection && isInside && !isShift && !isAlt) {
                    // Wait until the pointer actually moves before cutting pixels for a drag.
                    // A simple click inside an existing selection should dismiss it instead.
                    pendingSelectionMoveRef.current = coords;
                    setIsDraggingSelection(false);
                    lastMousePosRef.current = coords;
                    return;
                } else {
                    // Start New Selection. If an existing selection was clicked outside,
                    // clear it immediately but wait for actual movement before drawing
                    // a replacement marquee.
                    if (floatingPixelsRef.current) commitFloatingPixels();
                    if (selection.hasSelection) {
                        clearSelection();
                        setUnifiedPath(null);
                        setSelectionPath([]);
                        pendingSelectionStartRef.current = coords;
                        setIsDragging(false);
                        lastMousePosRef.current = coords;
                        return;
                    }
                    setSelectionPath([coords]);
                    setIsDragging(true);
                    lastMousePosRef.current = coords;
                    return;
                }
            } else {
                // Add/Sub Mode (Shift/Alt)
                // Always commits old float first
                if (floatingPixelsRef.current) commitFloatingPixels();
                setSelectionPath([coords]);
                setIsDragging(true);
                lastMousePosRef.current = coords;
                return;
            }
        }

        // Brush
        if (activeTool === 'brush' || activeTool === 'eraser') {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) {
                console.error("Draw Failed: No active layer found for ID", activeLayerId);
                return;
            }
            plotPoint(coords.x, coords.y, activeLayer.ctx);
            activeLayer.markDirty(null);
            setIsDragging(true);
            lastMousePosRef.current = coords;
            leftoverDistance.current = 0;
            requestRender();
        }

        // Fill / Gradient tools are handled by the registered tools (src/tools/paintBucket.ts,
        // src/tools/gradient.ts) via dispatchToolPointer at the top of this handler.
        // Legacy inline branches were removed — they had hardcoded gradient origin (0,0)
        // and bypassed the new options/selection-mask logic.

        // Shape Tools (Rect, Circle)
        if (activeTool === 'shape-rect' || activeTool === 'shape-circle') {
            setIsDragging(true);
            lastMousePosRef.current = coords;
            // Store start point in selection path temporarily
            setSelectionPath([coords]);
        }
    };

    // Paint into the Quick Mask transient buffer. The buffer stores selected
    // coverage, so white/light paint adds to the selection and black/dark paint
    // (or Eraser) subtracts from it. The red overlay is rendered as its inverse.
    const paintQuickMaskDab = (x: number, y: number) => {
        let buf = quickMaskBufferRef.current;
        if (!buf || buf.width !== width || buf.height !== height) {
            buf = document.createElement('canvas');
            buf.width = width;
            buf.height = height;
            quickMaskBufferRef.current = buf;
            if (selectionMask) {
                const seedCtx = buf.getContext('2d');
                seedCtx?.drawImage(selectionMask, 0, 0);
            }
        }
        const bctx = buf.getContext('2d');
        if (!bctx) return;
        const radius = Math.max(0.5, brushSettings.size / 2);
        const opacity = Math.max(0, Math.min(1, brushSettings.opacity));
        if (opacity <= 0) return;
        const color = useEditorStore.getState().primaryColor;
        const r = parseInt(color.slice(1, 3), 16) || 0;
        const g = parseInt(color.slice(3, 5), 16) || 0;
        const b = parseInt(color.slice(5, 7), 16) || 0;
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const subtractsSelection = activeTool === 'eraser' || luminance < 128;
        bctx.save();
        bctx.globalAlpha = opacity;
        if (subtractsSelection) {
            bctx.globalCompositeOperation = 'destination-out';
        } else {
            bctx.globalCompositeOperation = 'source-over';
        }
        bctx.fillStyle = '#ffffff';
        bctx.beginPath();
        bctx.arc(x, y, radius, 0, Math.PI * 2);
        bctx.fill();
        bctx.restore();
        // Mirror onto the store so other listeners (and the post-Q convertor) see it.
        try {
            const data = bctx.getImageData(0, 0, width, height);
            useEditorStore.getState().setQuickMaskBuffer(data);
        } catch { /* node-canvas during tests may briefly fail; ignore */ }
        // Force the overlay's quick-mask cache to invalidate by clearing the
        // source ref so the next overlay frame re-builds it from the buffer.
        quickMaskCacheRef.current = null;
        quickMaskSourceRef.current = null;
    };

    // Plot Point helper (Updated for Clipping)
    const plotPoint = (x: number, y: number, targetCtx: CanvasRenderingContext2D) => {
        if (useEditorStore.getState().quickMaskMode) {
            paintQuickMaskDab(x, y);
            return;
        }
        const size = brushSettings.size;
        const hardness = Math.max(0, Math.min(1, brushSettings.hardness));
        const opacityCap = Math.max(0, Math.min(1, brushSettings.opacity));
        const flow = Math.max(0, Math.min(1, brushSettings.flow ?? 1));
        if (opacityCap <= 0 || flow <= 0) return;
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;
        if (activeLayer.lockTransparency) return;

        if (!strokeBufferRef.current || strokeBufferRef.current.layerId !== activeLayerId) {
            const base = activeLayer.ctx.getImageData(0, 0, width, height);
            strokeBufferRef.current = {
                layerId: activeLayerId!,
                base,
                work: new ImageData(new Uint8ClampedArray(base.data), width, height),
                coverage: new Float32Array(width * height),
            };
        }

        const buffer = strokeBufferRef.current;
        const color = useEditorStore.getState().primaryColor;
        const r = parseInt(color.slice(1, 3), 16) || 0;
        const g = parseInt(color.slice(3, 5), 16) || 0;
        const b = parseInt(color.slice(5, 7), 16) || 0;

        applyBrushDab({
            x,
            y,
            width,
            height,
            size,
            hardness,
            opacity: opacityCap,
            flow,
            color: { r, g, b },
            mode: activeTool === 'eraser' ? 'erase' : 'paint',
            base: buffer.base.data,
            work: buffer.work.data,
            coverage: buffer.coverage,
            selectionMask: selection.hasSelection ? selectionMaskFloat : null,
        });

        targetCtx.putImageData(buffer.work, 0, 0);
    };

    // Update small position-marks on the rulers via direct DOM (no React re-render).
    // Marks track the cursor in viewport-screen space so they stay aligned with the ruler tick numbers.
    const updateRulerCursor = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const screenX = clientX - rect.left - 20; // subtract vertical-ruler width
        const screenY = clientY - rect.top - 20;  // subtract horizontal-ruler height
        const h = hRulerMarkRef.current;
        const v = vRulerMarkRef.current;
        if (h) { h.style.transform = `translateX(${screenX}px)`; h.style.display = 'block'; }
        if (v) { v.style.transform = `translateY(${screenY}px)`; v.style.display = 'block'; }
    };
    const hideRulerCursor = () => {
        const h = hRulerMarkRef.current;
        const v = vRulerMarkRef.current;
        if (h) h.style.display = 'none';
        if (v) v.style.display = 'none';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (toolsBlocked) {
            updateRulerCursor(e.clientX, e.clientY);
            return;
        }
        dispatchToolPointer('move', e);
        const coords = getCanvasCoords(e);
        updateRulerCursor(e.clientX, e.clientY);

        // --- FREE EDIT DRAG ---
        // Free Edit Drag & Cursor (Deferred to Hook)
        handleFreeEditMove(e);

        if (activeTool === 'select' && pendingSelectionMoveRef.current) {
            if (e.buttons !== 1) return;
            const pending = pendingSelectionMoveRef.current;
            const moved = Math.hypot(coords.x - pending.x, coords.y - pending.y);
            if (moved < SELECTION_DRAG_THRESHOLD) return;
            if (!floatingPixelsRef.current) {
                ensureFloatingPixels();
            }
            setIsDraggingSelection(true);
            if (floatingPixelsRef.current) {
                floatingPixelsRef.current.x += coords.x - lastMousePos.x;
                floatingPixelsRef.current.y += coords.y - lastMousePos.y;
            }
            pendingSelectionMoveRef.current = null;
            lastMousePosRef.current = coords;
            requestRender();
            return;
        }

        if (activeTool === 'select' && pendingSelectionStartRef.current) {
            if (e.buttons !== 1) return;
            const start = pendingSelectionStartRef.current;
            const moved = Math.hypot(coords.x - start.x, coords.y - start.y);
            if (moved < SELECTION_DRAG_THRESHOLD) return;
            pendingSelectionStartRef.current = null;
            setSelectionPath([start, coords]);
            setIsDragging(true);
            lastMousePosRef.current = coords;
            return;
        }

        if (activeTool === 'select' && selection.isDraggingSelection && floatingPixelsRef.current) {
            // Recalculated above: const coords = getCanvasCoords(e);
            const dx = coords.x - lastMousePos.x;
            const dy = coords.y - lastMousePos.y;
            floatingPixelsRef.current.x += dx;
            floatingPixelsRef.current.y += dy;
            lastMousePosRef.current = coords;
            // dashOffset is animated by the overlay RAF loop — no explicit nudge needed here
            return;
        }

        // Lasso-poly: Always track mouse position for live preview line
        if (activeTool === 'select' && selection.mode === 'lasso-poly' && selection.polyPoints && selection.polyPoints.length > 0) {
            lastMousePosRef.current = coords;
            requestRender(); // Live preview line for poly lasso
            // Don't return - we still need to continue for other handling
        }

        if (activeTool === 'move') return;
        if (!isDragging) return;
        if (e.buttons === 4) {
            const dx = e.clientX - lastMousePos.x; const dy = e.clientY - lastMousePos.y;
            setPan(pan.x + dx, pan.y + dy);
            lastMousePosRef.current = { x: e.clientX, y: e.clientY };
            return;
        }
        let current = getCanvasCoords(e);
        if (activeTool === 'select') {
            // CONSTRAINT: Rect Tool - Drag point clamped to canvas
            if (selection.mode === 'rect') {
                current = {
                    x: Math.max(0, Math.min(width, current.x)),
                    y: Math.max(0, Math.min(height, current.y))
                };
            }

            if (selection.mode === 'lasso') {
                setSelectionPath([...selection.path, current]);
            } else {
                setSelectionPath([selection.path[0], current]);
            }
            return;
        }
        if (activeTool === 'brush' || activeTool === 'eraser') {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) return;
            const ctx = activeLayer.ctx;
            const dist = Math.hypot(current.x - lastMousePos.x, current.y - lastMousePos.y);
            const angle = Math.atan2(current.y - lastMousePos.y, current.x - lastMousePos.x);
            const spacingRatio = brushSettings.hardness > 0.9 ? 0.05 : 0.15;
            const spacing = Math.max(1, brushSettings.size * spacingRatio);
            const start = spacing - leftoverDistance.current;
            let i = start;
            while (i <= dist) {
                const px = lastMousePos.x + Math.cos(angle) * i;
                const py = lastMousePos.y + Math.sin(angle) * i;
                plotPoint(px, py, ctx);
                i += spacing;
            }
            activeLayer.markDirty(null);
            const lastStampPos = i - spacing;
            leftoverDistance.current = lastStampPos < start ? leftoverDistance.current + dist : dist - lastStampPos;
            lastMousePosRef.current = current;
            requestRender();
            return;
        }

    };

    const handleMouseUp = (e?: React.MouseEvent) => {
        if (toolsBlocked) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            return;
        }
        if (e) { dispatchToolPointer('up', e); requestRender(); }
        handleFreeEditUp();
        if (activeTransformRef.current) {
            activeTransformRef.current = null;
            setIsDragging(false);
            setUnifiedPathVersion(v => v + 1);
            return;
        }

        if (activeTool === 'select') {
            if (pendingSelectionMoveRef.current) {
                pendingSelectionMoveRef.current = null;
                setIsDraggingSelection(false);
                setIsDragging(false);
                return;
            }
            if (pendingSelectionStartRef.current) {
                pendingSelectionStartRef.current = null;
                setSelectionPath([]);
                setIsDragging(false);
                return;
            }
            if (isDragging) {
                if (selection.path.length > 1) {
                    setHasSelection(true);
                    const opMode = currentOpMode.current === 'sub' ? 'sub' : 'add';
                    addSelectionOperation({ mode: opMode, path: selection.path, type: selection.mode });
                    setSelectionPath([]); // Clear temp path
                }
            } else if (selection.isDraggingSelection && floatingPixelsRef.current) {
                // APPLY OFFSET TO SELECTION PATH & OPERATIONS
                const fp = floatingPixelsRef.current;
                const dx = fp.x - fp.lastCommitX;
                const dy = fp.y - fp.lastCommitY;

                // 1. Shift current single path (if any)
                if (selection.path.length > 0) {
                    const newPath = selection.path.map(p => ({ x: p.x + dx, y: p.y + dy }));
                    setSelectionPath(newPath);
                }

                // 2. Shift all operations
                if (selection.operations && selection.operations.length > 0) {
                    const newOps = selection.operations.map(op => ({
                        ...op,
                        path: op.path.map(p => ({ x: p.x + dx, y: p.y + dy }))
                    }));
                    setSelectionOperations(newOps);
                }

                staleDragOffset.current = { x: dx, y: dy };

                setIsDraggingSelection(false);
                floatingPixelsRef.current.lastCommitX = floatingPixelsRef.current.x;
                floatingPixelsRef.current.lastCommitY = floatingPixelsRef.current.y;
            }
        }

        if (strokeBufferRef.current && (activeTool === 'brush' || activeTool === 'eraser')) {
            strokeBufferRef.current = null;
        }

        // Gradient Tool — handled by src/tools/gradient.ts via dispatchToolPointer above.

        // Shape Tools - Draw on mouseUp
        if ((activeTool === 'shape-rect' || activeTool === 'shape-circle') && isDragging) {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (activeLayer && selection.path.length > 0) {
                const ctx = activeLayer.ctx;
                const start = selection.path[0];
                const end = lastMousePos; // Use lastMousePos as the end point

                ctx.save();
                ctx.fillStyle = useEditorStore.getState().primaryColor;
                ctx.strokeStyle = useEditorStore.getState().primaryColor;
                ctx.lineWidth = brushSettings.size / 5;

                const shapeSettings = useEditorStore.getState().shapeSettings;

                if (activeTool === 'shape-rect') {
                    const x = Math.min(start.x, end.x);
                    const y = Math.min(start.y, end.y);
                    const w = Math.abs(end.x - start.x);
                    const h = Math.abs(end.y - start.y);
                    if (shapeSettings.filled) {
                        ctx.fillRect(x, y, w, h);
                    } else {
                        ctx.strokeRect(x, y, w, h);
                    }
                } else if (activeTool === 'shape-circle') {
                    const centerX = (start.x + end.x) / 2;
                    const centerY = (start.y + end.y) / 2;
                    const radiusX = Math.abs(end.x - start.x) / 2;
                    const radiusY = Math.abs(end.y - start.y) / 2;
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                    if (shapeSettings.filled) {
                        ctx.fill();
                    } else {
                        ctx.stroke();
                    }
                }

                ctx.restore();
                activeLayer.markDirty(null);
                setSelectionPath([]);

                // Force render update
                useEditorStore.getState().toggleLayerVisibility(activeLayerId!);
                useEditorStore.getState().toggleLayerVisibility(activeLayerId!);
            }
        }

        setIsDragging(false);
    };

    const getCursor = () => {
        if (selection.isFreeEditMode) return freeEditCursor;
        if (activeTool === 'move') return 'move';
        if (SELECTION_CURSOR_TOOLS.has(activeTool)) {
            if (modifiers.shift && (modifiers.alt || modifiers.meta)) return CURSOR_INTERSECT;
            if (modifiers.shift) return CURSOR_ADD;
            if (modifiers.alt || modifiers.meta) return CURSOR_SUB;
            const op = getSelectionToolOperation();
            if (op === 'add') return CURSOR_ADD;
            if (op === 'sub') return CURSOR_SUB;
            if (op === 'intersect') return CURSOR_INTERSECT;
            return 'crosshair';
        }
        if (activeTool === 'clone-stamp' && modifiers.alt) return CURSOR_CLONE_SAMPLE;
        if (activeTool === 'fill') return 'cell';
        return 'crosshair';
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // Allow menu anywhere
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    // Close menu on click
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleFeather = () => {
        if (floatingPixelsRef.current) commitFloatingPixels();
        setFeatherDialogOpen(true);
    };

    // Layer via Copy/Cut handlers
    const handleLayerViaCopy = () => {
        if (!activeLayerId || !selection.hasSelection || !selectionMask) {
            console.warn("Copy aborted: Missing state", { activeLayerId, hasIdx: selection.hasSelection, mask: !!selectionMask });
            return;
        }
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;

        // If floating pixels exist, commit them first
        if (floatingPixelsRef.current) commitFloatingPixels();

        // Create Temp Canvas with Copied Pixels
        const tempC = document.createElement('canvas');
        tempC.width = width;
        tempC.height = height;
        const tCtx = tempC.getContext('2d');
        if (!tCtx) return;

        // Draw Source
        tCtx.drawImage(activeLayer.canvas, 0, 0);
        // Mask
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(selectionMask, 0, 0);

        // Add New Layer
        addLayerFromContent(tempC, `${activeLayer.name} Copy`, activeLayer.id);
        clearSelection();
        addLayerFromContent(tempC, `${activeLayer.name} Copy`, activeLayer.id);
        clearSelection();
    };

    const handleFreeEditLayer = () => {
        if (!activeLayerId) return;
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;

        const hasBounds = activeLayer.kind === 'type'
            ? !!activeLayer.typeData
            : !!getLayerContentBounds(activeLayer.canvas);
        if (!hasBounds) {
            setErrorMessage("Nothing to edit");
            setTimeout(() => setErrorMessage(null), 2000);
            return;
        }

        window.dispatchEvent(new CustomEvent(START_FREE_TRANSFORM_EVENT, { detail: { layerId: activeLayer.id } }));
    };

    const handleLayerViaCut = () => {
        if (!activeLayerId || !selection.hasSelection && !floatingPixelsRef.current) return;
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;

        // OPTIMIZATION: If we are already dragging (Floating), those pixels are ALREADY cut.
        // We just need to move that Floating Canvas to a new Layer and clear the float state.
        if (floatingPixelsRef.current) {
            const fp = floatingPixelsRef.current;
            // Ensure the new layer is positioned correctly relative to the float's current position?
            // addLayerFromContent expects a canvas.
            // If the float is offset (fp.x, fp.y), we should probably draw it onto a full-size canvas first 
            // so it aligns with the viewport, OR update addLayerFromContent to handle offsets.
            // Current addLayerFromContent draws at 0,0.

            const tempC = document.createElement('canvas');
            tempC.width = width;
            tempC.height = height;
            const tCtx = tempC.getContext('2d');
            if (tCtx) {
                tCtx.drawImage(fp.canvas, fp.x, fp.y);
                addLayerFromContent(tempC, `${activeLayer.name} Cut`, activeLayer.id);
            }

            // Clear Float without committing (Hole persists in source, which is desired for Cut)
            floatingPixelsRef.current = null;
            setIsDragging(false);
            clearSelection();
            return;
        }

        // Standard Logic (Commit verified elsewhere)
        // 1. Copy Logic
        const tempC = document.createElement('canvas');
        tempC.width = width;
        tempC.height = height;
        const tCtx = tempC.getContext('2d');
        if (!tCtx) return;
        tCtx.drawImage(activeLayer.canvas, 0, 0);
        tCtx.globalCompositeOperation = 'destination-in';
        tCtx.drawImage(selectionMask!, 0, 0); // checked by hasSelection/mask check usually

        addLayerFromContent(tempC, `${activeLayer.name} Cut`, activeLayer.id);

        // 2. Cut Logic (Remove from Source)
        const ctx = activeLayer.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(selectionMask!, 0, 0);
        ctx.restore();

        clearSelection();
    };

    // Handle image / .pwbdoc file drop. Routes through the shared ingest
    // pipeline: each image adds as a layer; if no document is open, the
    // first image opens a new document. .pwbdoc native files take the
    // load-from-localStorage path.
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        void ingestFiles(files, { treatFirstAsNewDoc: true }).then(summary => {
            const toast = summaryToast(summary);
            if (toast) useEditorStore.getState().addToast(toast.message, toast.level);
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const getDocumentOffset = () => {
        const container = containerRef.current;
        const doc = container?.querySelector('[data-photoweb-document]') as HTMLElement | null;
        if (container && doc) {
            const containerRect = container.getBoundingClientRect();
            const docRect = doc.getBoundingClientRect();
            return {
                left: docRect.left - containerRect.left,
                top: docRect.top - containerRect.top,
            };
        }
        return {
            left: (container?.offsetWidth ?? 0) / 2 - (width * zoom) / 2 + pan.x,
            top: (container?.offsetHeight ?? 0) / 2 - (height * zoom) / 2 + pan.y,
        };
    };

    return (
        <div ref={containerRef}
            data-testid="viewport-workarea"
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
            onMouseLeave={(e) => { hideRulerCursor(); handleMouseUp(e); }}
            onWheel={handleWheel} onContextMenu={handleContextMenu}
            onDrop={handleDrop} onDragOver={handleDragOver}
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: getCursor(), position: 'relative' }}>

            {/* Horizontal ruler — `left: 20` is the vertical ruler's width; subtract it from
                tick screenX so the numbers line up with the canvas in container coords. */}
            {showRulers && (
                <div style={{ position: 'absolute', top: 0, left: 20, right: 0, height: '20px', background: '#2a2a2a', borderBottom: '1px solid #444', overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
                    {Array.from({ length: Math.ceil(width / 50) + 1 }, (_, i) => { // eslint-disable-line react-hooks/refs
                        const canvasX = i * 50;
                        const documentOffset = getDocumentOffset();
                        const screenX = documentOffset.left - 20 + canvasX * zoom;
                        return (
                            <div key={i} style={{ position: 'absolute', left: screenX, top: 0, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '1px', height: '8px', background: '#666', marginTop: '12px' }} />
                                <span style={{ fontSize: '9px', color: '#888', position: 'absolute', top: '1px', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}>{canvasX}</span>
                            </div>
                        );
                    })}
                    {/* Cursor mark — positioned via direct DOM mutation in updateRulerCursor */}
                    <div ref={hRulerMarkRef} style={{
                        position: 'absolute', top: 0, left: 0, width: 1, height: '100%',
                        background: 'hsl(var(--accent-primary))',
                        display: 'none', pointerEvents: 'none',
                        willChange: 'transform',
                    }} />
                </div>
            )}

            {/* Vertical ruler — `top: 20` is the horizontal ruler's height; subtract it from
                tick screenY so the numbers line up with the canvas in container coords. */}
            {showRulers && (
                <div style={{ position: 'absolute', top: 20, left: 0, bottom: 0, width: '20px', background: '#2a2a2a', borderRight: '1px solid #444', overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
                    {Array.from({ length: Math.ceil(height / 50) + 1 }, (_, i) => { // eslint-disable-line react-hooks/refs
                        const canvasY = i * 50;
                        const documentOffset = getDocumentOffset();
                        const screenY = documentOffset.top - 20 + canvasY * zoom;
                        return (
                            <div key={i} style={{ position: 'absolute', top: screenY, left: 0, width: '100%', display: 'flex', alignItems: 'center' }}>
                                <div style={{ height: '1px', width: '8px', background: '#666', marginLeft: '12px' }} />
                                <span style={{ fontSize: '9px', color: '#888', position: 'absolute', left: '1px', transform: 'translateY(-50%)', writingMode: 'vertical-rl', whiteSpace: 'nowrap' }}>{canvasY}</span>
                            </div>
                        );
                    })}
                    <div ref={vRulerMarkRef} style={{
                        position: 'absolute', top: 0, left: 0, height: 1, width: '100%',
                        background: 'hsl(var(--accent-primary))',
                        display: 'none', pointerEvents: 'none',
                        willChange: 'transform',
                    }} />
                </div>
            )}

            <div data-photoweb-document style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.5)', background: 'white', position: 'relative', overflow: 'visible' }}>
                <canvas ref={canvasRef} width={width} height={height} style={{ width: `${width}px`, height: `${height}px`, display: 'block', imageRendering: 'auto' }} />
                <canvas
                    ref={overlayCanvasRef}
                    width={width + overlayPad.left + overlayPad.right}
                    height={height + overlayPad.top + overlayPad.bottom}
                    style={{
                        position: 'absolute',
                        top: `${-overlayPad.top}px`,
                        left: `${-overlayPad.left}px`,
                        width: `${width + overlayPad.left + overlayPad.right}px`,
                        height: `${height + overlayPad.top + overlayPad.bottom}px`,
                        pointerEvents: 'none',
                        imageRendering: 'auto',
                    }}
                />
                <TypeLayerVisuals />
                <TypeOverlayMount />
            </div>

            {/* Empty state overlay */}
            {layers.length === 0 && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    pointerEvents: 'none',
                    color: '#666',
                    fontSize: '14px',
                }}>
                    <div style={{ fontSize: '48px', opacity: 0.3 }}>+</div>
                    <div>Open or drop an image to begin</div>
                    <div style={{ fontSize: '12px', opacity: 0.6 }}>Drop an image file here, or use File &gt; Open</div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <div style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    backgroundColor: 'hsl(var(--bg-panel))',
                    border: '1px solid hsl(var(--border-light))',
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    minWidth: '150px',
                    padding: '4px 0',
                    display: 'flex',
                    flexDirection: 'column'
                }} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>

                    {/* OPTION 1: Selection Actions */}
                    {selection.hasSelection && (
                        <>
                            <button style={menuItemStyle} onClick={() => {
                                useEditorStore.getState().openTransformSelection();
                                setContextMenu(null);
                            }}>
                                Transform Selection
                            </button>
                            <button style={menuItemStyle} onClick={() => {
                                if (selection.isFreeEditMode) {
                                    // Already in mode
                                } else {
                                    setFreeEditMode(true);
                                }
                                setContextMenu(null);
                            }}>
                                Free Transform
                            </button>
                            <button style={menuItemStyle} onClick={() => {
                                if (floatingPixelsRef.current) commitFloatingPixels();
                                clearSelection();
                                setContextMenu(null);
                            }}>
                                Cancel Selection
                            </button>
                            <button style={menuItemStyle} onClick={() => {
                                if (floatingPixelsRef.current) commitFloatingPixels();
                                toggleInvertSelection();
                                setContextMenu(null);
                            }}>
                                Invert Selection
                            </button>
                            <button style={menuItemStyle} onClick={() => { handleFeather(); setContextMenu(null); }}>
                                Feather...
                            </button>
                            <div style={{ height: '1px', background: 'hsl(var(--border-light))', margin: '4px 0' }} />
                            <button style={menuItemStyle} onClick={() => { handleLayerViaCopy(); setContextMenu(null); }}>
                                Layer via Copy
                            </button>
                            <button style={menuItemStyle} onClick={() => { handleLayerViaCut(); setContextMenu(null); }}>
                                Layer via Cut
                            </button>
                        </>
                    )}

                    {/* OPTION 2: No Selection -> Free Edit Layer */}
                    {!selection.hasSelection && (
                        <button style={menuItemStyle} onClick={() => {
                            handleFreeEditLayer();
                            setContextMenu(null);
                        }}>
                            Free Edit Layer
                        </button>
                    )}
                </div>
            )}

            {/* Error Toast */}
            {errorMessage && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'hsl(var(--destructive))',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 2000,
                    fontSize: '14px',
                    fontWeight: 500,
                    pointerEvents: 'none',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <AlertCircle size={18} />
                    {errorMessage}
                </div>
            )}
        </div>
    );
}

// Memoize: Viewport only re-renders when subscribed store fields or props change.
export const Viewport = memo(ViewportComponent);

const menuItemStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    padding: '8px 12px',
    color: 'hsl(var(--text-main))',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none',
    display: 'block',
    width: '100%'
};
