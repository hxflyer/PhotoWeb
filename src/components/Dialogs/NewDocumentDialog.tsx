import { useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { requestViewportFit } from '../../utils/viewportFit';
import { useDialogA11y } from '../../hooks/useDialogA11y';
import { evaluateNumericExpression } from '../../utils/numericExpression';
import {
    consumeNextUntitledIndex,
    deleteSavedPreset,
    listRecentPresets,
    listSavedPresets,
    peekNextUntitledIndex,
    pushRecentPreset,
    savePreset,
    type NewDocPreset,
} from '../../utils/newDocPresets';
import portraitIcon from '../../assets/icons/orientation-portrait.svg';
import landscapeIcon from '../../assets/icons/orientation-landscape.svg';
import saveIcon from '../../assets/icons/save-preset.svg';

type TabKey = 'recent' | 'saved' | 'photo' | 'web';

interface BuiltInPreset {
    label: string;
    width: number;
    height: number;
    resolution: number;
}

const PHOTO_PRESETS: BuiltInPreset[] = [
    { label: 'Default photo (3000 × 2000)', width: 3000, height: 2000, resolution: 300 },
    { label: 'Square (2048 × 2048)', width: 2048, height: 2048, resolution: 300 },
    { label: '4 × 6 in @ 300', width: 1800, height: 1200, resolution: 300 },
    { label: '5 × 7 in @ 300', width: 2100, height: 1500, resolution: 300 },
];

const WEB_PRESETS: BuiltInPreset[] = [
    { label: '1920 × 1080', width: 1920, height: 1080, resolution: 72 },
    { label: '1366 × 768', width: 1366, height: 768, resolution: 72 },
    { label: '1280 × 720', width: 1280, height: 720, resolution: 72 },
    { label: '800 × 600', width: 800, height: 600, resolution: 72 },
];

type BgKind = 'white' | 'black' | 'transparent' | 'custom';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

function bgKindToColor(kind: BgKind, custom: string): string {
    if (kind === 'white') return '#ffffff';
    if (kind === 'black') return '#000000';
    if (kind === 'custom') return custom;
    return 'transparent';
}

function presetThumbStyle(w: number, h: number): React.CSSProperties {
    const ratio = w / h;
    const maxSide = 56;
    const tw = ratio >= 1 ? maxSide : Math.round(maxSide * ratio);
    const th = ratio >= 1 ? Math.round(maxSide / ratio) : maxSide;
    return { width: `${tw}px`, height: `${th}px`, border: '1px solid #888', background: '#1a1a1a' };
}

export function NewDocumentDialog({ isOpen, onClose }: Props) {
    if (!isOpen) return null;
    return <NewDocumentDialogContent onClose={onClose} />;
}

function NewDocumentDialogContent({ onClose }: { onClose: () => void }) {
    const newDocument = useEditorStore(s => s.newDocument);
    const clipboardImageInfo = useEditorStore(s => s.clipboardImageInfo);
    const addToast = useEditorStore(s => s.addToast);

    const initialRecents = useMemo(() => listRecentPresets(), []);
    const initialSaved = useMemo(() => listSavedPresets(), []);
    const initialName = useMemo(() => `Untitled-${peekNextUntitledIndex()}`, []);
    const initialWidth = clipboardImageInfo?.width ?? 1920;
    const initialHeight = clipboardImageInfo?.height ?? 1080;
    const initialResolution = clipboardImageInfo?.resolution ?? 72;
    const initialTab: TabKey = clipboardImageInfo
        ? 'recent'
        : (initialRecents.length > 0 ? 'recent' : 'photo');

    const [tab, setTab] = useState<TabKey>(initialTab);
    const [name, setName] = useState(initialName);
    const [nameIsAutoUntitled, setNameIsAutoUntitled] = useState(true);
    const [width, setWidth] = useState(initialWidth);
    const [height, setHeight] = useState(initialHeight);
    const [widthText, setWidthText] = useState(String(initialWidth));
    const [heightText, setHeightText] = useState(String(initialHeight));
    const [resolution, setResolution] = useState(initialResolution);
    const [resolutionText, setResolutionText] = useState(String(initialResolution));
    const [bgKind, setBgKind] = useState<BgKind>('white');
    const [customBg, setCustomBg] = useState('#808080');
    const [recents] = useState<NewDocPreset[]>(initialRecents);
    const [saved, setSaved] = useState<NewDocPreset[]>(initialSaved);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
        clipboardImageInfo ? '__clipboard' : null,
    );

    const dialogRef = useDialogA11y(true, onClose);
    const colorInputRef = useRef<HTMLInputElement>(null);

    const orientation: 'portrait' | 'landscape' | 'square' = useMemo(() => {
        if (width === height) return 'square';
        return width > height ? 'landscape' : 'portrait';
    }, [width, height]);

    function commitWidth(text: string) {
        const v = evaluateNumericExpression(text);
        if (v !== null && v > 0) {
            const next = Math.round(v);
            setWidth(next);
            setWidthText(String(next));
            setSelectedPresetId(null);
        } else {
            setWidthText(String(width));
        }
    }
    function commitHeight(text: string) {
        const v = evaluateNumericExpression(text);
        if (v !== null && v > 0) {
            const next = Math.round(v);
            setHeight(next);
            setHeightText(String(next));
            setSelectedPresetId(null);
        } else {
            setHeightText(String(height));
        }
    }
    function commitResolution(text: string) {
        const v = evaluateNumericExpression(text);
        if (v !== null && v > 0) {
            const next = Math.round(v);
            setResolution(next);
            setResolutionText(String(next));
        } else {
            setResolutionText(String(resolution));
        }
    }

    function swapOrientation(target: 'portrait' | 'landscape') {
        if (target === orientation) return;
        if (width === height) {
            // Square stays square; clicking a side flips it conceptually but the
            // numbers are equal. Treat as no-op rather than introduce
            // off-by-one drift.
            return;
        }
        const w = width, h = height;
        setWidth(h);
        setHeight(w);
        setWidthText(String(h));
        setHeightText(String(w));
    }

    function applyPreset(p: BuiltInPreset | NewDocPreset, id: string) {
        setWidth(p.width);
        setHeight(p.height);
        setWidthText(String(p.width));
        setHeightText(String(p.height));
        setResolution(p.resolution);
        setResolutionText(String(p.resolution));
        setSelectedPresetId(id);
        if ('background' in p) {
            const bg = p.background;
            if (bg === 'white' || bg === 'black' || bg === 'transparent') {
                setBgKind(bg);
            } else if (typeof bg === 'string' && bg.startsWith('#')) {
                setBgKind('custom');
                setCustomBg(bg);
            }
            if (p.name && p.name !== name) {
                setName(p.name);
                setNameIsAutoUntitled(false);
            }
        }
    }

    function handleSavePreset() {
        if (!name.trim()) {
            addToast('Name the document before saving the preset.', 'error');
            return;
        }
        const entry = savePreset({
            name: name.trim(),
            width,
            height,
            resolution,
            background: bgKind === 'custom' ? customBg : bgKind,
        });
        if (!entry) {
            addToast("Couldn't save preset", 'error');
            return;
        }
        setSaved(listSavedPresets());
        setTab('saved');
    }

    function handleDeleteSaved(id: string) {
        deleteSavedPreset(id);
        setSaved(listSavedPresets());
        if (selectedPresetId === id) setSelectedPresetId(null);
    }

    function handleCreate() {
        const bgColor = bgKindToColor(bgKind, customBg);
        const created = newDocument(width, height, bgColor, name.trim(), resolution);
        if (!created) return;
        if (nameIsAutoUntitled) consumeNextUntitledIndex();
        pushRecentPreset({
            name: name.trim() || 'Untitled',
            width,
            height,
            resolution,
            background: bgKind === 'custom' ? customBg : bgKind,
        });
        requestViewportFit();
        onClose();
    }

    function handleKeyDownDialog(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement | null;
            if (target && (target.tagName === 'TEXTAREA')) return;
            // Inputs already commit-on-Enter via their own onKeyDown; allow
            // Enter on the buttons / dialog body to fire Create as Photoshop
            // does.
            if (target && target.tagName === 'INPUT' && target.dataset['createOnEnter'] !== 'true') return;
            e.preventDefault();
            handleCreate();
        }
    }

    const tabGallery = renderGallery();

    function renderGallery(): React.ReactNode {
        if (tab === 'recent') {
            const tiles: React.ReactNode[] = [];
            if (clipboardImageInfo) {
                tiles.push(
                    <PresetTile
                        key="__clipboard"
                        title="From Clipboard"
                        subtitle={`${clipboardImageInfo.width} × ${clipboardImageInfo.height} @ ${clipboardImageInfo.resolution} ppi`}
                        w={clipboardImageInfo.width}
                        h={clipboardImageInfo.height}
                        selected={selectedPresetId === '__clipboard'}
                        onClick={() => {
                            setWidth(clipboardImageInfo.width);
                            setHeight(clipboardImageInfo.height);
                            setWidthText(String(clipboardImageInfo.width));
                            setHeightText(String(clipboardImageInfo.height));
                            setResolution(clipboardImageInfo.resolution);
                            setResolutionText(String(clipboardImageInfo.resolution));
                            setSelectedPresetId('__clipboard');
                        }}
                        testid="preset-tile-clipboard"
                    />,
                );
            }
            for (const p of recents) {
                tiles.push(
                    <PresetTile
                        key={p.id}
                        title={p.name}
                        subtitle={`${p.width} × ${p.height} @ ${p.resolution} ppi`}
                        w={p.width}
                        h={p.height}
                        selected={selectedPresetId === p.id}
                        onClick={() => applyPreset(p, p.id)}
                        testid={`preset-tile-recent-${p.id}`}
                    />,
                );
            }
            if (tiles.length === 0) return <EmptyState>Nothing here yet.</EmptyState>;
            return tiles;
        }
        if (tab === 'saved') {
            if (saved.length === 0) {
                return <EmptyState>Saved presets will appear here. Click the save icon next to the document name to save one.</EmptyState>;
            }
            return saved.map(p => (
                <PresetTile
                    key={p.id}
                    title={p.name}
                    subtitle={`${p.width} × ${p.height} @ ${p.resolution} ppi`}
                    w={p.width}
                    h={p.height}
                    selected={selectedPresetId === p.id}
                    onClick={() => applyPreset(p, p.id)}
                    onDelete={() => handleDeleteSaved(p.id)}
                    testid={`preset-tile-saved-${p.id}`}
                />
            ));
        }
        const list = tab === 'photo' ? PHOTO_PRESETS : WEB_PRESETS;
        return list.map(p => (
            <PresetTile
                key={p.label}
                title={p.label}
                subtitle={`${p.width} × ${p.height} @ ${p.resolution} ppi`}
                w={p.width}
                h={p.height}
                selected={selectedPresetId === `${tab}:${p.label}`}
                onClick={() => applyPreset(p, `${tab}:${p.label}`)}
                testid={`preset-tile-${tab}-${p.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`}
            />
        ));
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-document-title"
                tabIndex={-1}
                data-testid="new-document-dialog"
                onKeyDown={handleKeyDownDialog}
                style={{
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    width: '720px',
                    height: '460px',
                }}
            >
                <div id="new-document-title" style={{ display: 'flex', alignItems: 'center', height: '34px', padding: '0 16px', borderBottom: '1px solid #444' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>New Document</span>
                </div>

                <div style={{ display: 'flex', gap: 0, height: '32px', borderBottom: '1px solid #444', padding: '0 12px' }}>
                    {(['recent', 'saved', 'photo', 'web'] as TabKey[]).map(t => {
                        const count = t === 'recent' ? (recents.length + (clipboardImageInfo ? 1 : 0))
                            : t === 'saved' ? saved.length
                            : null;
                        return (
                            <button
                                key={t}
                                data-testid={`tab-${t}`}
                                onClick={() => setTab(t)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: tab === t ? '#fff' : '#aaa',
                                    borderBottom: tab === t ? '2px solid #0090ff' : '2px solid transparent',
                                    padding: '0 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {t === 'web' ? 'Web' : t}{count !== null && count > 0 ? ` (${count})` : ''}
                            </button>
                        );
                    })}
                </div>

                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    <div
                        data-testid="preset-gallery"
                        style={{
                            flex: 1,
                            padding: '12px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            alignContent: 'flex-start',
                            borderRight: '1px solid #444',
                        }}
                    >
                        {tabGallery}
                    </div>

                    <div style={{ width: '260px', padding: '12px 14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#bbb' }}>Preset Details</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                data-testid="new-doc-name"
                                value={name}
                                onChange={e => { setName(e.target.value); setNameIsAutoUntitled(false); }}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            />
                            <button
                                data-testid="new-doc-save-preset"
                                onClick={handleSavePreset}
                                title="Save Preset"
                                style={{ width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: '#ddd', cursor: 'pointer' }}
                            >
                                <img src={saveIcon} alt="Save preset" style={{ width: '14px', height: '14px', display: 'block' }} />
                            </button>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '70px', color: '#bbb' }}>Width</span>
                            <input
                                data-testid="new-doc-width"
                                type="text"
                                value={widthText}
                                onChange={e => setWidthText(e.target.value)}
                                onBlur={e => commitWidth(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitWidth((e.target as HTMLInputElement).value); } }}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            />
                            <span style={{ color: '#bbb', width: '22px' }}>px</span>
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <span style={{ width: '70px', color: '#bbb' }}>Height</span>
                                <input
                                    data-testid="new-doc-height"
                                    type="text"
                                    value={heightText}
                                    onChange={e => setHeightText(e.target.value)}
                                    onBlur={e => commitHeight(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitHeight((e.target as HTMLInputElement).value); } }}
                                    style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                                />
                                <span style={{ color: '#bbb', width: '22px' }}>px</span>
                            </label>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '70px', color: '#bbb' }}>Orientation</span>
                            <button
                                data-testid="orientation-portrait"
                                onClick={() => swapOrientation('portrait')}
                                aria-pressed={orientation === 'portrait'}
                                title="Portrait"
                                style={{
                                    width: '28px',
                                    height: '24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: orientation === 'portrait' ? 'rgba(0,144,255,0.25)' : '#333',
                                    border: orientation === 'portrait' ? '1px solid #0090ff' : '1px solid #555',
                                    borderRadius: '3px',
                                    color: orientation === 'portrait' ? '#0090ff' : '#bbb',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                <img src={portraitIcon} alt="" style={{ width: '14px', height: '14px', display: 'block', filter: orientation === 'portrait' ? 'none' : undefined }} />
                            </button>
                            <button
                                data-testid="orientation-landscape"
                                onClick={() => swapOrientation('landscape')}
                                aria-pressed={orientation === 'landscape'}
                                title="Landscape"
                                style={{
                                    width: '28px',
                                    height: '24px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: orientation === 'landscape' ? 'rgba(0,144,255,0.25)' : '#333',
                                    border: orientation === 'landscape' ? '1px solid #0090ff' : '1px solid #555',
                                    borderRadius: '3px',
                                    color: orientation === 'landscape' ? '#0090ff' : '#bbb',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            >
                                <img src={landscapeIcon} alt="" style={{ width: '14px', height: '14px', display: 'block' }} />
                            </button>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '70px', color: '#bbb' }}>Resolution</span>
                            <input
                                data-testid="new-doc-resolution"
                                type="text"
                                value={resolutionText}
                                onChange={e => setResolutionText(e.target.value)}
                                onBlur={e => commitResolution(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitResolution((e.target as HTMLInputElement).value); } }}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            />
                            <span style={{ color: '#bbb', width: '22px' }}>ppi</span>
                        </label>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '70px', color: '#bbb' }}>Background</span>
                            <select
                                data-testid="new-doc-bg"
                                value={bgKind}
                                onChange={e => {
                                    const next = e.target.value as BgKind;
                                    setBgKind(next);
                                    if (next === 'custom') {
                                        // Defer opening the picker; jsdom doesn't open natively
                                        // but tests can drive the input ref directly.
                                        queueMicrotask(() => colorInputRef.current?.click());
                                    }
                                }}
                                style={{ flex: 1, background: '#333', border: '1px solid #555', borderRadius: '3px', color: 'white', padding: '4px 8px', fontSize: '12px' }}
                            >
                                <option value="white">White</option>
                                <option value="black">Black</option>
                                <option value="transparent">Transparent</option>
                                <option value="custom">Custom</option>
                            </select>
                            <button
                                data-testid="new-doc-bg-swatch"
                                onClick={() => { if (bgKind === 'custom') colorInputRef.current?.click(); }}
                                data-bg={bgKind}
                                aria-label="Background swatch"
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    border: '1px solid #888',
                                    borderRadius: '2px',
                                    background: bgKind === 'transparent'
                                        ? 'repeating-conic-gradient(#ccc 0% 25%, #eee 0% 50%) 50% / 8px 8px'
                                        : bgKindToColor(bgKind, customBg),
                                    cursor: bgKind === 'custom' ? 'pointer' : 'default',
                                    padding: 0,
                                }}
                            />
                            <input
                                ref={colorInputRef}
                                data-testid="new-doc-bg-custom-input"
                                type="color"
                                value={customBg}
                                onInput={e => {
                                    const v = (e.target as HTMLInputElement).value;
                                    setCustomBg(v);
                                    setBgKind('custom');
                                }}
                                onChange={e => {
                                    const v = (e.target as HTMLInputElement).value;
                                    setCustomBg(v);
                                    setBgKind('custom');
                                }}
                                style={{ width: 0, height: 0, opacity: 0, pointerEvents: 'none', position: 'absolute' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 16px', borderTop: '1px solid #444' }}>
                    <button onClick={onClose} style={{ padding: '4px 14px', background: 'transparent', border: '1px solid #555', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Close</button>
                    <button
                        onClick={handleCreate}
                        data-testid="new-document-create-btn"
                        style={{ padding: '4px 14px', background: '#0090ff', border: 'none', borderRadius: '3px', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}

interface PresetTileProps {
    title: string;
    subtitle: string;
    w: number;
    h: number;
    selected: boolean;
    onClick: () => void;
    onDelete?: () => void;
    testid?: string;
}

function PresetTile({ title, subtitle, w, h, selected, onClick, onDelete, testid }: PresetTileProps) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            data-testid={testid}
            data-selected={selected ? 'true' : 'false'}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative',
                width: '120px',
                padding: '8px',
                background: selected ? 'rgba(0,144,255,0.15)' : '#1f1f1f',
                border: selected ? '1.5px solid #0090ff' : '1px solid #3a3a3a',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none',
            }}
        >
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={presetThumbStyle(w, h)} />
            </div>
            <div style={{ fontSize: '11px', color: '#ddd', maxWidth: '104px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            <div style={{ fontSize: '10px', color: '#888' }}>{subtitle}</div>
            {onDelete && hovered && (
                <button
                    data-testid={`${testid}-trash`}
                    onClick={e => { e.stopPropagation(); onDelete(); }}
                    aria-label="Delete preset"
                    style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '20px',
                        height: '20px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#aa3333',
                        border: 'none',
                        borderRadius: '3px',
                        color: 'white',
                        cursor: 'pointer',
                        padding: 0,
                    }}
                >
                    <Trash2 size={12} />
                </button>
            )}
        </div>
    );
}

function EmptyState({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ padding: '24px', color: '#888', fontSize: '12px', width: '100%', textAlign: 'center' }}>{children}</div>
    );
}
