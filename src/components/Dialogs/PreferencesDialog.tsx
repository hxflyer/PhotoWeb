import { useEffect, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import type { ColorTheme } from '../../store/types';

const THEME_THUMBS: { id: ColorTheme; label: string; sample: string }[] = [
    // Photoshop orders thumbnails darkest → lightest left-to-right.
    { id: 'darkest',  label: 'Darkest',  sample: 'hsl(0 0% 15%)' },
    { id: 'dark',     label: 'Dark',     sample: 'hsl(0 0% 23%)' },
    { id: 'light',    label: 'Light',    sample: 'hsl(0 0% 75%)' },
    { id: 'lightest', label: 'Lightest', sample: 'hsl(0 0% 90%)' },
];

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
    const colorTheme = useEditorStore(s => s.colorTheme);
    const setColorTheme = useEditorStore(s => s.setColorTheme);
    const neutralColorMode = useEditorStore(s => s.neutralColorMode);
    const setNeutralColorMode = useEditorStore(s => s.setNeutralColorMode);
    const [prefs, setPrefs] = useState<StoredUserPrefs>(loadPrefs);
    const dialogRef = useDialogA11y(isOpen, onClose);

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
            document.documentElement.style.fontSize = `${prefs.uiScale}rem`;
        }
        onClose();
    }

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="preferences-title" tabIndex={-1} style={cardStyle} onClick={e => e.stopPropagation()}>
                <div id="preferences-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Preferences</div>

                {/* Interface — color theme + neutral color mode. */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ opacity: 0.85, marginBottom: 6 }}>Interface</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 152, opacity: 0.85 }}>Color Theme</span>
                        <div data-testid="color-theme-thumbs" style={{ display: 'flex', gap: 6 }}>
                            {THEME_THUMBS.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    data-testid={`color-theme-thumb-${t.id}`}
                                    data-active={colorTheme === t.id || undefined}
                                    onClick={() => setColorTheme(t.id)}
                                    title={t.label}
                                    style={{
                                        width: 40,
                                        height: 28,
                                        background: t.sample,
                                        border: colorTheme === t.id
                                            ? '2px solid hsl(var(--accent-highlight))'
                                            : '1px solid hsl(var(--border-mid))',
                                        borderRadius: 2,
                                        padding: 0,
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <input
                            type="checkbox"
                            data-testid="pref-neutral-color-mode"
                            checked={neutralColorMode}
                            onChange={e => setNeutralColorMode(e.target.checked)}
                        />
                        <span style={{ opacity: 0.85 }}>Neutral Color Mode</span>
                    </label>
                </div>

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
