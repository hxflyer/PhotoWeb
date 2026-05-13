/**
 * Single source-of-truth registry for photoweb keyboard shortcuts.
 *
 * Every entry below corresponds to a binding actually wired in
 * `src/App.tsx`. Don't list ghosts here — the ShortcutsDialog renders
 * directly from this array, so anything in this file claims real
 * behavior in the app.
 */

export type ShortcutGroup =
    | 'File'
    | 'Edit'
    | 'Image'
    | 'Layer'
    | 'Select'
    | 'View'
    | 'Tools'
    | 'Brush';

export interface ShortcutEntry {
    group: ShortcutGroup;
    label: string;
    keys: string;
    /** Optional action id for future rebinding work. */
    action?: string;
}

export const SHORTCUTS: ShortcutEntry[] = [
    // File
    { group: 'File', label: 'New Document',       keys: '⌘N',     action: 'file.new' },
    { group: 'File', label: 'Open',               keys: '⌘O',     action: 'file.open' },
    { group: 'File', label: 'Save',               keys: '⌘S',     action: 'file.save' },
    { group: 'File', label: 'Save As',            keys: '⌘⇧S',   action: 'file.saveAs' },
    { group: 'File', label: 'Quick Export As PNG', keys: '⌘⇧⌥S', action: 'file.quickExport' },
    { group: 'File', label: 'Export As…',         keys: '⌘⇧⌥W', action: 'file.exportAs' },

    // Edit
    { group: 'Edit', label: 'Undo',                keys: '⌘Z',         action: 'edit.undo' },
    { group: 'Edit', label: 'Redo',                keys: '⌘⇧Z / ⌘Y', action: 'edit.redo' },
    { group: 'Edit', label: 'Free Transform',      keys: '⌘T',         action: 'edit.freeTransform' },
    { group: 'Edit', label: 'Warp',                keys: '⌘⇧T',       action: 'edit.warp' },
    { group: 'Edit', label: 'Repeat Last Filter',  keys: '⌘F',         action: 'edit.repeatFilter' },
    { group: 'Edit', label: 'Last Filter Dialog…', keys: '⌘⌥F',       action: 'edit.lastFilterDialog' },

    // Image
    { group: 'Image', label: 'Image Size…',  keys: '⌘⌥I', action: 'image.size' },
    { group: 'Image', label: 'Canvas Size…', keys: '⌘⌥C', action: 'image.canvasSize' },

    // Layer
    { group: 'Layer', label: 'New Layer',       keys: '⌘⇧N',   action: 'layer.new' },
    { group: 'Layer', label: 'Duplicate Layer', keys: '⌘J',     action: 'layer.duplicate' },
    { group: 'Layer', label: 'Layer via Cut',   keys: '⌘⇧J',   action: 'layer.viaCut' },
    { group: 'Layer', label: 'Group Layers',    keys: '⌘G',     action: 'layer.group' },
    { group: 'Layer', label: 'Ungroup Layers',  keys: '⌘⇧G',   action: 'layer.ungroup' },
    { group: 'Layer', label: 'Merge Down',      keys: '⌘E',     action: 'layer.mergeDown' },
    { group: 'Layer', label: 'Merge Visible',   keys: '⌘⇧E',   action: 'layer.mergeVisible' },
    { group: 'Layer', label: 'Stamp Visible',   keys: '⌘⇧⌥E', action: 'layer.stampVisible' },
    { group: 'Layer', label: 'Delete Layer',    keys: '⌘⌫',     action: 'layer.delete' },

    // Select
    { group: 'Select', label: 'Select All',       keys: '⌘A',   action: 'select.all' },
    { group: 'Select', label: 'Deselect',         keys: '⌘D',   action: 'select.deselect' },
    { group: 'Select', label: 'Reselect',         keys: '⌘⇧D', action: 'select.reselect' },
    { group: 'Select', label: 'Inverse',          keys: '⌘I',   action: 'select.inverse' },
    { group: 'Select', label: 'Hide Edges',       keys: '⌘H',   action: 'select.hideEdges' },
    { group: 'Select', label: 'Quick Mask Mode',  keys: 'Q',     action: 'select.quickMask' },

    // View
    { group: 'View', label: 'Zoom In',          keys: '⌘+',   action: 'view.zoomIn' },
    { group: 'View', label: 'Zoom Out',         keys: '⌘-',   action: 'view.zoomOut' },
    { group: 'View', label: 'Fit on Screen',    keys: '⌘0',   action: 'view.fit' },
    { group: 'View', label: 'Actual Pixels',    keys: '⌘1',   action: 'view.actualPixels' },
    { group: 'View', label: 'Toggle Rulers',    keys: '⌘R',   action: 'view.rulers' },
    { group: 'View', label: 'Toggle Grid',      keys: "⌘'",   action: 'view.grid' },
    { group: 'View', label: 'Toggle Snap',      keys: '⌘⇧;', action: 'view.snap' },
    { group: 'View', label: 'Keyboard Shortcuts…', keys: '⌘/', action: 'view.shortcuts' },
    { group: 'View', label: 'Cycle interface theme (lighter)', keys: '⇧F2', action: 'view.cycleThemeForward' },
    { group: 'View', label: 'Cycle interface theme (darker)',  keys: '⇧F1', action: 'view.cycleThemeBackward' },
    { group: 'View', label: 'Toggle Brush Presets panel',      keys: 'F5',  action: 'view.togglePanel.brushPresets' },
    { group: 'View', label: 'Toggle Color panel',              keys: 'F6',  action: 'view.togglePanel.color' },
    { group: 'View', label: 'Toggle Layers panel',             keys: 'F7',  action: 'view.togglePanel.layers' },
    { group: 'View', label: 'Toggle Info panel',               keys: 'F8',  action: 'view.togglePanel.info' },
    { group: 'View', label: 'Hide / show all chrome',          keys: 'Tab',  action: 'view.hideChrome.all' },
    { group: 'View', label: 'Hide / show right panels',        keys: '⇧Tab', action: 'view.hideChrome.right' },
    { group: 'View', label: 'Cycle screen mode forward',       keys: 'F',    action: 'view.screenMode.forward' },
    { group: 'View', label: 'Cycle screen mode backward',      keys: '⇧F',   action: 'view.screenMode.backward' },
    { group: 'View', label: 'Exit Full Screen Mode',           keys: 'Esc',  action: 'view.screenMode.exitFull' },

    // Tools
    { group: 'Tools', label: 'Move',                            keys: 'V',           action: 'tool.move' },
    { group: 'Tools', label: 'Brush / Pencil',                  keys: 'B / Shift+B', action: 'tool.brushGroup' },
    { group: 'Tools', label: 'Eraser / Magic Eraser / Background Eraser', keys: 'E / Shift+E', action: 'tool.eraserGroup' },
    { group: 'Tools', label: 'Paint Bucket / Gradient',         keys: 'G / Shift+G', action: 'tool.fillGroup' },
    { group: 'Tools', label: 'Rectangular / Elliptical Marquee', keys: 'M / Shift+M', action: 'tool.marqueeGroup' },
    { group: 'Tools', label: 'Lasso / Polygonal Lasso',         keys: 'L / Shift+L', action: 'tool.lassoGroup' },
    { group: 'Tools', label: 'Quick Selection / Magic Wand',    keys: 'W / Shift+W', action: 'tool.selectGroup' },
    { group: 'Tools', label: 'Crop',                            keys: 'C',           action: 'tool.crop' },
    { group: 'Tools', label: 'Horizontal / Vertical Type',      keys: 'T / Shift+T', action: 'tool.typeGroup' },
    { group: 'Tools', label: 'Pen / Freeform Pen',              keys: 'P / Shift+P', action: 'tool.penGroup' },
    { group: 'Tools', label: 'Direct / Path Selection',         keys: 'A / Shift+A', action: 'tool.pathSelectionGroup' },
    { group: 'Tools', label: 'Shape Tools (cycle)',             keys: 'U / Shift+U', action: 'tool.shapeGroup' },
    { group: 'Tools', label: 'Dodge / Burn / Sponge',           keys: 'O / Shift+O', action: 'tool.dodgeGroup' },
    { group: 'Tools', label: 'Clone Stamp',                     keys: 'S',           action: 'tool.cloneStamp' },
    { group: 'Tools', label: 'Spot Healing / Healing / Patch / Red Eye', keys: 'J / Shift+J', action: 'tool.healingGroup' },
    { group: 'Tools', label: 'Eyedropper',                      keys: 'I',           action: 'tool.eyedropper' },
    { group: 'Tools', label: 'Hand',                            keys: 'H',           action: 'tool.hand' },
    { group: 'Tools', label: 'Zoom',                            keys: 'Z',           action: 'tool.zoom' },

    // Brush
    { group: 'Brush', label: 'Decrease Brush Size',     keys: '[',     action: 'brush.sizeDown' },
    { group: 'Brush', label: 'Increase Brush Size',     keys: ']',     action: 'brush.sizeUp' },
    { group: 'Brush', label: 'Decrease Hardness',       keys: '⇧[',   action: 'brush.hardnessDown' },
    { group: 'Brush', label: 'Increase Hardness',       keys: '⇧]',   action: 'brush.hardnessUp' },
    { group: 'Brush', label: 'Swap Foreground / Background', keys: 'X', action: 'brush.swap' },
    { group: 'Brush', label: 'Reset Colors',            keys: 'D',     action: 'brush.reset' },
];

export const SHORTCUT_GROUP_ORDER: ShortcutGroup[] = [
    'File', 'Edit', 'Image', 'Layer', 'Select', 'View', 'Tools', 'Brush',
];

export function shortcutsByGroup(group: ShortcutGroup): ShortcutEntry[] {
    return SHORTCUTS.filter(s => s.group === group);
}
