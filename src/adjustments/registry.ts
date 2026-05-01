import type { Adjustment } from './Adjustment';

const registry = new Map<string, Adjustment<Record<string, unknown>>>();

export function registerAdjustment<P extends Record<string, unknown>>(adj: Adjustment<P>): void {
    registry.set(adj.id, adj as unknown as Adjustment<Record<string, unknown>>);
}

export function getAdjustment(id: string): Adjustment<Record<string, unknown>> | undefined {
    return registry.get(id);
}

export function listAdjustments(): Adjustment<Record<string, unknown>>[] {
    return [...registry.values()];
}
