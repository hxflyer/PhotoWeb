// Side-effect imports register every v1 adjustment with the registry.
import './brightnessContrast';
import './levels';
import './curves';
import './exposure';
import './colorAdjustments';
import './miscAdjustments';
import './selectiveColor';
import './autoAdjustments';

export { listAdjustments, getAdjustment } from './registry';
export { applyAdjustmentToLayer } from './applyAdjustment';
export type { Adjustment, AdjustmentApplyContext, AdjustmentLayerData } from './Adjustment';
