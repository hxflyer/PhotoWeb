import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { superFastBlur, superFastBlurToFloat32, getLayerContentBounds } from '../../utils/canvasUtils';
import { useEditorStore } from '../../store/editorStore';
import type { SelectionMode } from '../../store/editorStore';
import { useFreeEdit } from '../../hooks/useFreeEdit';
import { getSelectionBounds } from '../../utils/selectionUtils';
import { getTransformedHandles } from '../../utils/geometryUtils';
import { ensureStubsRegistered } from '../../tools/stubs';
import { getTool } from '../../tools/registry';
import type { ToolKeyEvent, ToolPointerEvent } from '../../tools/Tool';
import { Canvas2DCompositor } from '../../compositor/Canvas2DCompositor';

// Custom Cursor SVGs
const CURSOR_ADD = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L12 22M2 12L22 12" stroke="white" stroke-width="4"/><path d="M12 2L12 22M2 12L22 12" stroke="black" stroke-width="2"/></svg>') 12 12, crosshair`;
const CURSOR_SUB = `url('data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 12L22 12" stroke="white" stroke-width="4"/><path d="M2 12L22 12" stroke="black" stroke-width="2"/></svg>') 12 12, crosshair`;

export function Viewport() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const {
        width, height, zoom, pan,
        activeTool, setPan, setZoom,
        layers, activeLayerId, brushSettings, primaryColor,
        selection, setSelectionPath, setHasSelection, setIsDraggingSelection, clearSelection,
        addSelectionOperation, setSelectionOperations, setFreeEditMode, setPolyPoints
    } = useEditorStore();

    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const currentOpMode = useRef<'add' | 'sub' | 'new'>('new');
    const [modifiers, setModifiers] = useState({ shift: false, alt: false, meta: false });
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Tool registry plumbing (Phase 0.3). Stubs exist for every active tool ID;
    // pointer/key events are dispatched to the active Tool first, then the legacy
    // inline branches handle whatever the Tool doesn't claim.
    useEffect(() => { ensureStubsRegistered(); }, []);

    // Compositor for layer composite. Selection overlays etc. still draw inline.
    const compositorRef = useRef(new Canvas2DCompositor());


    // Cached Unified Outline Path
    const [unifiedPath, setUnifiedPath] = useState<Path2D | null>(null);
    const [unifiedPathVersion, setUnifiedPathVersion] = useState(0);

    // Stale Offset (Gap between drag end and tracer finish)
    const staleDragOffset = useRef({ x: 0, y: 0 });





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

    // Polygonal Lasso Keyboard Handlers
    useEffect(() => {
        const handlePolyKeys = (e: KeyboardEvent) => {
            if (selection.mode !== 'lasso-poly') return;

            if (e.key === 'Enter') {
                // Commit selection if we have at least 3 points
                if (selection.polyPoints && selection.polyPoints.length > 2) {
                    setSelectionPath(selection.polyPoints);
                    setHasSelection(true);
                    addSelectionOperation({ mode: 'add', path: selection.polyPoints, type: 'lasso-poly' });
                    setPolyPoints([]);
                }
            }
            if (e.key === 'Escape') {
                // Cancel drawing
                setPolyPoints([]);
            }
            if (e.key === 'Backspace') {
                // Remove last point
                if (selection.polyPoints && selection.polyPoints.length > 0) {
                    setPolyPoints(selection.polyPoints.slice(0, -1));
                }
            }
        };
        window.addEventListener('keydown', handlePolyKeys);
        return () => window.removeEventListener('keydown', handlePolyKeys);
    }, [selection.mode, selection.polyPoints, setSelectionPath, setHasSelection, addSelectionOperation, setPolyPoints]);





    // Stroke buffer for high-quality masked painting
    // Accumulates paint during stroke, mask is applied once on mouse up
    interface StrokeBuffer {
        canvas: HTMLCanvasElement;
        ctx: CanvasRenderingContext2D;
        layerId: string;
        layerSnapshot: ImageData;
        previewCanvas: HTMLCanvasElement; // Reusable preview canvas
        previewCtx: CanvasRenderingContext2D;
        lastPreviewTime: number; // For throttling
    }
    const strokeBufferRef = useRef<StrokeBuffer | null>(null);

    // Animation
    const [dashOffset, setDashOffset] = useState(0);
    useEffect(() => {
        if (selection.hasSelection || (activeTool === 'select' && isDragging)) {
            let frameId: number;
            const animate = () => {
                setDashOffset(prev => (prev + 0.5) % 16);
                frameId = requestAnimationFrame(animate);
            };
            frameId = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(frameId);
        }
    }, [selection.hasSelection, activeTool, isDragging]);

    const leftoverDistance = useRef(0);
    const brushTipRef = useRef<HTMLCanvasElement | null>(null);

    // --- Helpers ---
    const drawShape = (ctx: CanvasRenderingContext2D, pathData: { x: number, y: number }[], mode: SelectionMode) => {
        if (pathData.length < 2 && (mode === 'rect' || mode === 'circle')) return;
        ctx.beginPath();
        if (mode === 'rect') {
            const [p1, p2] = pathData;
            ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        } else if (mode === 'circle') {
            const [p1, p2] = pathData;
            const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            const rx = Math.abs(p1.x - p2.x) / 2;
            const ry = Math.abs(p1.y - p2.y) / 2;
            // Draw Ellipse
            ctx.ellipse(center.x, center.y, rx, ry, 0, 0, Math.PI * 2);
        } else {
            if (pathData.length === 0) return;
            ctx.moveTo(pathData[0].x, pathData[0].y);
            for (let i = 1; i < pathData.length; i++) ctx.lineTo(pathData[i].x, pathData[i].y);
            ctx.closePath();
        }
    };

    // -- Composition Render --
    // -- Composition Render --
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const compositor = compositorRef.current;
        const viewportInfo = { width, height, zoom, pan };
        compositor.beginFrame(canvas);
        compositor.render({ layers, activeLayerId, viewport: viewportInfo, target: canvas });
        compositor.present();

        // Floating-pixels preview is layered on top of the active layer composite.
        layers.forEach(layer => {
            if (layer.visible && layer.canvas) {
                if (layer.id === activeLayerId && floatingPixelsRef.current) {
                    const fp = floatingPixelsRef.current;
                    ctx.save();
                    const bounds = getSelectionBounds(selection.path || [], selection.operations || [], selection.hasSelection, width, height);
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

        // DRAW SELECTION
        if (!selection.isFreeEditMode && (selection.hasSelection || (activeTool === 'select' && isDragging))) {
            ctx.save();
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 4 / zoom]);

            // Handle Pixel Move Offset
            let offsetX = 0;
            let offsetY = 0;
            if (floatingPixelsRef.current && selection.isDraggingSelection) {
                offsetX = floatingPixelsRef.current.x - floatingPixelsRef.current.lastCommitX;
                offsetY = floatingPixelsRef.current.y - floatingPixelsRef.current.lastCommitY;
            } else if (staleDragOffset.current.x !== 0 || staleDragOffset.current.y !== 0) {
                // Use cached offset during calculation gap
                offsetX = staleDragOffset.current.x;
                offsetY = staleDragOffset.current.y;
            }

            ctx.translate(offsetX, offsetY);

            // 1. Draw Unified Path (Always if available)
            if (unifiedPath) {
                // Inner Edge Rendering: Clip to path, then draw Double Width stroke (half clipped out)
                ctx.save();
                // Offset Unified Path (Marching Squares) strictly by 0.5 to land on pixel boundary
                ctx.translate(0.5, 0.5);

                ctx.clip(unifiedPath);
                ctx.lineWidth = 2 / zoom;

                ctx.strokeStyle = '#000';
                ctx.lineDashOffset = -dashOffset / zoom;
                ctx.stroke(unifiedPath);

                ctx.strokeStyle = '#FFF';
                ctx.lineDashOffset = (-dashOffset / zoom) + (4 / zoom);
                ctx.stroke(unifiedPath);
                ctx.restore();
            }

            // 2. Draw Active Dragging Path (Preview)
            if (activeTool === 'select' && isDragging && !selection.isDraggingSelection && selection.path.length > 0) {
                const drawDashedShape = (path: { x: number, y: number }[], mode: SelectionMode) => {
                    ctx.save();
                    drawShape(ctx, path, mode);
                    ctx.clip(); // Inner alignment

                    // Re-draw path to stroke it
                    drawShape(ctx, path, mode);
                    ctx.lineWidth = 2 / zoom;

                    ctx.strokeStyle = '#000';
                    ctx.lineDashOffset = -dashOffset / zoom;
                    ctx.stroke();
                    ctx.strokeStyle = '#FFF';
                    ctx.lineDashOffset = (-dashOffset / zoom) + (4 / zoom);
                    ctx.stroke();
                    ctx.restore();
                };
                drawDashedShape(selection.path, selection.mode);
            }

            // 3. Draw Pending Operations (Not yet in Unified Path)
            // This fills the gap between "Mouse Up" (Op added) and "Tracer Finish" (Unified Updated)
            if (unifiedPath && selection.operations && selection.operations.length > unifiedPathVersion) {
                const drawDashedShape = (path: { x: number, y: number }[], mode: SelectionMode) => {
                    ctx.save();
                    drawShape(ctx, path, mode);
                    ctx.clip();
                    ctx.lineWidth = 2 / zoom;

                    ctx.strokeStyle = '#000';
                    ctx.lineDashOffset = -dashOffset / zoom;
                    ctx.stroke();
                    ctx.strokeStyle = '#FFF';
                    ctx.lineDashOffset = (-dashOffset / zoom) + (4 / zoom);
                    ctx.stroke();
                    ctx.restore();
                };
                // Draw only the new operations
                for (let i = unifiedPathVersion; i < selection.operations.length; i++) {
                    const op = selection.operations[i];
                    drawDashedShape(op.path, op.type);
                }
            }

            // 4. Fallback (No Unified Path at all)
            else if (!unifiedPath && selection.hasSelection) {
                const drawDashedShape = (path: { x: number, y: number }[], mode: SelectionMode) => {
                    ctx.save();
                    drawShape(ctx, path, mode);
                    ctx.clip();
                    ctx.lineWidth = 2 / zoom;

                    ctx.strokeStyle = '#000';
                    ctx.lineDashOffset = -dashOffset / zoom;
                    ctx.stroke();
                    ctx.strokeStyle = '#FFF';
                    ctx.lineDashOffset = (-dashOffset / zoom) + (4 / zoom);
                    ctx.stroke();
                    ctx.restore();
                };
                if (selection.operations && selection.operations.length > 0) {
                    selection.operations.forEach(op => drawDashedShape(op.path, op.type));
                } else {
                    drawDashedShape(selection.path, selection.mode);
                }
            }

            ctx.restore();
        }

        // Draw Free Edit Bounding Box
        if (selection.isFreeEditMode && (selection.hasSelection || (selection.operations && selection.operations.length > 0))) {
            const bounds = getSelectionBounds(selection.path || [], selection.operations || [], selection.hasSelection, width, height);
            if (bounds) {
                const tHandles = getTransformedHandles(bounds, floatingPixelsRef.current || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });

                ctx.save();
                ctx.strokeStyle = '#3b82f6'; // Light blue
                ctx.lineWidth = 1 / zoom;
                ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';

                if (tHandles) {
                    const { nw, ne, se, sw, n, e, s, w: wHandle } = tHandles;

                    ctx.beginPath();
                    ctx.moveTo(nw.x, nw.y);
                    ctx.lineTo(ne.x, ne.y);
                    ctx.lineTo(se.x, se.y);
                    ctx.lineTo(sw.x, sw.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    // 8 Handles
                    const handleSize = 8 / zoom;
                    const halfHandle = handleSize / 2;
                    ctx.fillStyle = '#fff';

                    [nw, n, ne, e, se, s, sw, wHandle].forEach(p => {
                        ctx.beginPath();
                        ctx.rect(p.x - halfHandle, p.y - halfHandle, handleSize, handleSize);
                        ctx.fill();
                        ctx.stroke();
                    });
                } else {
                    // Fallback (Static)
                    // ... (Fallback omitted as tHandles handles null fallback internally mostly, but if bounds exists and no transform?)
                    // If no floatingPixels, tHandles might use default identity.
                    // But if floatingPixelsRef is null, getTransformedHandles uses identity.
                    // So we can simplify.
                }
                ctx.restore();
            }
        }

        // Draw Polygonal Lasso Preview (Active Points)
        if (activeTool === 'select' && selection.mode === 'lasso-poly' && selection.polyPoints && selection.polyPoints.length > 0) {
            ctx.save();
            ctx.lineWidth = 1.5 / zoom;
            ctx.strokeStyle = '#000';
            ctx.setLineDash([4 / zoom, 4 / zoom]);

            ctx.beginPath();
            ctx.moveTo(selection.polyPoints[0].x, selection.polyPoints[0].y);
            for (let i = 1; i < selection.polyPoints.length; i++) {
                ctx.lineTo(selection.polyPoints[i].x, selection.polyPoints[i].y);
            }
            // Line to current mouse (lastMousePos is already in canvas coordinates)
            ctx.lineTo(lastMousePos.x, lastMousePos.y);

            ctx.stroke();

            // Draw points
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#000';
            ctx.setLineDash([]);
            selection.polyPoints.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3 / zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });

            ctx.restore();
        }

    }, [layers, activeLayerId, width, height, selection, dashOffset, isDragging, unifiedPath, lastMousePos]);

    // Free Edit Initialization
    useEffect(() => {
        if (selection.isFreeEditMode) {
            ensureFloatingPixels();
            // Force re-render to show transformed handles
            setUnifiedPathVersion(v => v);
        }
    }, [selection.isFreeEditMode]);


    // ... Brush ...
    useEffect(() => {
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
                const tempDiv = document.createElement('div');
                tempDiv.style.color = colorStr;
                document.body.appendChild(tempDiv);
                const rgbStr = window.getComputedStyle(tempDiv).color;
                document.body.removeChild(tempDiv);
                const match = rgbStr.match(/\d+/g);
                if (match && match.length >= 3) return { r: parseInt(match[0]), g: parseInt(match[1]), b: parseInt(match[2]) };
                return { r: 0, g: 0, b: 0 };
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
    }, [brushSettings.size, brushSettings.hardness, primaryColor, activeTool]);


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
            pressure: native && 'pressure' in native ? native.pressure : 0.5,
            pointerType: (native && 'pointerType' in native ? native.pointerType : 'mouse') as 'mouse' | 'pen' | 'touch',
            rawEvent: native,
        };
    };

    const dispatchToolPointer = (
        kind: 'down' | 'move' | 'up',
        e: React.MouseEvent,
    ): void => {
        const tool = getTool(activeTool);
        if (!tool) return;
        const handler = kind === 'down' ? tool.onPointerDown : kind === 'move' ? tool.onPointerMove : tool.onPointerUp;
        if (!handler) return;
        const evt = buildToolPointerEvent(e);
        const store = useEditorStore.getState();
        handler(evt, {
            store,
            getStore: () => useEditorStore.getState(),
            requestRender: () => {},
        });
    };

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
            requestRender: () => {},
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
        let inside = false;
        if (selection.operations && selection.operations.length > 0) {
            selection.operations.forEach(op => {
                const inShape = isPointInShape(op.path, op.type, x, y);
                if (op.mode === 'add') inside = inside || inShape;
                else if (op.mode === 'sub') inside = inside && !inShape;
            });
        }
        if ((!selection.operations || selection.operations.length === 0) && selection.hasSelection) {
            return isPointInShape(selection.path, selection.mode, x, y);
        }
        return inside;
    };


    // Cached Mask for Clipping / Operations
    const [selectionMask, setSelectionMask] = useState<HTMLCanvasElement | null>(null);
    // Float32 mask for high-precision brush operations (normalized 0-1)
    const [selectionMaskFloat, setSelectionMaskFloat] = useState<Float32Array | null>(null);

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

    // Track Context Menu
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
    const { toggleInvertSelection, addLayerFromContent, setFeatherDialogOpen } = useEditorStore(); // Get actions

    // Update Mask when selection changes
    useEffect(() => {
        if (!selection.hasSelection && (!selection.operations || selection.operations.length === 0)) {
            setSelectionMask(null);
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
                drawShape(tempCtx, op.path, op.type);
                tempCtx.fill();
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
    }, [selection, width, height]);

    // TRACE SELECTION OUTLINE (Walk the Marching Squares)
    useEffect(() => {
        if (!selectionMask) {
            setUnifiedPath(null);
            return;
        }

        const mCanvas = selectionMask;
        const ctx = mCanvas.getContext('2d');
        if (!ctx) return;

        const w = mCanvas.width;
        const h = mCanvas.height;
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data; // RGBA

        const grid = (x: number, y: number) => {
            if (x < 0 || x >= w || y < 0 || y >= h) return 0;
            // Red channel > 10 (White=255, Transparent=0) - Sensitive threshold for soft selections
            return data[(y * w + x) * 4] > 10 ? 1 : 0;
        };

        const path = new Path2D();
        const step = 1; // High precision for interactions

        const segments: { p1: { x: number, y: number }, p2: { x: number, y: number } }[] = [];

        for (let y = -step; y < h; y += step) {
            for (let x = -step; x < w; x += step) {
                const tl = grid(x, y);
                const tr = grid(x + step, y);
                const br = grid(x + step, y + step);
                const bl = grid(x, y + step);

                const idx = (tl << 3) | (tr << 2) | (br << 1) | bl;
                if (idx === 0 || idx === 15) continue;

                const a = { x: x + step / 2, y: y };
                const b = { x: x + step, y: y + step / 2 };
                const c = { x: x + step / 2, y: y + step };
                const d = { x: x, y: y + step / 2 };

                switch (idx) {
                    case 1: segments.push({ p1: d, p2: c }); break;
                    case 2: segments.push({ p1: c, p2: b }); break;
                    case 3: segments.push({ p1: d, p2: b }); break;
                    case 4: segments.push({ p1: b, p2: a }); break;
                    case 5: segments.push({ p1: d, p2: a }); segments.push({ p1: c, p2: b }); break;
                    case 6: segments.push({ p1: c, p2: a }); break;
                    case 7: segments.push({ p1: d, p2: a }); break;
                    case 8: segments.push({ p1: a, p2: d }); break;
                    case 9: segments.push({ p1: a, p2: c }); break;
                    case 10: segments.push({ p1: a, p2: d }); segments.push({ p1: c, p2: b }); break;
                    case 11: segments.push({ p1: a, p2: b }); break;
                    case 12: segments.push({ p1: b, p2: d }); break;
                    case 13: segments.push({ p1: b, p2: c }); break;
                    case 14: segments.push({ p1: c, p2: d }); break;
                }
            }
        }

        if (segments.length === 0) {
            setUnifiedPath(null);
            return;
        }

        // Build Graph
        const adj = new Map<string, { p: { x: number, y: number }, key: string }[]>();
        const toKey = (p: { x: number, y: number }) => `${p.x},${p.y}`;

        segments.forEach(s => {
            const k1 = toKey(s.p1);
            const k2 = toKey(s.p2);
            if (!adj.has(k1)) adj.set(k1, []);
            if (!adj.has(k2)) adj.set(k2, []);
            adj.get(k1)!.push({ p: s.p2, key: k2 });
            adj.get(k2)!.push({ p: s.p1, key: k1 });
        });

        const visitedEdges = new Set<string>();
        const getEdgeKey = (k1: string, k2: string) => k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
        let pathCount = 0;

        for (const [startKey, neighbors] of adj) {
            if (!neighbors) continue;
            for (const n of neighbors) {
                const edgeKey = getEdgeKey(startKey, n.key);
                if (visitedEdges.has(edgeKey)) continue;

                path.moveTo(parseFloat(startKey.split(',')[0]), parseFloat(startKey.split(',')[1]));
                let currKey = startKey;
                let loopActive = true;
                let nextNode = n;

                while (loopActive) {
                    path.lineTo(nextNode.p.x, nextNode.p.y);
                    visitedEdges.add(getEdgeKey(currKey, nextNode.key));

                    currKey = nextNode.key;
                    const nextNeighbors = adj.get(currKey);
                    let foundNext = false;

                    if (nextNeighbors) {
                        for (const nn of nextNeighbors) {
                            const ek = getEdgeKey(currKey, nn.key);
                            if (!visitedEdges.has(ek)) {
                                nextNode = nn;
                                foundNext = true;
                                break;
                            }
                        }
                    }
                    if (!foundNext) loopActive = false;
                }
                pathCount++;
            }
        }
        setUnifiedPath(pathCount > 0 ? path : null);
        staleDragOffset.current = { x: 0, y: 0 }; // Clear stale offset now that we have new path
        if (selection.operations) {
            setUnifiedPathVersion(selection.operations.length);
        } else {
            setUnifiedPathVersion(0);
        }
    }, [selectionMask]);




    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            const newZoom = Math.min(Math.max(0.1, zoom + delta), 5);
            setZoom(newZoom);
        } else {
            setPan(pan.x - e.deltaX, pan.y - e.deltaY);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        dispatchToolPointer('down', e);
        // Move tool fully owns canvas panning via the Tool interface.
        if (activeTool === 'move') return;
        if (e.button === 1) {
            setIsDragging(true); setLastMousePos({ x: e.clientX, y: e.clientY }); return;
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
                setLastMousePos(coords); // Update mouse pos so preview line starts from click position
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
                    // Start Drag
                    // If we have floating pixels, we continue dragging them
                    // If NOT, we must CUT them from layer
                    if (!floatingPixelsRef.current) {
                        ensureFloatingPixels();
                    }
                    setIsDraggingSelection(true);
                    setLastMousePos(coords);
                    return;
                } else {
                    // Start New Selection
                    if (floatingPixelsRef.current) commitFloatingPixels();
                    if (selection.hasSelection) { clearSelection(); setUnifiedPath(null); }
                    setSelectionPath([coords]);
                    setIsDragging(true);
                    setLastMousePos(coords);
                    return;
                }
            } else {
                // Add/Sub Mode (Shift/Alt)
                // Always commits old float first
                if (floatingPixelsRef.current) commitFloatingPixels();
                setSelectionPath([coords]);
                setIsDragging(true);
                setLastMousePos(coords);
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
            setLastMousePos(coords);
        }

        // Clone Stamp Tool
        if (activeTool === 'clone-stamp') {
            // Alt+Click = Set Source Point
            if (e.altKey) {
                useEditorStore.getState().setCloneSource({ x: coords.x, y: coords.y });
                return;
            }

            // Normal click = Start cloning (need source set)
            const cloneSource = useEditorStore.getState().cloneSource;
            if (!cloneSource) {
                console.warn("Clone Stamp: No source set. Alt+Click to set source.");
                return;
            }

            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) return;

            // Start painting from source
            setIsDragging(true);
            setLastMousePos(coords);
        }

        // Fill Tool
        if (activeTool === 'fill') {
            // Commit any floating pixels first (from dragged selection)
            if (floatingPixelsRef.current) {
                commitFloatingPixels();
            }

            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) {
                console.error("Fill Failed: No active layer found for ID", activeLayerId);
                return;
            }

            // Fill with foreground color into the selection (or entire canvas if no selection)
            const ctx = activeLayer.ctx;

            if (selection.hasSelection && selectionMaskFloat) {
                // Fill using Float32 mask for proper feathering
                activeLayer.markDirty(null);
                const imageData = ctx.getImageData(0, 0, width, height);
                const pixels = imageData.data;

                // Parse foreground color
                const r = parseInt(primaryColor.slice(1, 3), 16);
                const g = parseInt(primaryColor.slice(3, 5), 16);
                const b = parseInt(primaryColor.slice(5, 7), 16);

                for (let i = 0; i < width * height; i++) {
                    const maskValue = selectionMaskFloat[i];
                    if (maskValue > 0) {
                        const idx = i * 4;

                        // Source: fill color with alpha = maskValue
                        const srcA = maskValue;

                        // Destination: existing pixel (normalized)
                        const dstR = pixels[idx];
                        const dstG = pixels[idx + 1];
                        const dstB = pixels[idx + 2];
                        const dstA = pixels[idx + 3] / 255;

                        // Porter-Duff "source-over" compositing
                        const outA = srcA + dstA * (1 - srcA);

                        if (outA > 0) {
                            // Blend RGB using proper alpha composite formula
                            pixels[idx] = Math.round((r * srcA + dstR * dstA * (1 - srcA)) / outA);
                            pixels[idx + 1] = Math.round((g * srcA + dstG * dstA * (1 - srcA)) / outA);
                            pixels[idx + 2] = Math.round((b * srcA + dstB * dstA * (1 - srcA)) / outA);
                            pixels[idx + 3] = Math.round(outA * 255);
                        } else {
                            pixels[idx + 3] = 0;
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            } else {
                // No selection - fill entire canvas
                ctx.save();
                ctx.fillStyle = primaryColor;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
                activeLayer.markDirty(null);
            }
        }

        // Gradient Tool
        if (activeTool === 'gradient') {
            setIsDragging(true);
            setLastMousePos(coords);
        }

        // Crop Tool - Crop to selection bounds
        if (activeTool === 'crop') {
            if (!selection.hasSelection && selection.operations.length === 0) {
                console.warn("Crop: No selection. Select an area first.");
                return;
            }

            // Get unified selection bounds
            const bounds = getSelectionBounds(selection.path, selection.operations, selection.hasSelection, width, height);
            if (!bounds) {
                console.warn("Crop: Could not determine selection bounds.");
                return;
            }

            // Clamp bounds to canvas
            const minX = Math.max(0, Math.floor(bounds.x));
            const minY = Math.max(0, Math.floor(bounds.y));
            const maxX = Math.min(width, Math.ceil(bounds.x + bounds.w));
            const maxY = Math.min(height, Math.ceil(bounds.y + bounds.h));
            const cropW = maxX - minX;
            const cropH = maxY - minY;

            if (cropW <= 0 || cropH <= 0) {
                console.warn("Crop: Invalid crop dimensions.");
                return;
            }

            // Crop all layers by shifting content
            layers.forEach(layer => {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = cropW;
                tempCanvas.height = cropH;
                const tempCtx = tempCanvas.getContext('2d');
                if (tempCtx) {
                    tempCtx.drawImage(layer.canvas, -minX, -minY);
                }
                layer.canvas.width = cropW;
                layer.canvas.height = cropH;
                layer.ctx.drawImage(tempCanvas, 0, 0);
                layer.markDirty(null);
            });

            // Update canvas dimensions in store
            useEditorStore.getState().setCanvasSize(cropW, cropH);
            clearSelection();
        }

        // Shape Tools (Rect, Circle)
        if (activeTool === 'shape-rect' || activeTool === 'shape-circle') {
            setIsDragging(true);
            setLastMousePos(coords);
            // Store start point in selection path temporarily
            setSelectionPath([coords]);
        }
    };

    // Plot Point helper (Updated for Clipping)
    const plotPoint = (x: number, y: number, targetCtx: CanvasRenderingContext2D) => {
        if (!brushTipRef.current) return;
        const size = brushSettings.size;

        // When painting inside a selection, paint to stroke buffer (mask applied on mouse up)
        if (selection.hasSelection && selectionMaskFloat && selectionMask) {
            // Create or reuse stroke buffer
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) return;

            if (!strokeBufferRef.current || strokeBufferRef.current.layerId !== activeLayerId) {
                const bufferCanvas = document.createElement('canvas');
                bufferCanvas.width = width;
                bufferCanvas.height = height;
                const bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });
                if (!bufferCtx) return;

                // Create reusable preview canvas
                const previewCanvas = document.createElement('canvas');
                previewCanvas.width = width;
                previewCanvas.height = height;
                const previewCtx = previewCanvas.getContext('2d');
                if (!previewCtx) return;

                // Save layer content for preview restoration
                const layerSnapshot = activeLayer.ctx.getImageData(0, 0, width, height);
                strokeBufferRef.current = {
                    canvas: bufferCanvas,
                    ctx: bufferCtx,
                    layerId: activeLayerId!,
                    layerSnapshot,
                    previewCanvas,
                    previewCtx,
                    lastPreviewTime: 0
                };
            }

            const buffer = strokeBufferRef.current!;
            const dstX = x - size / 2;
            const dstY = y - size / 2;

            // Paint to buffer WITHOUT mask (always do this - it's fast)
            buffer.ctx.save();
            buffer.ctx.globalCompositeOperation = 'source-over';
            buffer.ctx.globalAlpha = brushSettings.opacity;
            buffer.ctx.drawImage(brushTipRef.current, dstX, dstY);
            buffer.ctx.restore();

            // THROTTLED LIVE PREVIEW: Only update visual every ~16ms (60fps)
            const now = performance.now();
            if (now - buffer.lastPreviewTime >= 16) {
                buffer.lastPreviewTime = now;

                // Restore saved layer content
                targetCtx.putImageData(buffer.layerSnapshot, 0, 0);

                // Draw masked buffer preview using reusable canvas
                buffer.previewCtx.clearRect(0, 0, width, height);
                buffer.previewCtx.drawImage(buffer.canvas, 0, 0);
                buffer.previewCtx.globalCompositeOperation = 'destination-in';
                buffer.previewCtx.drawImage(selectionMask, 0, 0);
                buffer.previewCtx.globalCompositeOperation = 'source-over'; // Reset

                targetCtx.save();
                targetCtx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
                targetCtx.drawImage(buffer.previewCanvas, 0, 0);
                targetCtx.restore();
            }
        } else {
            // Normal Paint (no selection)
            const dstX = x - size / 2;
            const dstY = y - size / 2;

            targetCtx.save();
            targetCtx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
            targetCtx.globalAlpha = brushSettings.opacity;
            targetCtx.drawImage(brushTipRef.current, dstX, dstY);
            targetCtx.restore();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        dispatchToolPointer('move', e);
        const coords = getCanvasCoords(e);

        // --- FREE EDIT DRAG ---
        // Free Edit Drag & Cursor (Deferred to Hook)
        handleFreeEditMove(e);

        if (activeTool === 'select' && selection.isDraggingSelection && floatingPixelsRef.current) {
            // Recalculated above: const coords = getCanvasCoords(e);
            const dx = coords.x - lastMousePos.x;
            const dy = coords.y - lastMousePos.y;
            floatingPixelsRef.current.x += dx;
            floatingPixelsRef.current.y += dy;
            setLastMousePos(coords);
            setDashOffset(d => d + 0.01);
            return;
        }

        // Lasso-poly: Always track mouse position for live preview line
        if (activeTool === 'select' && selection.mode === 'lasso-poly' && selection.polyPoints && selection.polyPoints.length > 0) {
            setLastMousePos(coords);
            // Don't return - we still need to continue for other handling
        }

        if (activeTool === 'move') return;
        if (!isDragging) return;
        if (e.buttons === 4) {
            const dx = e.clientX - lastMousePos.x; const dy = e.clientY - lastMousePos.y;
            setPan(pan.x + dx, pan.y + dy);
            setLastMousePos({ x: e.clientX, y: e.clientY });
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
            setLastMousePos(current);
            return;
        }

        // Clone Stamp Move
        if (activeTool === 'clone-stamp') {
            const cloneSource = useEditorStore.getState().cloneSource;
            if (!cloneSource) return;

            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (!activeLayer) return;
            const ctx = activeLayer.ctx;

            // Calculate offset between first position and source
            const offset = {
                x: cloneSource.x - lastMousePos.x,
                y: cloneSource.y - lastMousePos.y
            };

            // Sample from source position and paint to current position
            const srcX = current.x + offset.x;
            const srcY = current.y + offset.y;

            // Get source pixel data
            const srcData = ctx.getImageData(
                Math.floor(srcX - brushSettings.size / 2),
                Math.floor(srcY - brushSettings.size / 2),
                Math.ceil(brushSettings.size),
                Math.ceil(brushSettings.size)
            );

            // Paint at current position
            ctx.putImageData(
                srcData,
                Math.floor(current.x - brushSettings.size / 2),
                Math.floor(current.y - brushSettings.size / 2)
            );
            activeLayer.markDirty(null);

            setLastMousePos(current);
        }

        // Redraw after any paint operation (brush/eraser/clone-stamp)
        const mainCtx = canvasRef.current?.getContext('2d');
        if (mainCtx) {
            mainCtx.clearRect(0, 0, width, height);

            // DRAW TRANSPARENT GRID BACKGROUND
            const gridSize = 10;
            const cols = Math.ceil(width / gridSize);
            const rows = Math.ceil(height / gridSize);
            mainCtx.save();
            mainCtx.fillStyle = '#CCCCCC'; // Light Grey
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if ((x + y) % 2 === 1) {
                        mainCtx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
                    }
                }
            }
            mainCtx.restore();

            layers.forEach(l => {
                if (l.visible && l.canvas) {
                    mainCtx.globalAlpha = l.opacity;
                    mainCtx.globalCompositeOperation = l.blendMode;
                    mainCtx.drawImage(l.canvas, 0, 0);
                    if (l.id === activeLayerId && floatingPixelsRef.current) {
                        mainCtx.drawImage(floatingPixelsRef.current.canvas, floatingPixelsRef.current.x, floatingPixelsRef.current.y);
                    }
                }
            });
            mainCtx.globalAlpha = 1;
            mainCtx.globalCompositeOperation = 'source-over';

            // Draw Selection Outline if exists (Manual Redraw)
            if (unifiedPath) {
                mainCtx.save();
                mainCtx.lineWidth = 1 / zoom;
                mainCtx.setLineDash([4 / zoom, 4 / zoom]);
                mainCtx.save();
                mainCtx.lineWidth = 1 / zoom;
                mainCtx.setLineDash([4 / zoom, 4 / zoom]);

                // Handle Pixel Move Offset (re-calculate if needed, or use cached? floating pixels logic is handled above)
                // If we are painting, we probably aren't dragging pixels, but let's be safe
                let offsetX = 0;
                let offsetY = 0;
                if (floatingPixelsRef.current && selection.isDraggingSelection) {
                    offsetX = floatingPixelsRef.current.x - floatingPixelsRef.current.lastCommitX;
                    offsetY = floatingPixelsRef.current.y - floatingPixelsRef.current.lastCommitY;
                }
                // Offset by 0.5 for Unified Path (Compensate MS bias only)
                mainCtx.translate(offsetX + 0.5, offsetY + 0.5);

                mainCtx.save();
                mainCtx.clip(unifiedPath);
                mainCtx.lineWidth = 2 / zoom;

                mainCtx.strokeStyle = '#000';
                mainCtx.lineDashOffset = -dashOffset / zoom;
                mainCtx.stroke(unifiedPath);

                mainCtx.strokeStyle = '#FFF';
                mainCtx.lineDashOffset = (-dashOffset / zoom) + (4 / zoom);
                mainCtx.stroke(unifiedPath);
                mainCtx.restore();

                mainCtx.restore();
            }
        }
    };

    const handleMouseUp = (e?: React.MouseEvent) => {
        if (e) dispatchToolPointer('up', e);
        handleFreeEditUp();
        if (activeTransformRef.current) {
            activeTransformRef.current = null;
            setIsDragging(false);
            setUnifiedPathVersion(v => v + 1);
            return;
        }

        if (activeTool === 'select') {
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

        // COMMIT STROKE BUFFER (for masked painting)
        // Apply Float32 mask once to the accumulated stroke and composite to layer
        if (strokeBufferRef.current && selectionMaskFloat && (activeTool === 'brush' || activeTool === 'eraser')) {
            const buffer = strokeBufferRef.current;
            const activeLayer = layers.find(l => l.id === buffer.layerId);

            if (activeLayer) {
                const bufferCtx = buffer.ctx;
                const bufferData = bufferCtx.getImageData(0, 0, width, height);
                const pixels = bufferData.data;

                // Apply Float32 mask to the accumulated stroke
                for (let i = 0; i < width * height; i++) {
                    const maskValue = selectionMaskFloat[i];
                    const idx = i * 4;
                    // Multiply each color component by mask (for proper blending)
                    // Actually for opacity, we only need to multiply alpha
                    pixels[idx + 3] = Math.round(pixels[idx + 3] * maskValue);
                }

                bufferCtx.putImageData(bufferData, 0, 0);

                // Composite masked stroke onto layer
                const layerCtx = activeLayer.ctx;
                layerCtx.save();
                layerCtx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
                layerCtx.drawImage(buffer.canvas, 0, 0);
                layerCtx.restore();
                activeLayer.markDirty(null);

                // Clear the buffer
                bufferCtx.clearRect(0, 0, width, height);
            }

            strokeBufferRef.current = null;
        }

        // Gradient Tool - Draw on mouseUp
        if (activeTool === 'gradient' && isDragging) {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (activeLayer) {
                const ctx = activeLayer.ctx;
                const current = lastMousePos;

                // Get start point from selection.path[0] if we stored it there
                // Actually we need a ref for this. For now use stored lastMousePos at start vs current mouse
                // Since we set lastMousePos in mouseDown, we need to track start separately
                // For simplicity, we'll use the brush interaction and assume start is at mouseDown position
                // Let's use selection.path temporarily to store gradient start

                // Get endpoint from current mouse position (this is a bit hacky, ideally we'd use e.clientX/Y)
                // For now, let's use the refs we have

                const startX = 0;
                const startY = 0;
                const endX = current.x;
                const endY = current.y;

                // Create a linear gradient
                const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
                gradient.addColorStop(0, primaryColor);
                gradient.addColorStop(1, useEditorStore.getState().secondaryColor);

                ctx.save();
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                ctx.restore();
                activeLayer.markDirty(null);

                // Force render update
                useEditorStore.getState().toggleLayerVisibility(activeLayerId!);
                useEditorStore.getState().toggleLayerVisibility(activeLayerId!);
            }
        }

        // Shape Tools - Draw on mouseUp
        if ((activeTool === 'shape-rect' || activeTool === 'shape-circle') && isDragging) {
            const activeLayer = layers.find(l => l.id === activeLayerId);
            if (activeLayer && selection.path.length > 0) {
                const ctx = activeLayer.ctx;
                const start = selection.path[0];
                const end = lastMousePos; // Use lastMousePos as the end point

                ctx.save();
                ctx.fillStyle = primaryColor;
                ctx.strokeStyle = primaryColor;
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
        if (activeTool === 'move') return 'grab';
        if (activeTool === 'select') {
            if (modifiers.shift) return CURSOR_ADD;
            if (modifiers.alt || modifiers.meta) return CURSOR_SUB;
            return 'crosshair';
        }
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

        // Calculate bounds
        // Calculate bounds
        const bounds = getLayerContentBounds(activeLayer.canvas);
        if (!bounds) {
            setErrorMessage("Nothing to edit");
            setTimeout(() => setErrorMessage(null), 2000);
            return;
        }

        // Create Selection Rect
        const path = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.w, y: bounds.y + bounds.h }
        ];

        // Set State
        setSelectionPath(path);
        setHasSelection(true);
        // Important: Set Rect Mode so it interprets path as p1/p2
        useEditorStore.getState().setSelectionMode('rect');
        setFreeEditMode(true);
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

    // Handle image file drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const files = e.dataTransfer.files;
        if (files.length === 0) return;

        const file = files[0];
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // If image is larger than canvas, scale it to fit
                let drawWidth = img.width;
                let drawHeight = img.height;

                if (img.width > width || img.height > height) {
                    const scaleX = width / img.width;
                    const scaleY = height / img.height;
                    const scale = Math.min(scaleX, scaleY);
                    drawWidth = Math.round(img.width * scale);
                    drawHeight = Math.round(img.height * scale);
                }

                // Create layer canvas at document size
                const layerCanvas = document.createElement('canvas');
                layerCanvas.width = width;
                layerCanvas.height = height;
                const ctx = layerCanvas.getContext('2d');
                if (!ctx) return;

                // Center the image
                const x = (width - drawWidth) / 2;
                const y = (height - drawHeight) / 2;
                ctx.drawImage(img, x, y, drawWidth, drawHeight);

                // Add as new layer
                const { addLayerFromContent } = useEditorStore.getState();
                addLayerFromContent(layerCanvas, file.name);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div ref={containerRef}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
            onWheel={handleWheel} onContextMenu={handleContextMenu}
            onDrop={handleDrop} onDragOver={handleDragOver}
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: getCursor(), position: 'relative' }}>
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.5)', background: 'white' }}>
                <canvas ref={canvasRef} width={width} height={height} style={{ width: `${width}px`, height: `${height}px`, display: 'block', imageRendering: 'auto' }} />
            </div>

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
                                if (selection.isFreeEditMode) {
                                    // Already in mode
                                } else {
                                    setFreeEditMode(true);
                                }
                                setContextMenu(null);
                            }}>
                                Free Edit Selection
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
