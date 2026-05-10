/**
 * SwatchesPanel — grid of color swatches. Click to set primary color.
 * "+" button to add current primary color. Right-click / remove button to delete.
 */
import { useEditorStore } from '../../store/editorStore';

export function SwatchesPanel() {
    const { swatches, primaryColor, setPrimaryColor, addSwatch, removeSwatch } = useEditorStore();

    return (
        <div
            data-testid="swatches-panel"
            style={{ padding: '8px', fontSize: '11px', color: 'hsl(var(--text-main))' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>Swatches</span>
                <button
                    onClick={() => addSwatch(primaryColor)}
                    title="Add current color as swatch"
                    style={{
                        background: primaryColor,
                        border: '1px solid #666',
                        borderRadius: '3px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                    }}
                >
                    +
                </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                {swatches.map((color, index) => (
                    <div
                        key={`${color}-${index}`}
                        title={color}
                        onClick={() => setPrimaryColor(color)}
                        onContextMenu={e => { e.preventDefault(); removeSwatch(index); }}
                        data-testid={`swatch-${index}`}
                        style={{
                            width: '18px',
                            height: '18px',
                            background: color,
                            border: color === primaryColor ? '2px solid white' : '1px solid #555',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    />
                ))}
            </div>
            {swatches.length === 0 && (
                <div style={{ color: 'hsl(var(--text-dim, 0 0% 50%))', fontSize: '10px', marginTop: '4px' }}>
                    No swatches. Click + to add.
                </div>
            )}
        </div>
    );
}
