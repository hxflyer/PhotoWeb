import type { LayerEffectKind } from '../core/Layer';
import type { Effect } from './Effect';

const registry: Map<LayerEffectKind, Effect> = new Map();

export function registerEffect(effect: Effect): void {
    registry.set(effect.kind, effect);
}

export function getEffect(kind: LayerEffectKind): Effect | undefined {
    return registry.get(kind);
}

export function listEffects(): Effect[] {
    return Array.from(registry.values());
}
