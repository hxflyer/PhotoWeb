import { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface StoredUserPrefs {
    autosaveIntervalSec: number;
    historyMaxSize: number;
    uiScale: number;
}

const PREFS_KEY = 'photoweb:userPrefs:v1';

function loadPrefs(): StoredUserPrefs {
    if (typeof localStorage === 'undefined') return { autosaveIntervalSec: 60, historyMaxSize: 50, uiScale: 1 };
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (!raw) return { autosaveIntervalSec: 60, historyMaxSize: 50, uiScale: 1 };
        return { autosaveIntervalSec: 60, historyMaxSize: 50, uiScale: 1, ...(JSON.parse(raw) as Partial<StoredUserPrefs>) };
    } catch {
        return { autosaveIntervalSec: 60, historyMaxSize: 50, uiScale: 1 };
    }
}

function persistPrefs(prefs: StoredUserPrefs): void {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* quota */ }
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const cardStyle: React.CSSProperties = {
    background: '#2a2a2a', border: '1px solid #444', borderRadius: 6,
    padding: 16, minWidth: 380, color: 'white', fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const inputStyle: React.CSSProperties = {
    background: '#333', border: '1px solid #555', borderRadius: 3,
    color: 'white', padding: '4px 8px', fontSize: 12, flex: 1,
};

export function PreferencesDialog({ isOpen, onClose }: Props) {
    const setHistoryMaxSize = useEditorStore.getState().setHistoryMaxSize;
    const [prefs, setPrefs] = useState<StoredUserPrefs>(loadPrefs);

    useEffect(() => {
        if (isOpen) setPrefs(loadPrefs());
    }, [isOpen]);

    if (!isOpen) return null;

    function patch(p: Partial<StoredUserPrefs>) {
        const next = { ...prefs, ...p };
        setPrefs(next);
    }

    function commit() {
        persistPrefs(prefs);
        setHistoryMaxSize(prefs.historyMaxSize);
        if (typeof document !== 'undefined' && document.documentElement) {
            document.documentElement.style.fontSize = `${prefs.uiScale * 14}px`;
        }
        onClose();
    }

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={cardStyle} onClick={e => e.stopPropagation()}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Preferences</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 160, opacity: 0.85 }}>History max size</span>
                        <input type="number" min={5} max={500} value={prefs.historyMaxSize}
                            onChange={e => patch({ historyMaxSize: Math.max(5, Math.min(500, Number(e.target.value) || 50)) })}
                            style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 160, opacity: 0.85 }}>Autosave interval (sec)</span>
                        <input type="number" min={10} max={3600} value={prefs.autosaveIntervalSec}
                            onChange={e => patch({ autosaveIntervalSec: Math.max(10, Math.min(3600, Number(e.target.value) || 60)) })}
                            style={inputStyle} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 160, opacity: 0.85 }}>UI scale</span>
                        <input type="range" min={0.8} max={1.4} step={0.05} value={prefs.uiScale}
                            onChange={e => patch({ uiScale: Number(e.target.value) })}
                            style={{ flex: 1 }} />
                        <span style={{ minWidth: 32, textAlign: 'right' }}>{Math.round(prefs.uiScale * 100)}%</span>
                    </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={commit} style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer' }}>Save</button>
                </div>
            </div>
        </div>
    );
}
