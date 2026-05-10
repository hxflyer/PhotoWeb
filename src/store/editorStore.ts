import { create } from 'zustand';
import { createDocumentSlice } from './documentSlice';
import { createLayersSlice } from './layersSlice';
import { createSelectionSlice } from './selectionSlice';
import { createToolsSlice } from './toolsSlice';
import { createViewSlice } from './viewSlice';
import { createColorSlice } from './colorSlice';
import { createPanelsSlice } from './panelsSlice';
import { createHistorySlice } from './historySlice';
import { createToastsSlice } from './toastsSlice';
import type { EditorStore } from './types';

export type { SelectionMode, SelectionState, EditorStore } from './types';

export const useEditorStore = create<EditorStore>()((...a) => ({
    ...createDocumentSlice(...a),
    ...createLayersSlice(...a),
    ...createSelectionSlice(...a),
    ...createToolsSlice(...a),
    ...createViewSlice(...a),
    ...createColorSlice(...a),
    ...createPanelsSlice(...a),
    ...createHistorySlice(...a),
    ...createToastsSlice(...a),
}));
