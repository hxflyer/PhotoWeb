import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { CUSTOM_SHAPE_VIEWBOX, getCustomShapeGroups, type CustomShape } from '../../tools/customShapes';
import { addCustomShapeLayerFromPreset, getShapeOptions, setShapeOptions } from '../../tools/shapes';

function ShapeThumb({ shape, active }: { shape: CustomShape; active: boolean }) {
    return (
        <svg viewBox={`0 0 ${CUSTOM_SHAPE_VIEWBOX} ${CUSTOM_SHAPE_VIEWBOX}`} width={28} height={28} aria-hidden="true">
            <path d={shape.pathD} fill="currentColor" fillRule="evenodd" opacity={active ? 1 : 0.86} />
        </svg>
    );
}

export function ShapesPanel() {
    const groups = getCustomShapeGroups();
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [, force] = useState(0);
    const { width, height } = useEditorStore();
    const activeId = getShapeOptions().customShapeId;

    const pickShape = (shape: CustomShape) => {
        setShapeOptions({ customShapeId: shape.id });
        useEditorStore.setState({ activeTool: 'shape-custom' });
        force(t => t + 1);
    };

    const addAtCenter = (shape: CustomShape) => {
        pickShape(shape);
        addCustomShapeLayerFromPreset(shape.id, { x: width / 2, y: height / 2 });
    };

    return (
        <div data-testid="shapes-panel" style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto', height: '100%' }}>
            {groups.map(group => {
                const isCollapsed = !!collapsed[group.id];
                return (
                    <div key={group.id} data-testid={`shapes-panel-group-${group.id}`}>
                        <button
                            type="button"
                            data-testid={`shapes-panel-group-toggle-${group.id}`}
                            onClick={() => setCollapsed(state => ({ ...state, [group.id]: !state[group.id] }))}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                width: '100%',
                                padding: '4px 2px',
                                background: 'transparent',
                                border: 'none',
                                color: 'hsl(var(--text-main))',
                                cursor: 'pointer',
                                fontSize: 11,
                                fontWeight: 600,
                                textAlign: 'left',
                            }}
                        >
                            <ChevronRight size={13} style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }} />
                            <span>{group.name}</span>
                        </button>
                        {!isCollapsed && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: 4, padding: '2px 0 6px 17px' }}>
                                {group.shapes.map(shape => {
                                    const active = activeId === shape.id;
                                    return (
                                        <button
                                            key={shape.id}
                                            type="button"
                                            draggable
                                            data-testid={`shapes-panel-shape-${shape.id}`}
                                            title={`${shape.name} - drag to the canvas or double-click to add`}
                                            onClick={() => pickShape(shape)}
                                            onDoubleClick={() => addAtCenter(shape)}
                                            onDragStart={event => {
                                                pickShape(shape);
                                                event.dataTransfer.effectAllowed = 'copy';
                                                event.dataTransfer.setData('application/x-photoweb-custom-shape', shape.id);
                                                event.dataTransfer.setData('text/plain', shape.id);
                                            }}
                                            style={{
                                                position: 'relative',
                                                height: 42,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: active ? 'white' : 'hsl(var(--text-main))',
                                                background: active ? 'hsl(var(--accent-primary))' : 'hsl(var(--bg-input))',
                                                border: `1px solid ${active ? 'hsl(var(--accent-primary))' : 'hsl(var(--border-light))'}`,
                                                borderRadius: 4,
                                                cursor: 'grab',
                                            }}
                                        >
                                            <ShapeThumb shape={shape} active={active} />
                                            <span style={{ position: 'absolute', right: 2, bottom: 2, opacity: 0.55 }}>
                                                <Plus size={10} />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
