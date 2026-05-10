/**
 * HistoryPanel — shows the undo history stack.
 * Click an entry to revert to that state. "New Snapshot" commits a snapshot.
 */
import { useEditorStore } from '../../store/editorStore';

export function HistoryPanel() {
    const { historyEntries, currentHistoryIndex, revertToHistoryIndex, commitSnapshot } = useEditorStore();

    return (
        <div
            data-testid="history-panel"
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                fontSize: '12px',
                color: 'hsl(var(--text-main))',
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 8px',
                borderBottom: '1px solid hsl(var(--border-light))',
                fontWeight: 600,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                <span>History</span>
                <button
                    onClick={() => commitSnapshot()}
                    title="New Snapshot"
                    style={{
                        background: 'none',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: '3px',
                        color: 'hsl(var(--text-main))',
                        cursor: 'pointer',
                        fontSize: '10px',
                        padding: '2px 6px',
                    }}
                >
                    New Snapshot
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {historyEntries.length === 0 && (
                    <div style={{ padding: '8px', color: 'hsl(var(--text-dim, 0 0% 50%))', fontSize: '11px' }}>
                        No history
                    </div>
                )}
                {historyEntries.map((entry, index) => (
                    <div
                        key={entry.id}
                        data-testid={`history-entry-${index}`}
                        onClick={() => revertToHistoryIndex(index)}
                        style={{
                            padding: '4px 8px',
                            cursor: 'pointer',
                            background: index === currentHistoryIndex
                                ? 'hsl(var(--accent, 210 100% 56%) / 0.2)'
                                : 'transparent',
                            borderLeft: index === currentHistoryIndex
                                ? '2px solid hsl(var(--accent, 210 100% 56%))'
                                : '2px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                        title={new Date(entry.action.timestamp).toLocaleTimeString()}
                    >
                        <span style={{ opacity: 0.5, fontSize: '10px', minWidth: '20px' }}>
                            {index + 1}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.action.label}
                        </span>
                        {entry.action.kind === 'snapshot' && (
                            <span style={{ fontSize: '10px', opacity: 0.6 }}>snap</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
