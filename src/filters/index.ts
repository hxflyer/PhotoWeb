export * from './Filter';
export * from './registry';
export * from './applyFilter';
export * from './selectionMask';

// Register all filters
import './blurFilters.tsx';
import './sharpenFilters.tsx';
import './noiseFilters.tsx';
import './distortFilters.tsx';
import './stylizeFilters.tsx';
import './renderFilters.tsx';
import './otherFilters.tsx';

// ── Last-filter tracking (task 3.9) ───────────────────────────────────────

interface LastFilter {
    id: string;
    params: Record<string, unknown>;
}

let _lastFilter: LastFilter | null = null;

export function setLastFilter(id: string, params: Record<string, unknown>): void {
    _lastFilter = { id, params };
}

export function getLastFilter(): LastFilter | null {
    return _lastFilter;
}
