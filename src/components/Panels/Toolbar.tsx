import {
    MousePointer2, Brush, Eraser, Image as ImageIcon, Download, BoxSelect, FlaskConical,
    PaintBucket, Pentagon, Stamp, Blend, Crop, Square, Circle,
    Wand2, MousePointerClick, Pencil, Sun, Flame, Droplets,
    PenTool, PenLine, MousePointer, Pipette, Type, Hand, ZoomIn,
    Hexagon, Minus, Star,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { loadImage } from '../../utils/imageLoader';
import { useRef, useState } from 'react';
import { TestDialog } from '../Dialogs/TestDialog';
import type { ToolId, SelectionMode } from '../../store/types';

interface ToolButton {
    id: ToolId;
    icon: typeof Brush;
    label: string;
    selectionMode?: SelectionMode;
}

interface ToolGroup {
    label: string;
    tools: ToolButton[];
}

const GROUPS: ToolGroup[] = [
    {
        label: 'Move/Selection',
        tools: [
            { id: 'move', icon: MousePointer2, label: 'Move' },
            { id: 'select', icon: BoxSelect, label: 'Rectangular Marquee', selectionMode: 'rect' },
            { id: 'select', icon: Circle, label: 'Elliptical Marquee', selectionMode: 'circle' },
            { id: 'select', icon: Brush, label: 'Lasso', selectionMode: 'lasso' },
            { id: 'select', icon: Pentagon, label: 'Polygonal Lasso', selectionMode: 'lasso-poly' },
            { id: 'magic-wand', icon: Wand2, label: 'Magic Wand' },
            { id: 'quick-selection', icon: MousePointerClick, label: 'Quick Selection' },
        ],
    },
    {
        label: 'Crop/Eyedropper',
        tools: [
            { id: 'crop', icon: Crop, label: 'Crop (use selection)' },
            { id: 'eyedropper', icon: Pipette, label: 'Eyedropper (Alt+Click sets secondary)' },
        ],
    },
    {
        label: 'Paint',
        tools: [
            { id: 'brush', icon: Brush, label: 'Brush' },
            { id: 'pencil', icon: Pencil, label: 'Pencil' },
            { id: 'eraser', icon: Eraser, label: 'Eraser' },
            { id: 'clone-stamp', icon: Stamp, label: 'Clone Stamp (Alt+Click sets source)' },
        ],
    },
    {
        label: 'Fill/Tone',
        tools: [
            { id: 'fill', icon: PaintBucket, label: 'Paint Bucket' },
            { id: 'gradient', icon: Blend, label: 'Gradient' },
            { id: 'dodge', icon: Sun, label: 'Dodge' },
            { id: 'burn', icon: Flame, label: 'Burn' },
            { id: 'sponge', icon: Droplets, label: 'Sponge' },
        ],
    },
    {
        label: 'Vector',
        tools: [
            { id: 'pen', icon: PenTool, label: 'Pen' },
            { id: 'freeform-pen', icon: PenLine, label: 'Freeform Pen' },
            { id: 'path-selection', icon: MousePointer, label: 'Path Selection' },
            { id: 'direct-selection', icon: MousePointer2, label: 'Direct Selection' },
        ],
    },
    {
        label: 'Type',
        tools: [
            { id: 'type-horizontal', icon: Type, label: 'Horizontal Type' },
            { id: 'type-vertical', icon: Type, label: 'Vertical Type' },
        ],
    },
    {
        label: 'Shape',
        tools: [
            { id: 'shape-rectangle', icon: Square, label: 'Rectangle' },
            { id: 'shape-rounded-rectangle', icon: Square, label: 'Rounded Rectangle' },
            { id: 'shape-ellipse', icon: Circle, label: 'Ellipse' },
            { id: 'shape-polygon', icon: Hexagon, label: 'Polygon' },
            { id: 'shape-line', icon: Minus, label: 'Line' },
            { id: 'shape-custom', icon: Star, label: 'Custom Shape' },
        ],
    },
    {
        label: 'View',
        tools: [
            { id: 'hand', icon: Hand, label: 'Hand' },
            { id: 'zoom', icon: ZoomIn, label: 'Zoom (Alt+Click to zoom out)' },
        ],
    },
];

export function Toolbar() {
    const activeTool = useEditorStore(s => s.activeTool);
    const setTool = useEditorStore(s => s.setTool);
    const setSelectionMode = useEditorStore(s => s.setSelectionMode);
    const setPolyPoints = useEditorStore(s => s.setPolyPoints);
    const selectionMode = useEditorStore(s => s.selection.mode);
    const primaryColor = useEditorStore(s => s.primaryColor);
    const secondaryColor = useEditorStore(s => s.secondaryColor);
    const swapColors = useEditorStore(s => s.swapColors);
    const addLayerFromImage = useEditorStore(s => s.addLayerFromImage);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

    const handleToolClick = (tool: ToolButton) => {
        setTool(tool.id);
        if (tool.selectionMode) {
            setSelectionMode(tool.selectionMode);
            if (tool.selectionMode === 'lasso-poly') setPolyPoints([]);
        }
    };

    const isToolActive = (tool: ToolButton): boolean => {
        if (activeTool !== tool.id) return false;
        if (tool.id === 'select' && tool.selectionMode) {
            return selectionMode === tool.selectionMode;
        }
        return true;
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const img = await loadImage(file);
                addLayerFromImage(img, file.name);
            } catch (err) {
                console.error('Failed to load image', err);
            }
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExport = () => {
        const { width, height, layers } = useEditorStore.getState();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        layers.forEach(layer => {
            if (layer.visible) {
                ctx.globalAlpha = layer.opacity;
                ctx.drawImage(layer.canvas, 0, 0);
            }
        });
        const link = document.createElement('a');
        link.download = `image-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const buttonStyle = (active: boolean): React.CSSProperties => ({
        width: 32,
        height: 32,
        borderRadius: 4,
        border: 'none',
        backgroundColor: active ? 'hsl(var(--accent-primary))' : 'transparent',
        color: active ? '#fff' : 'hsl(var(--text-muted))',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
    });

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, overflowY: 'auto', flex: 1 }}>
                {GROUPS.map((group, gi) => (
                    <div key={group.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        {gi > 0 && (
                            <div style={{ width: 20, height: 1, backgroundColor: 'hsl(var(--border-light))', margin: '4px 0' }} />
                        )}
                        {group.tools.map((tool, ti) => (
                            <button
                                key={`${tool.id}-${tool.selectionMode ?? ''}-${ti}`}
                                title={tool.label}
                                onClick={() => handleToolClick(tool)}
                                style={buttonStyle(isToolActive(tool))}
                            >
                                {tool.id === 'type-vertical'
                                    ? <Type size={18} style={{ transform: 'rotate(90deg)' }} />
                                    : <tool.icon size={18} />}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            <div style={{ width: 20, height: 1, backgroundColor: 'hsl(var(--border-light))', margin: '4px 0' }} />

            <button title="Import Image" onClick={() => fileInputRef.current?.click()} style={buttonStyle(false)}>
                <ImageIcon size={18} />
            </button>
            <button title="Export PNG" onClick={handleExport} style={buttonStyle(false)}>
                <Download size={18} />
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <button title="Test Dialog" onClick={() => setIsTestDialogOpen(true)} style={buttonStyle(isTestDialogOpen)}>
                <FlaskConical size={18} strokeWidth={1.5} />
            </button>

            <div style={{ flex: 0 }} />

            <div style={{ position: 'relative', width: 36, height: 36, marginTop: 8 }}>
                <div
                    onClick={swapColors}
                    title="Secondary Color (Click to Swap)"
                    style={{
                        position: 'absolute', bottom: 0, right: 0, width: 24, height: 24,
                        backgroundColor: secondaryColor,
                        border: '1px solid #fff',
                        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                        cursor: 'pointer', zIndex: 1,
                    }}
                />
                <div
                    onClick={swapColors}
                    title="Primary Color (Click to Swap)"
                    style={{
                        position: 'absolute', top: 0, left: 0, width: 24, height: 24,
                        backgroundColor: primaryColor,
                        border: '1px solid #fff',
                        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                        cursor: 'pointer', zIndex: 2,
                    }}
                />
            </div>

            <TestDialog isOpen={isTestDialogOpen} onClose={() => setIsTestDialogOpen(false)} />
        </>
    );
}
