import { Trash2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

export function StylesPanel() {
    const {
        activeLayerId,
        layers,
        layerStylePresets,
        applyLayerStylePreset,
        clearLayerStyle,
        deleteLayerStylePreset,
    } = useEditorStore();
    const active = layers.find(layer => layer.id === activeLayerId);
    const canApply = !!active && !active.isBackground;

    return (
        <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6, color: 'hsl(var(--text-main))' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))', gap: 6 }}>
                <button
                    type="button"
                    data-testid="style-preset-none"
                    title="None"
                    disabled={!canApply}
                    onClick={() => activeLayerId && clearLayerStyle(activeLayerId)}
                    style={{
                        minHeight: 48,
                        background: 'hsl(var(--bg-input))',
                        border: '1px solid hsl(var(--border-light))',
                        color: 'hsl(var(--text-muted))',
                        fontSize: 11,
                        cursor: canApply ? 'pointer' : 'default',
                        opacity: canApply ? 1 : 0.45,
                    }}
                >
                    None
                </button>
                {layerStylePresets.map(style => (
                    <div key={style.id} style={{ position: 'relative', minWidth: 0 }}>
                        <button
                            type="button"
                            data-testid={`style-preset-${style.id}`}
                            title={style.name}
                            disabled={!canApply}
                            onClick={() => activeLayerId && applyLayerStylePreset(activeLayerId, style.id)}
                            style={{
                                width: '100%',
                                minHeight: 48,
                                background: 'linear-gradient(135deg, hsl(var(--bg-input)), hsl(var(--bg-panel)))',
                                border: '1px solid hsl(var(--border-light))',
                                color: 'hsl(var(--text-main))',
                                fontSize: 10,
                                lineHeight: 1.15,
                                cursor: canApply ? 'pointer' : 'default',
                                opacity: canApply ? 1 : 0.45,
                                padding: '4px 16px 4px 4px',
                                overflowWrap: 'anywhere',
                            }}
                        >
                            {style.name}
                        </button>
                        <button
                            type="button"
                            data-testid={`style-preset-delete-${style.id}`}
                            title={`Delete ${style.name}`}
                            onClick={() => deleteLayerStylePreset(style.id)}
                            style={{
                                position: 'absolute',
                                top: 2,
                                right: 2,
                                width: 16,
                                height: 16,
                                display: 'grid',
                                placeItems: 'center',
                                padding: 0,
                                border: '1px solid hsl(var(--border-light))',
                                background: 'hsl(var(--bg-panel))',
                                color: 'hsl(var(--text-muted))',
                                cursor: 'pointer',
                            }}
                        >
                            <Trash2 size={10} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
