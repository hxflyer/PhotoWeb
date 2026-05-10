import { useEffect, useSyncExternalStore } from 'react';
import {
    cancelEditingType,
    commitEditingType,
    setEditingType,
    bindTypeOverlayHandlers,
    subscribeTypeTool,
    typeToolState,
    commitTypeLayer,
    type TypeLayerData,
} from '../../tools/type';
import { useEditorStore } from '../../store/editorStore';
import { TextEditOverlay } from './TextEditOverlay';
import type { Layer } from '../../core/Layer';

function commitTypeData(data: TypeLayerData): void {
    const store = useEditorStore.getState();

    if (data.targetLayerId) {
        const layer = store.layers.find(l => l.id === data.targetLayerId);
        if (layer) {
            layer.kind = 'type';
            commitTypeLayer(layer.canvas, data);
            layer.typeData = data;
            layer.markDirty(null);
        }
    } else if (data.text.length > 0) {
        store.addLayer();
        const all = useEditorStore.getState().layers;
        const layer = all[all.length - 1];
        layer.kind = 'type';
        layer.name = data.text.slice(0, 24) || 'Type Layer';
        commitTypeLayer(layer.canvas, data);
        layer.typeData = { ...data, targetLayerId: layer.id };
        layer.markDirty(null);
    }

    useEditorStore.setState(state => ({ layers: [...state.layers] }));
}

export function TypeOverlayMount() {
    const editing = useSyncExternalStore(subscribeTypeTool, () => typeToolState.editing);
    const viewportZoom = useEditorStore(s => s.zoom);
    useEffect(() => {
        bindTypeOverlayHandlers(commitTypeData, () => {
            useEditorStore.setState(state => ({ layers: [...state.layers] }));
        });
    }, []);

    if (!editing) return null;

    const handleCommit = (value: string) => {
        commitEditingType(value);
    };

    return (
        <TextEditOverlay
            visible
            transform={editing.transform}
            style={editing.style}
            initialValue={editing.text}
            styleRuns={editing.styleRuns}
            textMode={editing.textMode ?? 'point'}
            zoom={viewportZoom}
            onChange={(v, styleRuns) => setEditingType({ ...editing, text: v, styleRuns })}
            onTransformChange={(transform) => setEditingType({ ...editing, transform })}
            onCommit={handleCommit}
            onCancel={cancelEditingType}
        />
    );
}

function layerText(data: TypeLayerData): string {
    return data.style.allCaps ? data.text.toUpperCase() : data.text;
}

function cssFromStyle(data: TypeLayerData, style = data.style): React.CSSProperties {
    return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fauxBold ? 700 : style.fontWeight,
        fontStyle: style.fauxItalic ? 'italic' : style.fontStyle,
        color: style.color,
        letterSpacing: `${style.letterSpacing / 1000 * style.fontSize}px`,
        lineHeight: style.lineHeight === 0 ? 1.2 : style.lineHeight,
        textAlign: style.textAlign,
        fontVariant: style.smallCaps ? 'small-caps' : undefined,
        textDecoration: [
            style.underline ? 'underline' : '',
            style.strikethrough ? 'line-through' : '',
        ].filter(Boolean).join(' ') || undefined,
        verticalAlign: style.superscript ? 'super' : style.subscript ? 'sub' : undefined,
        hyphens: style.hyphenate ? 'auto' : 'manual',
    };
}

function RichTypeText({ data }: { data: TypeLayerData }) {
    if (!data.styleRuns || data.styleRuns.length === 0) return <>{layerText(data)}</>;
    const boundaries = new Set<number>([0, data.text.length]);
    data.styleRuns.forEach(run => {
        boundaries.add(Math.max(0, Math.min(data.text.length, run.start)));
        boundaries.add(Math.max(0, Math.min(data.text.length, run.end)));
    });
    const points = [...boundaries].sort((a, b) => a - b);
    return (
        <>
            {points.map((start, i) => {
                const end = points[i + 1];
                if (end == null || end <= start) return null;
                const active = data.styleRuns!.filter(run => start >= run.start && start < run.end);
                const merged = active.reduce((acc, run) => ({ ...acc, ...run.style }), { ...data.style });
                const text = merged.allCaps ? data.text.slice(start, end).toUpperCase() : data.text.slice(start, end);
                return <span key={`${start}-${end}`} style={cssFromStyle(data, merged)}>{text}</span>;
            })}
        </>
    );
}

function TypeLayerVisual({ layer }: { layer: Layer }) {
    const data = layer.typeData as TypeLayerData | null;
    if (!data) return null;
    const style = data.style;
    const transform = [
        `translate(${data.transform.x}px, ${data.transform.y}px)`,
        `rotate(${data.transform.rotation}rad)`,
    ].join(' ');

    return (
        <div
            aria-hidden
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: (data.textMode ?? 'point') === 'box' ? data.transform.width : 'max-content',
                minWidth: (data.textMode ?? 'point') === 'box' ? 24 : 1,
                height: (data.textMode ?? 'point') === 'box' ? data.transform.height : 'auto',
                minHeight: (data.textMode ?? 'point') === 'box' ? data.transform.height : undefined,
                transform,
                transformOrigin: '0 0',
                pointerEvents: 'none',
                userSelect: 'none',
                opacity: layer.opacity * layer.fill,
                ...cssFromStyle(data),
                paddingLeft: style.indentLeft,
                paddingRight: style.indentRight,
                paddingTop: style.spaceBefore,
                paddingBottom: style.spaceAfter,
                textIndent: style.indentFirst,
                overflow: (data.textMode ?? 'point') === 'box' ? 'hidden' : 'visible',
                whiteSpace: (data.textMode ?? 'point') === 'box' ? 'pre-wrap' : 'pre',
                wordBreak: (data.textMode ?? 'point') === 'box' ? 'break-word' : 'normal',
                boxSizing: 'border-box',
            }}
        >
            <span
                style={{
                    display: 'block',
                    width: (data.textMode ?? 'point') === 'box' ? '100%' : 'max-content',
                    transform: `scale(${style.scaleX}, ${style.scaleY})`,
                    transformOrigin: '0 0',
                    lineHeight: 'inherit',
                }}
            >
                <RichTypeText data={data} />
            </span>
        </div>
    );
}

export function TypeLayerVisuals() {
    const layers = useEditorStore(s => s.layers);
    const editing = useSyncExternalStore(subscribeTypeTool, () => typeToolState.editing);
    return (
        <>
            {layers.map(layer => {
                if (!layer.visible || layer.kind !== 'type') return null;
                const data = layer.typeData as TypeLayerData | null;
                if (!data) return null;
                if (editing?.targetLayerId === layer.id) return null;
                return <TypeLayerVisual key={layer.id} layer={layer} />;
            })}
        </>
    );
}
