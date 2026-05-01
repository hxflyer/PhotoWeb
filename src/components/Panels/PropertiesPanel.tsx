import { useEditorStore } from '../../store/editorStore';
import { Filters } from '../../core/Filters';
import { Sliders, Square, Circle, Lasso } from 'lucide-react';

export function PropertiesPanel() {
    const { activeTool, brushSettings, setBrushSize, layers, activeLayerId, selection, setSelectionMode } = useEditorStore();

    const handleApplyFilter = (type: 'brightness' | 'contrast' | 'invert' | 'blur' | 'sharpen') => {
        const activeLayer = layers.find(l => l.id === activeLayerId);
        if (!activeLayer) return;

        if (type === 'brightness') {
            Filters.applyBrightness(activeLayer.ctx, 20);
        } else if (type === 'contrast') {
            Filters.applyContrast(activeLayer.ctx, 20);
        } else if (type === 'invert') {
            Filters.invert(activeLayer.ctx);
        } else if (type === 'blur') {
            Filters.blur(activeLayer.ctx, 3);
        } else if (type === 'sharpen') {
            Filters.sharpen(activeLayer.ctx, 0.8);
        }

        useEditorStore.getState().toggleLayerVisibility(activeLayerId!);
        useEditorStore.getState().toggleLayerVisibility(activeLayerId!);
    };

    const renderSelectionControls = () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button title="Rectangle" onClick={() => setSelectionMode('rect')}
                style={{ ...modeBtnStyle, background: selection.mode === 'rect' ? 'hsl(var(--accent-primary))' : 'transparent', color: selection.mode === 'rect' ? 'white' : 'inherit' }}>
                <Square size={16} />
            </button>
            <button title="Circle" onClick={() => setSelectionMode('circle')}
                style={{ ...modeBtnStyle, background: selection.mode === 'circle' ? 'hsl(var(--accent-primary))' : 'transparent', color: selection.mode === 'circle' ? 'white' : 'inherit' }}>
                <Circle size={16} />
            </button>
            <button title="Lasso" onClick={() => setSelectionMode('lasso')}
                style={{ ...modeBtnStyle, background: selection.mode === 'lasso' ? 'hsl(var(--accent-primary))' : 'transparent', color: selection.mode === 'lasso' ? 'white' : 'inherit' }}>
                <Lasso size={16} />
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', width: '100%' }}>
            <div style={{ fontWeight: 600, color: 'hsl(var(--accent-secondary))', minWidth: '60px' }}>
                {activeTool.toUpperCase()}
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: 'hsl(var(--border-light))' }} />

            {(activeTool === 'brush' || activeTool === 'eraser') && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Size */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <label>Size:</label>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={brushSettings.size}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                style={{ width: '80px' }}
                            />
                            <span style={{ width: '24px', textAlign: 'right' }}>{brushSettings.size}</span>
                        </div>

                        {/* Hardness */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <label>Hrd:</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={brushSettings.hardness * 100}
                                onChange={(e) => useEditorStore.getState().setBrushHardness(parseInt(e.target.value) / 100)}
                                style={{ width: '60px' }}
                            />
                            <span style={{ width: '24px', textAlign: 'right' }}>{Math.round(brushSettings.hardness * 100)}%</span>
                        </div>

                        {/* Opacity */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <label>Op:</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={brushSettings.opacity * 100}
                                onChange={(e) => useEditorStore.getState().setBrushOpacity(parseInt(e.target.value) / 100)}
                                style={{ width: '60px' }}
                            />
                            <span style={{ width: '24px', textAlign: 'right' }}>{Math.round(brushSettings.opacity * 100)}%</span>
                        </div>
                    </div>
                    <div style={{ width: '1px', height: '20px', backgroundColor: 'hsl(var(--border-light))' }} />
                </>
            )}

            {activeTool === 'select' && renderSelectionControls()}

            {/* Filter Buttons (Right Aligned) */}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Sliders size={16} color="hsl(var(--text-muted))" />
                <button onClick={() => handleApplyFilter('brightness')} style={filterBtnStyle}>Bright +</button>
                <button onClick={() => handleApplyFilter('contrast')} style={filterBtnStyle}>Contrast +</button>
                <button onClick={() => handleApplyFilter('invert')} style={filterBtnStyle}>Invert</button>
                <button onClick={() => handleApplyFilter('blur')} style={filterBtnStyle}>Blur</button>
                <button onClick={() => handleApplyFilter('sharpen')} style={filterBtnStyle}>Sharpen</button>
            </div>
        </div>
    );
}

const filterBtnStyle = {
    background: 'hsl(var(--bg-input))',
    border: '1px solid hsl(var(--border-light))',
    color: 'hsl(var(--text-main))',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px'
};

const modeBtnStyle = {
    border: 'none',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};
