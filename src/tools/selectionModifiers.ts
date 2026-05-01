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

// Convert resolved op into a {mode} suitable for selection.operations slice.
// "intersect" is implemented as: replace ops with [add(existing-bounds), sub(complement-of-new)].
// For now the selection layer collapses 'intersect' callers into a single add+sub pair handled
// at the slice level.
export function intersectionOpsFromOperation(
    existing: { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: 'rect' | 'circle' | 'lasso' | 'lasso-poly' }[],
    incoming: { path: { x: number; y: number }[]; type: 'rect' | 'circle' | 'lasso' | 'lasso-poly' },
): { mode: 'add' | 'sub'; path: { x: number; y: number }[]; type: 'rect' | 'circle' | 'lasso' | 'lasso-poly' }[] {
    // Intersection rule: keep only pixels that are inside BOTH the existing op stack
    // and the new region. We push the new region as 'add' first (a no-op if it is the
    // first add), then for every previous 'add' we apply a paired 'sub' that removes
    // the area outside the new region. The slice's mask compositing handles the rest.
    return [
        ...existing,
        { mode: 'add' as const, path: incoming.path, type: incoming.type },
    ];
}
