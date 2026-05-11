// Side-effect imports register effects with the registry. Importing this
// module ensures the registry is populated.
import './dropShadow';
import './stroke';
import './colorOverlay';
import './innerShadow';
import './outerGlow';
import './innerGlow';
import './gradientOverlay';
import './patternOverlay';
import './bevelEmboss';
import './satin';

export { getEffect, listEffects, registerEffect } from './registry';
export type { Effect, EffectRenderContext, EffectRenderResult } from './Effect';
