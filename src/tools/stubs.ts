import type { Tool } from './Tool';
import { getTool, registerTool } from './registry';
import './move';
import './marquee';
import './lasso';
import './magicWand';
import './quickSelection';
import './magneticLasso';
import './brush';
import './pencil';
import './eraser';
import './magicEraser';
import './backgroundEraser';
import './spotHealing';
import './healingBrush';
import './patch';
import './redEye';
import './cloneStamp';
import './gradient';
import './paintBucket';
import './crop';
import './eyedropper';
import './dodgeBurnSponge';
import './pen';
import './pathSelection';
import './shapes';
import './type';
import './handZoom';

// Phase 0.3 plumbing. Each existing tool is registered as a stub so the Viewport
// can dispatch pointer/key events to the active Tool. The actual behavior still
// lives inline in Viewport.tsx; tools are migrated one at a time starting in 0.9.
const stubIds = [
    { id: 'move', label: 'Move', cursor: 'default' },
    { id: 'brush', label: 'Brush', cursor: 'crosshair' },
    { id: 'eraser', label: 'Eraser', cursor: 'crosshair' },
    { id: 'select', label: 'Selection', cursor: 'crosshair' },
    { id: 'fill', label: 'Paint Bucket', cursor: 'crosshair' },
    { id: 'clone-stamp', label: 'Clone Stamp', cursor: 'crosshair' },
    { id: 'gradient', label: 'Gradient', cursor: 'crosshair' },
    { id: 'crop', label: 'Crop', cursor: 'crosshair' },
    { id: 'shape-rect', label: 'Rectangle', cursor: 'crosshair' },
    { id: 'shape-circle', label: 'Ellipse', cursor: 'crosshair' },
];

let registered = false;
export function ensureStubsRegistered(): void {
    if (registered) return;
    registered = true;
    stubIds.forEach(({ id, label, cursor }) => {
        if (getTool(id)) return; // already registered as a real tool
        const stub: Tool = { id, label, cursor };
        registerTool(stub);
    });
}
