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
    const activeDocumentId = useEditorStore(s => s.activeDocumentId);
    const openDocuments = useEditorStore(s => s.openDocuments);
    const switchDocument = useEditorStore(s => s.switchDocument);
    if (!documentName) {
        // No active document — the close path clears documentName; let the
        // empty-state overlay in the viewport carry the user-facing message.
        return <div data-testid="document-tab" style={{ height: '100%', backgroundColor: 'hsl(var(--bg-header))', borderBottom: '1px solid hsl(var(--bg-canvas))' }} />;
    }

    const zoomPct = Math.round(zoom * 100);

    const docs = openDocuments.length > 0
        ? openDocuments
        : [{
            id: activeDocumentId ?? 'active',
            name: documentName,
            isDirty,
        }];

    return (
        <div
            data-testid="document-tab-strip"
            style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'hsl(var(--bg-header))',
                borderBottom: '1px solid hsl(var(--bg-canvas))',
                fontSize: 12,
                color: 'hsl(var(--text-main))',
                userSelect: 'none',
                fontFamily: 'var(--font-sans)',
                overflow: 'hidden',
            }}
        >
            {docs.map(doc => {
                const active = doc.id === (activeDocumentId ?? 'active');
                const name = active ? documentName : doc.name;
                const slash = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
                const base = slash >= 0 ? name.slice(slash + 1) : name;
                const docDisplay = base.includes('.') ? base : `${base}.png`;
                const dirty = active ? isDirty : doc.isDirty;
                return (
                    <div
                        key={doc.id}
                        data-testid={active ? 'document-tab' : `document-tab-${doc.id}`}
                        onClick={() => !active && switchDocument(doc.id)}
                        style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 12px',
                            borderRight: '1px solid hsl(var(--border-mid))',
                            background: active ? 'hsl(var(--bg-panel))' : 'hsl(var(--bg-header))',
                            cursor: active ? 'default' : 'pointer',
                            minWidth: 120,
                            maxWidth: 380,
                        }}
                    >
                        <button
                            data-testid={active ? 'document-tab-close' : `document-tab-close-${doc.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (active) onRequestClose?.();
                                else switchDocument(doc.id);
                            }}
                            aria-label="Close document"
                            title={active ? 'Close' : 'Switch to close'}
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
                        >
                            ×
                        </button>
                        <span
                            data-testid={active ? 'document-tab-name' : `document-tab-name-${doc.id}`}
                            style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {docDisplay}
                        </span>
                        {active && (
                            <span style={{ color: 'hsl(var(--text-muted))', marginLeft: 6 }}>
                                @ <span data-testid="document-tab-zoom">{zoomPct}%</span> (RGB/8)
                            </span>
                        )}
                        {dirty && (
                            <span
                                data-testid={active ? 'document-tab-dirty' : `document-tab-dirty-${doc.id}`}
                                style={{ marginLeft: 6, color: 'hsl(var(--text-main))' }}
                                aria-label="Unsaved changes"
                            >
                                *
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
