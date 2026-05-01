import { MousePointer2, Brush, Eraser, Image as ImageIcon, Download, BoxSelect, FlaskConical, PaintBucket, Pentagon, Stamp, Blend, Crop, Square, Circle } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { loadImage } from '../../utils/imageLoader';
import { useRef, useState } from 'react';
import { TestDialog } from '../Dialogs/TestDialog';

export function Toolbar() {
    const { activeTool, setTool, addLayerFromImage } = useEditorStore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);

    const tools = [
        { id: 'move', icon: MousePointer2, label: 'Move' },
        { id: 'select', icon: BoxSelect, label: 'Select Area' },
        { id: 'lasso-poly', icon: Pentagon, label: 'Polygonal Lasso' },
        { id: 'brush', icon: Brush, label: 'Brush' },
        { id: 'eraser', icon: Eraser, label: 'Eraser' },
        { id: 'fill', icon: PaintBucket, label: 'Fill' },
        { id: 'clone-stamp', icon: Stamp, label: 'Clone Stamp (Alt+Click to set source)' },
        { id: 'gradient', icon: Blend, label: 'Gradient' },
        { id: 'crop', icon: Crop, label: 'Crop (use selection)' },
        { id: 'shape-rect', icon: Square, label: 'Rectangle Shape' },
        { id: 'shape-circle', icon: Circle, label: 'Circle Shape' },
    ] as const;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const img = await loadImage(file);
                addLayerFromImage(img, file.name);
            } catch (err) {
                console.error("Failed to load image", err);
            }
        }
        // Reset input
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

    return (
        <>
            {tools.map((tool) => (
                <button
                    key={tool.id}
                    title={tool.label}
                    onClick={() => {
                        if (tool.id === 'lasso-poly') {
                            useEditorStore.getState().setTool('select');
                            useEditorStore.getState().setSelectionMode('lasso-poly');
                            useEditorStore.getState().setPolyPoints([]); // Clear any existing points
                        } else {
                            if (tool.id === 'select') useEditorStore.getState().setSelectionMode('rect'); // Reset to rect for basic select
                            setTool(tool.id as any);
                        }
                    }}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: (tool.id === 'lasso-poly' ? (activeTool === 'select' && useEditorStore.getState().selection.mode === 'lasso-poly') : (activeTool === tool.id && useEditorStore.getState().selection.mode !== 'lasso-poly')) ? 'hsl(var(--accent-primary))' : 'transparent',
                        color: (tool.id === 'lasso-poly' ? (activeTool === 'select' && useEditorStore.getState().selection.mode === 'lasso-poly') : (activeTool === tool.id && useEditorStore.getState().selection.mode !== 'lasso-poly')) ? '#fff' : 'hsl(var(--text-muted))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >
                    <tool.icon size={20} />
                </button>
            ))}

            <div style={{ width: '20px', height: '1px', backgroundColor: 'hsl(var(--border-light))', margin: '4px 0' }} />

            <button
                title="Import Image"
                onClick={() => fileInputRef.current?.click()}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'hsl(var(--text-muted))',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                }}
            >
                <ImageIcon size={20} />
            </button>

            <button
                title="Export PNG"
                onClick={handleExport}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'hsl(var(--text-muted))',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                }}
            >
                <Download size={20} />
            </button>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            {/* Test Button */}
            <button
                title="Test Dialog"
                onClick={() => setIsTestDialogOpen(true)}
                style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: isTestDialogOpen ? 'hsl(var(--bg-input))' : 'transparent',
                    color: isTestDialogOpen ? 'hsl(var(--accent-primary))' : 'hsl(var(--text-muted))',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.1s',
                    marginBottom: '8px'
                }}
            >
                <FlaskConical size={20} strokeWidth={1.5} />
            </button>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Color Indicators */}
            <div style={{ position: 'relative', width: '36px', height: '36px', marginBottom: '8px' }}>
                {/* Secondary (Back) */}
                <div
                    onClick={useEditorStore.getState().swapColors}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '24px',
                        height: '24px',
                        backgroundColor: useEditorStore(s => s.secondaryColor),
                        border: '1px solid #fff',
                        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        zIndex: 1
                    }}
                    title="Secondary Color (Click to Swap)"
                />

                {/* Primary (Front) */}
                <div
                    onClick={useEditorStore.getState().swapColors}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '24px',
                        height: '24px',
                        backgroundColor: useEditorStore(s => s.primaryColor),
                        border: '1px solid #fff',
                        boxShadow: '0 0 2px rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        zIndex: 2
                    }}
                    title="Primary Color (Click to Swap)"
                />
            </div>

            <TestDialog isOpen={isTestDialogOpen} onClose={() => setIsTestDialogOpen(false)} />
        </>
    );
}
