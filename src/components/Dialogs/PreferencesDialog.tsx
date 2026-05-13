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

type CategoryId = 'general' | 'interface' | 'tools' | 'fileHandling' | 'performance';
const CATEGORIES: { id: CategoryId; label: string }[] = [
    { id: 'general',      label: 'General' },
    { id: 'interface',    label: 'Interface' },
    { id: 'tools',        label: 'Tools' },
    { id: 'fileHandling', label: 'File Handling' },
    { id: 'performance',  label: 'Performance' },
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
    padding: 0, minWidth: 540, color: 'white', fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    display: 'flex', flexDirection: 'column',
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
    const useShiftForToolSwitch = useEditorStore(s => s.useShiftForToolSwitch);
    const setUseShiftForToolSwitch = useEditorStore(s => s.setUseShiftForToolSwitch);
    const [prefs, setPrefs] = useState<StoredUserPrefs>(loadPrefs);
    // Photoshop opens Preferences on the General pane each time.
    const [category, setCategory] = useState<CategoryId>('general');
    const dialogRef = useDialogA11y(isOpen, onClose);

    useEffect(() => {
        if (isOpen) {
            setPrefs(loadPrefs());
            setCategory('general');
        }
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
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="preferences-title"
                tabIndex={-1}
                style={cardStyle}
                onClick={e => e.stopPropagation()}
            >
                <div id="preferences-title" style={{ fontWeight: 600, padding: '12px 16px', fontSize: 13, borderBottom: '1px solid #444' }}>
                    Preferences
                </div>
                <div style={{ display: 'flex', flex: 1 }}>
                    <aside
                        data-testid="preferences-sidebar"
                        style={{
                            width: 140,
                            background: '#222',
                            borderRight: '1px solid #444',
                            padding: '8px 0',
                            display: 'flex', flexDirection: 'column',
                        }}
                    >
                        {CATEGORIES.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                data-testid={`preferences-category-${c.id}`}
                                data-active={category === c.id || undefined}
                                onClick={() => setCategory(c.id)}
                                style={{
                                    border: 'none',
                                    background: category === c.id ? 'hsl(var(--accent-primary))' : 'transparent',
                                    color: 'white',
                                    textAlign: 'left',
                                    padding: '5px 16px',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                }}
                            >
                                {c.label}
                            </button>
                        ))}
                    </aside>

                    <section data-testid="preferences-content" style={{ flex: 1, padding: 16, minWidth: 360 }}>
                        {category === 'general' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ opacity: 0.7 }}>
                                    No General settings yet — image-interpolation default lands with the Image Size cluster.
                                </div>
                            </div>
                        )}

                        {category === 'interface' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                        type="checkbox"
                                        data-testid="pref-neutral-color-mode"
                                        checked={neutralColorMode}
                                        onChange={e => setNeutralColorMode(e.target.checked)}
                                    />
                                    <span style={{ opacity: 0.85 }}>Neutral Color Mode</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 152, opacity: 0.85 }}>UI Font Size</span>
                                    <input type="range" min={0.8} max={1.4} step={0.05} value={prefs.uiScale}
                                        onChange={e => patch({ uiScale: Number(e.target.value) })}
                                        style={{ flex: 1 }} />
                                    <span style={{ minWidth: 32, textAlign: 'right' }}>{Math.round(prefs.uiScale * 100)}%</span>
                                </label>
                            </div>
                        )}

                        {category === 'tools' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                        type="checkbox"
                                        data-testid="pref-use-shift-tool-switch"
                                        checked={useShiftForToolSwitch}
                                        onChange={e => setUseShiftForToolSwitch(e.target.checked)}
                                    />
                                    <span style={{ opacity: 0.85 }}>Use Shift Key for Tool Switch</span>
                                </label>
                            </div>
                        )}

                        {category === 'fileHandling' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 152, opacity: 0.85 }}>Autosave interval (sec)</span>
                                    <input type="number" min={10} max={3600} value={prefs.autosaveIntervalSec}
                                        onChange={e => patch({ autosaveIntervalSec: Math.max(10, Math.min(3600, Number(e.target.value) || 60)) })}
                                        style={inputStyle} />
                                </label>
                            </div>
                        )}

                        {category === 'performance' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 152, opacity: 0.85 }}>History max size</span>
                                    <input type="number" min={5} max={500} value={prefs.historyMaxSize}
                                        onChange={e => patch({ historyMaxSize: Math.max(5, Math.min(500, Number(e.target.value) || 50)) })}
                                        style={inputStyle} />
                                </label>
                                <div style={{ opacity: 0.6, fontSize: 11 }}>
                                    Memory usage and scratch disks are managed by the browser.
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 12, borderTop: '1px solid #444' }}>
                    <button onClick={onClose} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={commit} style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer' }}>Save</button>
                </div>
            </div>
        </div>
    );
}
