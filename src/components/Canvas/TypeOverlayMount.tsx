import { useSyncExternalStore } from 'react';
import {
    cancelEditingType,
    commitEditingType,
    setEditingType,
    subscribeTypeTool,
    typeToolState,
    commitTypeLayer,
    type TypeLayerData,
} from '../../tools/type';
import { useEditorStore } from '../../store/editorStore';
import { TextEditOverlay } from './TextEditOverlay';

export function TypeOverlayMount() {
    const editing = useSyncExternalStore(subscribeTypeTool, () => typeToolState.editing);
    if (!editing) return null;

    return (
        <TextEditOverlay
            visible
            transform={editing.transform}
            style={editing.style}
            initialValue={editing.text}
            zoom={1}
            onChange={(v) => setEditingType({ ...editing, text: v })}
            onCommit={(value) => {
                const store = useEditorStore.getState();
                const data: TypeLayerData = { ...editing, text: value };
                store.addLayer();
                const all = useEditorStore.getState().layers;
                const layer = all[all.length - 1];
                commitTypeLayer(layer.canvas, data);
                layer.markDirty(null);
                commitEditingType(value);
            }}
            onCancel={cancelEditingType}
        />
    );
}
