import { useState } from 'react';
import { Bot, CircleDashed, ListTodo, RefreshCw, RotateCcw, Send, Square, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { createRequirement, refreshRequirement, removeRequirement as deleteRequirement, retryRequirement, stopRequirement } from '../../bridge/requirementsClient';
import { useRequirementEvents } from '../../hooks/useRequirementEvents';
import { useEditorStore } from '../../store/editorStore';
import type { RequirementItem, RequirementStatus } from '../../store/types';

const STATUS_LABELS: Record<RequirementStatus, string> = {
    todo: 'Todo',
    queued: 'Queued',
    running: 'Running',
    done: 'Done',
    blocked: 'Blocked',
    failed: 'Failed',
    'needs-review': 'Needs Review',
    cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<RequirementStatus, string> = {
    todo: '#7f8c8d',
    queued: '#2980b9',
    running: '#f39c12',
    done: '#27ae60',
    blocked: '#c0392b',
    failed: '#8e44ad',
    'needs-review': '#16a085',
    cancelled: '#95a5a6',
};

const MAX_VISIBLE_LOG_LINES = 200;

function formatVerification(item: RequirementItem): string {
    const values = item.verification;
    return `TSC ${values.typecheck} · Lint ${values.lint} · Test ${values.tests}`;
}

export function RequirementsOverlay() {
    const {
        isOpen,
        connection,
        draft,
        requirements,
        selectedRequirementId,
        logsById,
        setOpen,
        toggleOpen,
        setDraft,
        selectRequirement,
        upsertRequirement,
        removeRequirement,
        addToast,
        setConnection,
        documentName,
        activeTool,
        activeLayerId,
        selectedLayerIds,
        zoom,
    } = useEditorStore(useShallow(state => ({
        isOpen: state.isRequirementsOverlayOpen,
        connection: state.requirementsConnection,
        draft: state.requirementsDraft,
        requirements: state.requirements,
        selectedRequirementId: state.selectedRequirementId,
        logsById: state.requirementLogs,
        setOpen: state.setRequirementsOverlayOpen,
        toggleOpen: state.toggleRequirementsOverlay,
        setDraft: state.setRequirementsDraft,
        selectRequirement: state.selectRequirement,
        upsertRequirement: state.upsertRequirement,
        removeRequirement: state.removeRequirement,
        addToast: state.addToast,
        setConnection: state.setRequirementsConnection,
        documentName: state.documentName,
        activeTool: state.activeTool,
        activeLayerId: state.activeLayerId,
        selectedLayerIds: state.selectedLayerIds,
        zoom: state.zoom,
    })));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [stoppingId, setStoppingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    useRequirementEvents(true);

    const selected = requirements.find(item => item.id === selectedRequirementId) ?? requirements[0] ?? null;
    const selectedLogs = selected ? (logsById[selected.id] ?? []) : [];
    const visibleLogs = selectedLogs.slice(-MAX_VISIBLE_LOG_LINES);
    const hiddenLogCount = selectedLogs.length - visibleLogs.length;
    const openCount = requirements.filter(item =>
        item.status === 'queued'
        || item.status === 'running'
        || item.status === 'todo'
    ).length;

    async function handleSubmit() {
        const rawPrompt = draft.trim();
        if (!rawPrompt || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const item = await createRequirement({
                rawPrompt,
                appContext: {
                    documentName,
                    activeTool,
                    activeLayerId,
                    selectedLayerIds,
                    zoom,
                },
            });
            upsertRequirement(item);
            selectRequirement(item.id);
            setDraft('');
            setConnection('online');
        } catch {
            setConnection('offline');
            addToast('Assistant host is unavailable', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRetry(item: RequirementItem) {
        if (retryingId) return;
        setRetryingId(item.id);
        try {
            const retried = await retryRequirement(item.id);
            upsertRequirement(retried);
            selectRequirement(retried.id);
        } catch {
            addToast('Retry failed', 'error');
        } finally {
            setRetryingId(null);
        }
    }

    async function handleRefresh(item: RequirementItem) {
        if (refreshingId) return;
        setRefreshingId(item.id);
        try {
            const refreshed = await refreshRequirement(item.id);
            upsertRequirement(refreshed);
            selectRequirement(refreshed.id);
            setConnection('online');
        } catch {
            setConnection('offline');
            addToast('Refresh failed', 'error');
        } finally {
            setRefreshingId(null);
        }
    }

    async function handleStop(item: RequirementItem) {
        if (stoppingId) return;
        setStoppingId(item.id);
        try {
            const stopped = await stopRequirement(item.id);
            upsertRequirement(stopped);
            selectRequirement(stopped.id);
            setConnection('online');
        } catch {
            setConnection('offline');
            addToast('Stop failed', 'error');
        } finally {
            setStoppingId(null);
        }
    }

    async function handleRemove(item: RequirementItem) {
        if (removingId) return;
        setRemovingId(item.id);
        try {
            await deleteRequirement(item.id);
            removeRequirement(item.id);
            setConnection('online');
        } catch {
            setConnection('offline');
            addToast('Remove failed', 'error');
        } finally {
            setRemovingId(null);
        }
    }

    return (
        <>
            <button
                type="button"
                data-testid="requirements-overlay-toggle"
                title="Assistant Queue"
                onClick={event => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleOpen();
                }}
                style={{
                    position: 'fixed',
                    top: 34,
                    right: 8,
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid hsl(var(--border-light))',
                    background: isOpen ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-header))',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-lg)',
                    cursor: 'pointer',
                    zIndex: 10002,
                }}
            >
                <Bot size={16} />
                {openCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 16,
                        height: 16,
                        padding: '0 4px',
                        borderRadius: 999,
                        background: '#c0392b',
                        color: 'white',
                        fontSize: 10,
                        lineHeight: '16px',
                    }}>
                        {openCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    data-testid="requirements-overlay-panel"
                    style={{
                        position: 'fixed',
                        top: 74,
                        right: 8,
                        width: 'min(760px, calc(100vw - 16px))',
                        height: 'min(720px, calc(100vh - 82px))',
                        display: 'grid',
                        gridTemplateRows: 'auto auto 1fr',
                        background: 'hsl(var(--bg-panel))',
                        border: '1px solid hsl(var(--border-light))',
                        borderRadius: 10,
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 10002,
                        userSelect: 'text',
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        background: 'hsl(var(--bg-header))',
                        borderBottom: '1px solid hsl(var(--border-light))',
                    }}>
                        <ListTodo size={15} />
                        <div style={{ fontSize: 12, fontWeight: 600 }}>Assistant Queue</div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: 'hsl(var(--text-muted))' }}>
                            {connection === 'online' ? <Wifi size={14} /> : connection === 'connecting' ? <CircleDashed size={14} /> : <WifiOff size={14} />}
                            <span style={{ fontSize: 10, textTransform: 'uppercase' }}>{connection}</span>
                        </div>
                        <button
                            type="button"
                            onClick={event => {
                                event.preventDefault();
                                event.stopPropagation();
                                setOpen(false);
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                        >
                            ×
                        </button>
                    </div>

                    <div style={{ padding: 10, borderBottom: '1px solid hsl(var(--border-light))', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                            data-testid="requirements-overlay-input"
                            value={draft}
                            onChange={event => setDraft(event.target.value)}
                            placeholder="Describe a bug, change, or requirement in natural language"
                            rows={4}
                            style={{
                                width: '100%',
                                resize: 'none',
                                padding: 10,
                                borderRadius: 6,
                                border: '1px solid hsl(var(--border-light))',
                                background: 'hsl(var(--bg-input))',
                                color: 'hsl(var(--text-main))',
                                fontFamily: 'inherit',
                                fontSize: 12,
                            }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ color: 'hsl(var(--text-muted))', fontSize: 10 }}>
                                Context: {documentName} · {activeTool}
                            </div>
                            <button
                                type="button"
                                data-testid="requirements-overlay-submit"
                                onClick={event => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void handleSubmit();
                                }}
                                disabled={isSubmitting || draft.trim().length === 0}
                                style={{
                                    marginLeft: 'auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 10px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: isSubmitting || draft.trim().length === 0 ? 'hsl(var(--bg-active))' : 'hsl(var(--accent-primary))',
                                    color: 'white',
                                    cursor: isSubmitting || draft.trim().length === 0 ? 'default' : 'pointer',
                                }}
                            >
                                <Send size={13} />
                                {isSubmitting ? 'Submitting…' : 'Send'}
                            </button>
                        </div>
                    </div>

                    <div style={{ minHeight: 0, display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)' }}>
                        <div style={{ borderRight: '1px solid hsl(var(--border-light))', overflowY: 'auto' }}>
                            {requirements.length === 0 && (
                                <div style={{ padding: 12, color: 'hsl(var(--text-muted))', fontSize: 11 }}>
                                    No requirements yet.
                                </div>
                            )}
                            {requirements.map(item => (
                                <div
                                    key={item.id}
                                    data-testid={`requirement-item-${item.id}`}
                                    onClick={event => {
                                        event.stopPropagation();
                                        selectRequirement(item.id);
                                    }}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            selectRequirement(item.id);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '10px 12px',
                                        border: 'none',
                                        borderBottom: '1px solid hsl(var(--border-mid))',
                                        background: selected?.id === item.id ? 'hsl(var(--bg-hover))' : 'transparent',
                                        color: 'hsl(var(--text-main))',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: 4,
                                    }}
                                >
                                    <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, userSelect: 'text' }}>{item.title}</span>
                                        <span style={{ fontSize: 10, color: STATUS_COLORS[item.status], userSelect: 'text' }}>{STATUS_LABELS[item.status]}</span>
                                    </div>
                                    <button
                                        type="button"
                                        data-testid={`requirement-remove-${item.id}`}
                                        title="Remove requirement"
                                        onClick={event => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            void handleRemove(item);
                                        }}
                                        disabled={removingId === item.id}
                                        style={{
                                            flex: '0 0 auto',
                                            width: 24,
                                            height: 24,
                                            borderRadius: 5,
                                            border: '1px solid hsl(var(--border-light))',
                                            background: removingId === item.id ? 'hsl(var(--bg-active))' : 'transparent',
                                            color: '#ffb4aa',
                                            cursor: removingId === item.id ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            userSelect: 'none',
                                        }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {!selected && (
                                <div style={{ padding: 12, color: 'hsl(var(--text-muted))', fontSize: 11 }}>
                                    Select a requirement to inspect details.
                                </div>
                            )}
                            {selected && (
                                <>
                                    <div style={{ padding: 12, borderBottom: '1px solid hsl(var(--border-light))', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{selected.title}</div>
                                            <span
                                                data-testid="requirement-selected-status"
                                                style={{
                                                    padding: '3px 7px',
                                                    borderRadius: 999,
                                                    background: STATUS_COLORS[selected.status],
                                                    color: 'white',
                                                    fontSize: 10,
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {STATUS_LABELS[selected.status]}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 11, color: 'hsl(var(--text-label))', lineHeight: 1.4 }}>
                                            {selected.rawPrompt}
                                        </div>
                                        <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
                                            {formatVerification(selected)}
                                        </div>
                                        {selected.runner && (
                                            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
                                                Runner: {selected.runner}
                                            </div>
                                        )}
                                        {selected.resultSummary && (
                                            <div style={{ fontSize: 11, color: 'hsl(var(--text-main))', lineHeight: 1.4 }}>
                                                {selected.resultSummary}
                                            </div>
                                        )}
                                        {selected.failureReason && (
                                            <div style={{ fontSize: 11, color: '#e67e22', lineHeight: 1.4 }}>
                                                {selected.failureReason}
                                            </div>
                                        )}
                                        {selected.mergeCommit && (
                                            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', wordBreak: 'break-all' }}>
                                                Merged: {selected.mergeCommit}
                                            </div>
                                        )}
                                        {(selected.status === 'blocked' || selected.status === 'failed') && (
                                            <button
                                                type="button"
                                                data-testid="requirement-retry-button"
                                                onClick={event => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    void handleRetry(selected);
                                                }}
                                                disabled={retryingId === selected.id}
                                                style={{
                                                    alignSelf: 'flex-start',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '6px 10px',
                                                    borderRadius: 6,
                                                    border: '1px solid hsl(var(--border-light))',
                                                    background: 'hsl(var(--bg-input))',
                                                    color: 'hsl(var(--text-main))',
                                                    cursor: retryingId === selected.id ? 'default' : 'pointer',
                                                }}
                                            >
                                                <RotateCcw size={12} />
                                                {retryingId === selected.id ? 'Retrying…' : 'Retry'}
                                            </button>
                                        )}
                                        {selected.status === 'running' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button
                                                    type="button"
                                                    data-testid="requirement-refresh-button"
                                                    onClick={event => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        void handleRefresh(selected);
                                                    }}
                                                    disabled={refreshingId === selected.id || stoppingId === selected.id}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        border: '1px solid hsl(var(--border-light))',
                                                        background: 'hsl(var(--bg-input))',
                                                        color: 'hsl(var(--text-main))',
                                                        cursor: refreshingId === selected.id || stoppingId === selected.id ? 'default' : 'pointer',
                                                    }}
                                                >
                                                    <RefreshCw size={12} />
                                                    {refreshingId === selected.id ? 'Checking…' : 'Refresh'}
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid="requirement-stop-button"
                                                    onClick={event => {
                                                        event.preventDefault();
                                                        event.stopPropagation();
                                                        void handleStop(selected);
                                                    }}
                                                    disabled={stoppingId === selected.id}
                                                    style={{
                                                        alignSelf: 'flex-start',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        border: '1px solid #c0392b',
                                                        background: 'rgba(192, 57, 43, 0.14)',
                                                        color: '#ffb4aa',
                                                        cursor: stoppingId === selected.id ? 'default' : 'pointer',
                                                    }}
                                                >
                                                    <Square size={12} />
                                                    {stoppingId === selected.id ? 'Stopping…' : 'Stop'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {selected.reviewWorkspace && (
                                        <div style={{ padding: 12, borderBottom: '1px solid hsl(var(--border-light))', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}>Review workspace</div>
                                            <div style={{ fontSize: 11, color: 'hsl(var(--text-main))' }}>Branch: {selected.reviewWorkspace.branchName}</div>
                                            <div style={{ fontSize: 11, color: 'hsl(var(--text-main))', wordBreak: 'break-all' }}>
                                                Worktree: {selected.reviewWorkspace.worktreePath}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
                                                Base: {selected.reviewWorkspace.baseRef}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ padding: 12, borderBottom: '1px solid hsl(var(--border-light))', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}>Changed files</div>
                                        {selected.changedFiles.length === 0 ? (
                                            <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>No files recorded yet.</div>
                                        ) : (
                                            selected.changedFiles.map(file => (
                                                <div key={file} style={{ fontSize: 11, color: 'hsl(var(--text-main))' }}>{file}</div>
                                            ))
                                        )}
                                    </div>

                                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--text-muted))' }}>Execution log</div>
                                        {selectedLogs.length === 0 ? (
                                            <div style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>No logs yet.</div>
                                        ) : (
                                            <>
                                                {hiddenLogCount > 0 && (
                                                    <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
                                                        Showing latest {visibleLogs.length} lines; {hiddenLogCount} older lines hidden.
                                                    </div>
                                                )}
                                                {visibleLogs.map((line, index) => (
                                                    <div key={`${selected.id}-log-${hiddenLogCount + index}`} style={{ fontSize: 11, color: 'hsl(var(--text-main))', lineHeight: 1.35 }}>
                                                        {line}
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
