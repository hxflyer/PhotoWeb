import type { EditorStore, SelectionOperation } from '../store/types';
import { rasterizeSelectionOperations } from '../utils/selectionUtils';

// Universal selection modifier semantics — Phase 1.5.
// Every selection tool (marquee, lasso, lasso-poly, magic wand, quick selection)
// MUST resolve modifiers through this helper so the behavior is uniform.

export type SelectionOp = 'new' | 'add' | 'sub' | 'intersect';

export function resolveSelectionOp(shift: boolean, alt: boolean): SelectionOp {
    if (shift && alt) return 'intersect';
    if (shift) return 'add';
    if (alt) return 'sub';
    return 'new';
}

type SelectionStore = Pick<
    EditorStore,
    'selection' | 'setSelectionMode' | 'setSelectionOperations' | 'addSelectionOperation' | 'setHasSelection' | 'width' | 'height'
>;

export function commitSelectionOperation(
    store: SelectionStore,
    incoming: Omit<SelectionOperation, 'mode'>,
    op: SelectionOp,
): void {
    if (incoming.path.length === 0 && !incoming.mask) return;
    store.setSelectionMode(incoming.type);

    if (op === 'intersect') {
        const nextOps = trueIntersectOps(store.selection.operations, incoming, store.width, store.height);
        store.setSelectionOperations(nextOps);
        store.setHasSelection(nextOps.length > 0);
        return;
    }

    if (op === 'new') {
        store.setSelectionOperations([{ mode: 'add', ...incoming }]);
        store.setHasSelection(true);
        return;
    }

    if (op === 'sub') {
        if (!store.selection.hasSelection || store.selection.operations.length === 0) {
            store.setSelectionOperations([]);
            store.setHasSelection(false);
            return;
        }

        store.addSelectionOperation({ mode: 'sub', ...incoming });
        store.setHasSelection(true);
        return;
    }

    if (!store.selection.hasSelection || store.selection.operations.length === 0) {
        store.setSelectionOperations([{ mode: 'add', ...incoming }]);
    } else {
        store.addSelectionOperation({ mode: 'add', ...incoming });
    }
    store.setHasSelection(true);
}

/**
 * True set intersection of an existing op stack with an incoming region. We
 * rasterize both to alpha masks, AND them per pixel, and emit a single raster
 * op carrying the result. This is the only way to get correct pixel-by-pixel
 * intersection across mixed shape types (rect ∩ lasso, mask ∩ rect, etc.).
 */
export function trueIntersectOps(
    existing: SelectionOperation[],
    incoming: Omit<SelectionOperation, 'mode'>,
    width: number,
    height: number,
): SelectionOperation[] {
    if (existing.length === 0) {
        return [{ mode: 'add', path: incoming.path, type: incoming.type, mask: incoming.mask }];
    }
    const a = rasterizeSelectionOperations(existing, width, height);
    const incomingOp: SelectionOperation = { mode: 'add', path: incoming.path, type: incoming.type, mask: incoming.mask };
    const b = rasterizeSelectionOperations([incomingOp], width, height);
    const out = new Uint8ClampedArray(width * height);
    let any = false;
    for (let i = 0; i < out.length; i++) {
        out[i] = Math.min(a[i], b[i]);
        if (out[i] > 0) any = true;
    }
    if (!any) return [];
    return [{ mode: 'add', path: [], type: incoming.type, mask: { data: out, width, height } }];
}

// Legacy alias retained for callers that imported the old name.
export const intersectionOpsFromOperation = trueIntersectOps;
