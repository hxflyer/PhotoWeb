import { useEditorStore } from '../../store/editorStore';

interface Props {
    onRequestClose?: () => void;
}

// Photoshop document tab: `× <filename>.<ext> @ <zoom>% (RGB/8) *`. The leading
// × triggers File > Close (matches macOS Photoshop tab position per the
// close-images-photoshop lesson). The trailing * appears when isDirty.
export function DocumentTab({ onRequestClose }: Props) {
    const documentName = useEditorStore(s => s.documentName);
    const zoom = useEditorStore(s => s.zoom);
    const isDirty = useEditorStore(s => s.isDirty);
    if (!documentName) {
        // No active document — the close path clears documentName; let the
        // empty-state overlay in the viewport carry the user-facing message.
        return <div data-testid="document-tab" style={{ height: '100%', backgroundColor: 'hsl(var(--bg-header))', borderBottom: '1px solid hsl(var(--bg-canvas))' }} />;
    }

    // Basename only — strip any path separators a stored name might carry.
    const lastSlash = Math.max(documentName.lastIndexOf('/'), documentName.lastIndexOf('\\'));
    const basename = lastSlash >= 0 ? documentName.slice(lastSlash + 1) : documentName;
    const display = basename.includes('.') ? basename : `${basename}.png`;
    const zoomPct = Math.round(zoom * 100);

    return (
        <div
            data-testid="document-tab"
            style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'hsl(var(--bg-header))',
                borderBottom: '1px solid hsl(var(--bg-canvas))',
                padding: '0 12px',
                fontSize: 12,
                color: 'hsl(var(--text-main))',
                userSelect: 'none',
                fontFamily: 'var(--font-sans)',
            }}
        >
            <button
                data-testid="document-tab-close"
                onClick={() => onRequestClose?.()}
                aria-label="Close document"
                title="Close"
                style={{
                    width: 16,
                    height: 16,
                    marginRight: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: 'none',
                    color: 'hsl(var(--text-muted))',
                    cursor: 'pointer',
                    fontSize: 12,
                    lineHeight: 1,
                    padding: 0,
                    borderRadius: 2,
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'hsl(var(--bg-canvas))';
                    (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-main))';
                }}
                onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.color = 'hsl(var(--text-muted))';
                }}
            >
                ×
            </button>
            <span
                data-testid="document-tab-name"
                style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 360,
                }}
            >
                {display}
            </span>
            <span style={{ color: 'hsl(var(--text-muted))', marginLeft: 6 }}>
                @ <span data-testid="document-tab-zoom">{zoomPct}%</span> (RGB/8)
            </span>
            {isDirty && (
                <span
                    data-testid="document-tab-dirty"
                    style={{ marginLeft: 6, color: 'hsl(var(--text-main))' }}
                    aria-label="Unsaved changes"
                >
                    *
                </span>
            )}
        </div>
    );
}
