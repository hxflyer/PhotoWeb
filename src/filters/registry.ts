import type { Filter } from './Filter';

const registry = new Map<string, Filter<Record<string, unknown>>>();

export function registerFilter<P>(filter: Filter<P>): void {
    registry.set(filter.id, filter as unknown as Filter<Record<string, unknown>>);
}

export function getFilter(id: string): Filter<Record<string, unknown>> | undefined {
    return registry.get(id);
}

export function listFilters(): Filter<Record<string, unknown>>[] {
    return [...registry.values()];
}
