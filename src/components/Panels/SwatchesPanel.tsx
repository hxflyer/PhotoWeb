import { useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { ChevronDown, ChevronRight, FolderPlus, Plus, Trash2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

function isHexColor(value: string): boolean {
    return /^#[0-9a-f]{6}$/i.test(value.trim()) || /^#[0-9a-f]{3}$/i.test(value.trim());
}

function normalizeHex(value: string): string {
    const color = value.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
    }
    return color;
}

export function SwatchesPanel() {
    const {
        swatchGroups,
        selectedSwatchGroupId,
        primaryColor,
        secondaryColor,
        setPrimaryColor,
        setSecondaryColor,
        addSwatch,
        removeSwatch,
        addSwatchGroup,
        selectSwatchGroup,
        toggleSwatchGroup,
    } = useEditorStore();
    const [selectedSwatch, setSelectedSwatch] = useState<{ groupId: string; index: number } | null>(null);
    const groups = swatchGroups?.length
        ? swatchGroups
        : [{ id: 'default-swatches', name: 'Default Swatches', collapsed: false, swatches: [] }];

    const handleAddGroup = () => {
        const name = window.prompt('New Swatch Group Name', `Swatch Group ${groups.length + 1}`);
        if (name !== null) addSwatchGroup(name);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const color = event.dataTransfer.getData('application/x-photoweb-color')
            || event.dataTransfer.getData('text/plain');
        if (!isHexColor(color)) return;
        addSwatch(normalizeHex(color));
    };

    return (
        <div
            data-testid="swatches-panel"
            onDragOver={event => event.preventDefault()}
            onDrop={handleDrop}
            style={{ padding: '8px', fontSize: '11px', color: 'hsl(var(--text-main))' }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '11px' }}>Swatches</span>
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        data-testid="new-swatch-group"
                        onClick={handleAddGroup}
                        title="Create New Group"
                        style={iconButtonStyle()}
                    >
                        <FolderPlus size={13} />
                    </button>
                    <button
                        data-testid="new-swatch"
                        onClick={() => addSwatch(primaryColor)}
                        title="Create New Swatch"
                        style={{ ...iconButtonStyle(), color: primaryColor }}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        data-testid="delete-swatch"
                        onClick={() => {
                            if (!selectedSwatch) return;
                            removeSwatch(selectedSwatch.index, selectedSwatch.groupId);
                            setSelectedSwatch(null);
                        }}
                        disabled={!selectedSwatch}
                        title="Delete Swatch"
                        style={iconButtonStyle(!selectedSwatch)}
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                <div title={`Foreground ${primaryColor}`} style={largeSwatch(primaryColor, 'Foreground')} />
                <div title={`Background ${secondaryColor}`} style={largeSwatch(secondaryColor, 'Background')} />
            </div>

            <div data-testid="swatches-drop-target" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {groups.map(group => {
                    const selected = selectedSwatchGroupId === group.id;
                    return (
                        <div key={group.id} data-testid={`swatch-group-${group.id}`}>
                            <div
                                onClick={() => selectSwatchGroup(group.id)}
                                onDoubleClick={() => {
                                    const next = window.prompt('Swatch Group Name', group.name);
                                    if (next) useEditorStore.getState().renameSwatchGroup(group.id, next);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    minHeight: 20,
                                    padding: '2px 4px',
                                    background: selected ? 'hsl(var(--bg-hover))' : 'transparent',
                                    borderRadius: 3,
                                    cursor: 'default',
                                }}
                            >
                                <button
                                    data-testid={`swatch-group-toggle-${group.id}`}
                                    onClick={event => {
                                        event.stopPropagation();
                                        toggleSwatchGroup(group.id, event.metaKey || event.ctrlKey);
                                    }}
                                    title="Open or close swatch group"
                                    style={{
                                        width: 18,
                                        height: 18,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'hsl(var(--text-main))',
                                        padding: 0,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {group.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {group.name}
                                </span>
                            </div>
                            {!group.collapsed && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 18px)', gap: 3, padding: '4px 0 0 24px' }}>
                                    {group.swatches.map((swatch, index) => {
                                        const isSelected = selectedSwatch?.groupId === group.id && selectedSwatch.index === index;
                                        const isForeground = swatch.color === primaryColor;
                                        const isBackground = swatch.color === secondaryColor;
                                        return (
                                            <button
                                                key={swatch.id}
                                                type="button"
                                                draggable
                                                data-testid={`swatch-${group.id}-${index}`}
                                                title={`${swatch.name} ${swatch.color}`}
                                                onDragStart={event => {
                                                    event.dataTransfer.setData('application/x-photoweb-color', swatch.color);
                                                    event.dataTransfer.setData('text/plain', swatch.color);
                                                }}
                                                onClick={event => {
                                                    setSelectedSwatch({ groupId: group.id, index });
                                                    selectSwatchGroup(group.id);
                                                    if (event.metaKey || event.ctrlKey) setSecondaryColor(swatch.color);
                                                    else setPrimaryColor(swatch.color);
                                                }}
                                                onContextMenu={event => {
                                                    event.preventDefault();
                                                    removeSwatch(index, group.id);
                                                }}
                                                style={{
                                                    width: 18,
                                                    height: 18,
                                                    padding: 0,
                                                    background: swatch.color,
                                                    border: isSelected
                                                        ? '2px solid #ffffff'
                                                        : isForeground
                                                            ? '2px solid #d7d7d7'
                                                            : isBackground
                                                                ? '2px solid #111111'
                                                                : '1px solid #555',
                                                    borderRadius: 2,
                                                    cursor: 'pointer',
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function iconButtonStyle(disabled = false): CSSProperties {
    return {
        width: 22,
        height: 22,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(var(--bg-input))',
        color: disabled ? 'hsl(var(--text-disabled))' : 'hsl(var(--text-main))',
        border: '1px solid hsl(var(--border-light))',
        borderRadius: 3,
        cursor: disabled ? 'default' : 'pointer',
    };
}

function largeSwatch(color: string, label: string): CSSProperties {
    return {
        width: 26,
        height: 20,
        background: color,
        border: '1px solid #777',
        borderRadius: 2,
        boxShadow: label === 'Foreground' ? '0 0 0 1px #fff inset' : 'none',
    };
}
