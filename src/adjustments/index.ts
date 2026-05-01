// Side-effect imports register every v1 adjustment with the registry.
import './brightnessContrast';
import './levels';
import './curves';
import './exposure';
import './colorAdjustments';
import './miscAdjustments';
import './autoAdjustments';

export { listAdjustments, getAdjustment } from './registry';
export type { Adjustment, AdjustmentApplyContext, AdjustmentLayerData } from './Adjustment';
