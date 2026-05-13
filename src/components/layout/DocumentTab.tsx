import { useEditorStore } from '../../store/editorStore';

/**
 * Photoshop document tab: renders directly below the Options Bar and above
 * the canvas, showing `<filename>.<ext> @ <zoom>% (RGB/8) *`. The trailing
 * `*` only appears when the document is dirty.
 *
 * The leading `×` close button is intentionally omitted in this tick:
 * `File > Close` with a save-changes-or-discard prompt lives in
 * cluster 04c-file-save-close.
 */
export function DocumentTab() {
    const documentName = useEditorStore(s => s.documentName);
    const zoom = useEditorStore(s => s.zoom);
    const isDirty = useEditorStore(s => s.isDirty);

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
