import { Layer } from '../core/Layer';
import type { LayerColorTag } from '../core/Layer';
import type { CompoundHistoryAction, DocumentHistoryCommandOptions, GenericHistoryAction, HistoryAction, HistoryEntry } from '../core/history';

export type SelectionMode = 'rect' | 'circle' | 'lasso' | 'lasso-poly';

export interface ShapeBounds { x: number; y: number; w: number; h: number }

export type ShapeStrokeAlignment = 'outside' | 'center' | 'inside';

export interface ShapeSolidFill { type: 'solid'; color: string }
export type ShapeFill = ShapeSolidFill;

export type ShapeStrokeLineCap = 'butt' | 'round' | 'square';
export type ShapeStrokeLineJoin = 'bevel' | 'round' | 'miter';

export interface ShapeStroke {
    color: string;
    width: number;
    opacity: number;
    alignment: ShapeStrokeAlignment;
    enabled: boolean;
    dash?: number[];
    lineCap?: ShapeStrokeLineCap;
    lineJoin?: ShapeStrokeLineJoin;
}

/**
 * Path operations mode recorded on a shape when it is created via the
 * "Combine / Subtract / Intersect / Exclude" buttons in the shape Options Bar.
 * MVP: stored on the next shape; combining geometry across layers is deferred.
 */
export type ShapeCombineMode = 'new' | 'combine' | 'subtract' | 'intersect' | 'exclude';

export interface ShapeRectData {
    kind: 'rect';
    bounds: ShapeBounds;
    fill: ShapeFill | null;
    stroke: ShapeStroke | null;
    combineMode?: ShapeCombineMode;
}

export interface ShapeRoundedRectData {
    kind: 'rounded-rect';
    bounds: ShapeBounds;
    cornerRadius: number;
    fill: ShapeFill | null;
    stroke: ShapeStroke | null;
    combineMode?: ShapeCombineMode;
}

export interface ShapeEllipseData {
    kind: 'ellipse';
    bounds: ShapeBounds;
    fill: ShapeFill | null;
    stroke: ShapeStroke | null;
    combineMode?: ShapeCombineMode;
}

export interface ShapePolygonData {
    kind: 'polygon';
    center: { x: number; y: number };
    radius: number;
    sides: number;
    star: boolean;
    starRatio: number;
    rotation: number;
    fill: ShapeFill | null;
    stroke: ShapeStroke | null;
    /** Round the outer (and inner, for stars) vertices via quadratic curves. */
    smoothCorners?: boolean;
    /** Round only the inner-star vertices (star mode). */
    smoothIndents?: boolean;
    combineMode?: ShapeCombineMode;
}

export interface ShapeLineData {
    kind: 'line';
    p0: { x: number; y: number };
    p1: { x: number; y: number };
    weight: number;
    arrowStart: boolean;
    arrowEnd: boolean;
    arrowSize: number;
    stroke: ShapeStroke;
    combineMode?: ShapeCombineMode;
}

export interface ShapeCustomData {
    kind: 'custom';
    presetId: string;
    pathD: string;
    bounds: ShapeBounds;
    fill: ShapeFill | null;
    stroke: ShapeStroke | null;
    combineMode?: ShapeCombineMode;
}

export type ShapeData =
    | ShapeRectData
    | ShapeRoundedRectData
    | ShapeEllipseData
    | ShapePolygonData
    | ShapeLineData
    | ShapeCustomData;

export interface SelectionMaskData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
}

export interface SelectionOperation {
    mode: 'add' | 'sub';
    path: { x: number; y: number }[];
    type: SelectionMode;
    mask?: SelectionMaskData;
}

export interface SelectionState {
    hasSelection: boolean;
    mode: SelectionMode;
    path: { x: number; y: number }[];
    polyPoints: { x: number; y: number }[];
    operations: SelectionOperation[];
    isDraggingSelection: boolean;
    feather?: number;
    isFreeEditMode: boolean;
    /**
     * Cmd+H toggle: when true, the marching-ants edges are hidden but the
     * selection state itself is preserved (operations still apply).
     */
    edgesHidden?: boolean;
    /**
     * Snapshot of the last selection cleared via `clearSelection` so
     * `reselect()` (Cmd+Shift+D) can restore it.
     */
    lastCleared?: { operations: SelectionOperation[]; mode: SelectionMode; feather?: number };
}

export interface DialogState {
    isFeatherDialogOpen: boolean;
    filterDialog: { isOpen: boolean; filterId: string; params: Record<string, unknown> };
    adjustmentDialog: { isOpen: boolean; adjustmentId: string; params: Record<string, unknown> };
    isImageSizeOpen: boolean;
    isCanvasSizeOpen: boolean;
    isTrimOpen: boolean;
    isColorPickerOpen: boolean;
    colorPickerTarget: 'primary' | 'secondary' | 'type';
    isExportDialogOpen: boolean;
    isNewDocumentDialogOpen: boolean;
    isRefineEdgeDialogOpen: boolean;
    isSaveSelectionDialogOpen: boolean;
    isLoadSelectionDialogOpen: boolean;
    isColorRangeDialogOpen: boolean;
    isDefringeDialogOpen: boolean;
}

export interface BrushSettings {
    size: number;
    opacity: number;
    hardness: number;
    flow: number;
}

export type ToolId =
    | 'move'
    | 'brush'
    | 'eraser'
    | 'select'
    | 'fill'
    | 'clone-stamp'
    | 'gradient'
    | 'crop'
    | 'shape-rect'
    | 'shape-circle'
    // Phase 1 tool registry IDs — pointer events dispatched via src/tools/registry.ts
    | 'marquee-rect'
    | 'marquee-ellipse'
    | 'lasso'
    | 'lasso-poly'
    | 'magic-wand'
    | 'quick-selection'
    | 'pencil'
    | 'dodge'
    | 'burn'
    | 'sponge'
    | 'pen'
    | 'freeform-pen'
    | 'path-selection'
    | 'direct-selection'
    | 'eyedropper'
    | 'type-horizontal'
    | 'type-vertical'
    | 'hand'
    | 'zoom'
    | 'shape-rectangle'
    | 'shape-rounded-rectangle'
    | 'shape-ellipse'
    | 'shape-polygon'
    | 'shape-line'
    | 'shape-custom'
    | 'magic-eraser'
    | 'background-eraser'
    | 'spot-healing'
    | 'healing-brush'
    | 'patch'
    | 'red-eye';

export interface GlobalLight {
    angle: number;     // 0..360 degrees
    altitude: number;  // 0..90 degrees
}

export interface DocumentSlice {
    width: number;
    height: number;
    hasAutosave: boolean;
    documentName: string;
    isDirty: boolean;
    lastSavedHistoryTick: number;
    globalLight: GlobalLight;
    setGlobalLight: (light: GlobalLight) => void;
    setCanvasSize: (width: number, height: number) => void;
    rotateCanvas: (degrees: number) => void;
    flipCanvas: (axis: 'horizontal' | 'vertical') => void;
    resizeImage: (newW: number, newH: number, method: import('../core/imageTransforms').ResampleMethod) => void;
    resizeCanvas: (newW: number, newH: number, anchorX: number, anchorY: number, extensionColor: string) => void;
    trimCanvas: (basis: import('../core/imageTransforms').TrimBasis, sides: { top: boolean; right: boolean; bottom: boolean; left: boolean }) => void;
    newDocument: (w: number, h: number, bg: string) => boolean;
    openImageAsDocument: (img: HTMLImageElement, name: string) => boolean;
    setDocumentName: (name: string) => void;
    setHasAutosave: (has: boolean) => void;
    dismissAutosave: () => void;
    markDocumentDirty: () => void;
    markDocumentClean: () => void;
    saveFile: (name: string) => Promise<void>;
    loadFile: (name: string) => Promise<void>;
}

export type LayerEditTarget = 'layer' | 'mask';

export interface LayersSlice {
    layers: Layer[];
    activeLayerId: string | null;
    selectedLayerIds: string[];
    layerSelectionAnchorId: string | null;
    activeLayerEditTarget: LayerEditTarget;
    setActiveLayerEditTarget: (target: LayerEditTarget) => void;
    addLayer: () => void;
    createLayerGroup: (name?: string) => void;
    groupLayers: (layerIds: string[], name?: string) => void;
    ungroupLayerGroup: (groupId: string) => void;
    toggleLayerGroupExpanded: (groupId: string) => void;
    addLayerFromImage: (img: HTMLImageElement, name: string) => void;
    addLayerFromContent: (content: HTMLCanvasElement, name: string, insertAfterId?: string) => void;
    removeLayer: (id: string) => void;
    reorderLayers: (dragIndex: number, hoverIndex: number) => void;
    moveLayerToGroup: (layerId: string, groupId: string | null, position?: 'top' | 'bottom') => void;
    setLayerOpacity: (id: string, opacity: number) => void;
    setLayerFill: (id: string, fill: number) => void;
    setLayerBlendMode: (id: string, mode: GlobalCompositeOperation) => void;
    setLayerKnockout: (id: string, mode: import('../core/Layer').KnockoutMode) => void;
    setLayerBlendingFlag: (id: string, flag: 'blendInteriorEffectsAsGroup' | 'blendClippedLayersAsGroup' | 'transparencyShapesLayer' | 'layerMaskHidesEffects' | 'vectorMaskHidesEffects', value: boolean) => void;
    setLayerBlendIfRanges: (id: string, channel: 'gray' | 'r' | 'g' | 'b', side: 'thisLayer' | 'underlyingLayer', range: import('../core/Layer').BlendIfChannelRange) => void;
    setLayerBlendIfChannel: (id: string, channel: 'gray' | 'r' | 'g' | 'b') => void;
    mergeLayerDown: (id: string) => void;
    mergeVisible: () => void;
    stampVisible: () => void;
    flattenImage: () => void;
    layerViaCopy: () => void;
    layerViaCut: () => void;
    setActiveLayer: (id: string) => void;
    toggleLayerVisibility: (id: string) => void;
    soloLayer: (id: string) => void;
    renameLayer: (id: string, name: string) => void;
    setLayerLock: (id: string, kind: 'all' | 'transparency' | 'image' | 'position', value: boolean) => void;
    setLayerColorTag: (id: string, tag: LayerColorTag) => void;
    addFillLayer: (data: import('../core/fillLayer').FillLayerData, name?: string) => void;
    addAdjustmentLayer: (adjustmentId: string, params?: Record<string, unknown>, name?: string) => void;
    addLayerMask: (id: string, mode: 'reveal-all' | 'hide-all') => void;
    addLayerMaskFromSelection: (id: string, mode: 'reveal' | 'hide') => void;
    removeLayerMask: (id: string) => void;
    setLayerMaskEnabled: (id: string, enabled: boolean) => void;
    setLayerMaskLinked: (id: string, linked: boolean) => void;
    invertLayerMask: (id: string) => void;
    applyLayerMask: (id: string) => void;
    setLayerMaskDensity: (id: string, density: number) => void;
    setLayerMaskFeather: (id: string, feather: number) => void;
    setLayerAdjustmentParams: (id: string, params: Record<string, unknown>) => void;
    setLayerFillData: (id: string, data: import('../core/fillLayer').FillLayerData) => void;
    setLayerName: (id: string, name: string) => void;
    duplicateLayer: (id: string) => void;
    rasterizeTypeLayer: (id: string) => void;
    addLayerEffect: (id: string, kind: import('../core/Layer').LayerEffectKind) => void;
    removeLayerEffect: (id: string, index: number) => void;
    setLayerEffectEnabled: (id: string, index: number, enabled: boolean) => void;
    setLayerEffectParams: (id: string, index: number, params: Record<string, unknown>) => void;
    copyLayerStyle: (id: string) => void;
    pasteLayerStyle: (id: string) => void;
    clearLayerStyle: (id: string) => void;
    scaleLayerEffects: (id: string, scalePercent: number) => void;
    defringeLayer: (width: number) => void;
    removeWhiteMatte: () => void;
    removeBlackMatte: () => void;
    selectLayer: (id: string, mode?: 'replace' | 'toggle' | 'range') => void;
    selectAllLayers: () => void;
    deselectLayers: () => void;
    setSelectedLayerIds: (ids: string[], activeId?: string) => void;
    alignSelectedLayers: (
        alignment: 'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom',
        target?: 'selection' | 'canvas'
    ) => void;
    distributeSelectedLayers: (
        distribution: 'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom'
    ) => void;
}

export interface SavedSelection {
    name: string;
    ops: SelectionOperation[];
}

export interface RefineEdgeOptions {
    radius: number;     // 0..250  Gaussian-style blur of the mask alpha
    smooth: number;     // 0..100  median-style contour smoothing
    feather: number;    // 0..250  global feather applied via setSelectionFeather
    contrast: number;   // 0..100  steepens the alpha falloff
    shiftEdge: number;  // -100..100  positive expands, negative contracts
    smartRadius?: boolean; // per-pixel radius modulated by local edge gradient when true
}

export type RefineEdgeOutputTarget =
    | 'selection'
    | 'layer-mask'
    | 'new-layer'
    | 'new-layer-with-mask'
    | 'new-document'
    | 'new-document-with-mask';

export type SaveSelectionMode =
    | 'new'
    | 'replace'
    | 'add'
    | 'sub'
    | 'intersect';

export interface SelectionSlice {
    selection: SelectionState;
    savedSelections: SavedSelection[];
    setSelectionMode: (mode: SelectionMode) => void;
    setSelectionPath: (path: { x: number; y: number }[]) => void;
    setSelectionOperations: (
        ops: SelectionOperation[]
    ) => void;
    addSelectionOperation: (op: SelectionOperation) => void;
    setHasSelection: (has: boolean) => void;
    setIsDraggingSelection: (is: boolean) => void;
    clearSelection: () => void;
    reselect: () => void;
    setSelectionEdgesHidden: (hidden: boolean) => void;
    toggleInvertSelection: () => void;
    setSelectionFeather: (radius: number) => void;
    setFreeEditMode: (mode: boolean) => void;
    setPolyPoints: (points: { x: number; y: number }[]) => void;
    expandSelection: (px: number) => void;
    contractSelection: (px: number) => void;
    smoothSelection: (radius?: number) => void;
    borderSelection: (width: number) => void;
    growSelection: (tolerance?: number) => void;
    similarSelection: (tolerance?: number) => void;
    refineEdge: (opts: RefineEdgeOptions) => void;
    applyRefineEdgeOutput: (opts: RefineEdgeOptions, target: RefineEdgeOutputTarget) => void;
    saveSelection: (name: string, mode?: SaveSelectionMode) => void;
    loadSelection: (name: string, mode?: 'replace' | 'add' | 'sub' | 'intersect') => void;
    pathToSelection: () => void;
    selectionToPath: () => void;
}

export interface BrushPreset {
    id: string;
    name: string;
    settings: BrushSettings;
    smoothing?: number;     // 0..1
    spacing?: number;       // 0..1+
}

export interface ToolPreset {
    id: string;
    name: string;
    toolId: ToolId;
    // Free-form snapshot of the tool's current options at preset-creation time.
    // Each tool may opt-in by implementing a `captureOptions()` / `applyOptions()`
    // pair; absent that, the preset is captured by deep-cloning a known subset.
    optionsBlob: Record<string, unknown>;
}

export interface PatternPreset {
    id: string;
    name: string;
    width: number;
    height: number;
    // Base64 PNG data URL of the captured tile.
    dataUrl: string;
}

export interface GradientColorStop {
    position: number;
    color: string;
    /**
     * Midpoint between this stop and the next, expressed as a fraction (0..1)
     * of the gap. Default 0.5 means a linear ramp; values < 0.5 push the
     * transition toward this stop, values > 0.5 push it toward the next stop.
     * The last stop's value is ignored.
     */
    midpointToNext?: number;
}

export interface GradientOpacityStop {
    position: number;
    opacity: number;
    /** See `GradientColorStop.midpointToNext`. */
    midpointToNext?: number;
}

export interface GradientPresetEntry {
    id: string;
    name: string;
    colorStops: GradientColorStop[];
    opacityStops: GradientOpacityStop[];
    smoothness: number;
}

export interface ToolsSlice {
    activeTool: ToolId;
    brushSettings: BrushSettings;
    cloneSource: { x: number; y: number } | null;
    shapeSettings: { filled: boolean };
    brushPresets: BrushPreset[];
    toolPresets: ToolPreset[];
    patternPresets: PatternPreset[];
    activePatternId: string | null;
    setTool: (tool: ToolId) => void;
    setBrushSize: (size: number) => void;
    setBrushHardness: (hardness: number) => void;
    setBrushOpacity: (opacity: number) => void;
    setBrushFlow: (flow: number) => void;
    setCloneSource: (point: { x: number; y: number } | null) => void;
    saveBrushPreset: (name: string, extras?: { smoothing?: number; spacing?: number }) => void;
    applyBrushPreset: (id: string) => void;
    removeBrushPreset: (id: string) => void;
    renameBrushPreset: (id: string, name: string) => void;
    reorderBrushPreset: (fromIdx: number, toIdx: number) => void;
    duplicateBrushPreset: (id: string) => void;
    saveToolPreset: (name: string, optionsBlob: Record<string, unknown>) => void;
    applyToolPreset: (id: string, apply: (blob: Record<string, unknown>) => void) => void;
    removeToolPreset: (id: string) => void;
    definePattern: (name: string, source: HTMLCanvasElement | ImageData) => string;
    removePatternPreset: (id: string) => void;
    renamePatternPreset: (id: string, name: string) => void;
    setActivePatternId: (id: string | null) => void;
    gradientPresets: GradientPresetEntry[];
    saveGradientPreset: (
        name: string,
        colorStops: GradientColorStop[],
        opacityStops: GradientOpacityStop[],
        smoothness: number,
    ) => string;
    applyGradientPreset: (id: string) => GradientPresetEntry | null;
    removeGradientPreset: (id: string) => void;
}

export type ActiveChannel = 'rgb' | 'r' | 'g' | 'b';

export interface ChannelVisibility {
    r: boolean;
    g: boolean;
    b: boolean;
}

export interface ViewSlice {
    zoom: number;
    pan: { x: number; y: number };
    showRulers: boolean;
    showGrid: boolean;
    showSelectionEdges: boolean;
    showGuides: boolean;
    guidesLocked: boolean;
    isNewGuideDialogOpen: boolean;
    gridSize: number;
    snapEnabled: boolean;
    guides: { orientation: 'horizontal' | 'vertical'; position: number }[];
    activeSnapTargets: import('../tools/snap').SnapTarget[] | null;
    quickMaskMode: boolean;
    quickMaskBuffer: ImageData | null;
    enablePerfLogging: boolean;
    activeChannel: ActiveChannel;
    channelVisibility: ChannelVisibility;
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    setShowRulers: (show: boolean) => void;
    setShowGrid: (show: boolean) => void;
    setShowSelectionEdges: (show: boolean) => void;
    setShowGuides: (show: boolean) => void;
    setGuidesLocked: (locked: boolean) => void;
    setNewGuideDialogOpen: (open: boolean) => void;
    setGridSize: (size: number) => void;
    setSnapEnabled: (snap: boolean) => void;
    addGuide: (orientation: 'horizontal' | 'vertical', position: number) => void;
    removeGuide: (index: number) => void;
    moveGuide: (index: number, position: number) => void;
    clearGuides: () => void;
    addGuideWithHistory: (orientation: 'horizontal' | 'vertical', position: number) => void;
    removeGuideWithHistory: (index: number) => void;
    moveGuideWithHistory: (index: number, position: number) => void;
    beginGuideDrag: (index: number) => void;
    updateGuideDrag: (position: number) => void;
    commitGuideDrag: () => void;
    cancelGuideDrag: () => void;
    clearGuidesWithHistory: () => void;
    setActiveSnapTargets: (targets: import('../tools/snap').SnapTarget[] | null) => void;
    setQuickMaskMode: (on: boolean) => void;
    setQuickMaskBuffer: (buffer: ImageData | null) => void;
    convertQuickMaskBufferToSelection: () => void;
    setEnablePerfLogging: (on: boolean) => void;
    setActiveChannel: (channel: ActiveChannel) => void;
    setChannelVisibility: (channel: 'r' | 'g' | 'b', visible: boolean) => void;
    toggleChannelVisibility: (channel: 'r' | 'g' | 'b') => void;

    // Chrome state: status-bar info mode, pasteboard color, interface theme.
    // All three persist to localStorage and never flow through history.
    statusBarInfoMode: StatusBarInfoMode;
    setStatusBarInfoMode: (mode: StatusBarInfoMode) => void;
    pasteboardColor: PasteboardColor;
    pasteboardCustomColor: string;
    setPasteboardColor: (color: PasteboardColor) => void;
    setPasteboardCustomColor: (hex: string) => void;
    colorTheme: ColorTheme;
    setColorTheme: (theme: ColorTheme) => void;
    cycleColorTheme: (direction: 1 | -1) => void;
    toolbarColumns: ToolbarColumns;
    setToolbarColumns: (cols: ToolbarColumns) => void;
    toolbarGroupActive: Record<number, ToolId>;
    setToolbarGroupActive: (groupIdx: number, toolId: ToolId) => void;
    // Panel groups: per-group tab order, per-group collapse state, and
    // session-only chrome-hide state. All persist except chromeHidden.
    panelTabOrder: PanelTabOrder;
    setPanelTabOrder: (groupId: PanelGroupId, order: string[]) => void;
    panelGroupCollapsed: PanelGroupCollapsed;
    setPanelGroupCollapsed: (groupId: PanelGroupId, collapsed: boolean) => void;
    chromeHidden: ChromeHidden;
    setChromeHidden: (mode: ChromeHidden) => void;
    screenMode: ScreenMode;
    setScreenMode: (mode: ScreenMode) => void;
    cycleScreenMode: (direction: 1 | -1) => void;
    neutralColorMode: boolean;
    setNeutralColorMode: (on: boolean) => void;
    useShiftForToolSwitch: boolean;
    setUseShiftForToolSwitch: (on: boolean) => void;
}

export type PanelGroupId = 'top' | 'middle' | 'bottom';
export type PanelTabOrder = Partial<Record<PanelGroupId, string[]>>;
export type PanelGroupCollapsed = Partial<Record<PanelGroupId, boolean>>;
export type ChromeHidden = 'none' | 'all' | 'right';
export type ScreenMode = 'standard' | 'full-with-menu' | 'full';

export type StatusBarInfoMode = 'documentSizes' | 'documentProfile' | 'documentDimensions' | 'currentTool' | 'layerCount';
export type PasteboardColor = 'default' | 'black' | 'darkGray' | 'mediumGray' | 'lightGray' | 'custom';
export type ColorTheme = 'darkest' | 'dark' | 'light' | 'lightest';
export type ToolbarColumns = 1 | 2;

export interface ColorSlice {
    primaryColor: string;
    secondaryColor: string;
    swatches: string[];
    setPrimaryColor: (color: string) => void;
    setSecondaryColor: (color: string) => void;
    swapColors: () => void;
    resetColors: () => void;
    addSwatch: (color: string) => void;
    removeSwatch: (index: number) => void;
}

export type PanelId =
    | 'history' | 'layers' | 'channels' | 'paths'
    | 'color' | 'swatches' | 'adjustments'
    | 'properties' | 'character' | 'paragraph'
    | 'navigator' | 'info' | 'tools'
    | 'brush-presets' | 'pattern-presets';

export type PanelVisibility = Record<PanelId, boolean>;

export interface RefineEdgePrefs {
    /** When true, opening Refine Edge restores the last-used slider values. */
    remember: boolean;
    radius: number;
    smooth: number;
    feather: number;
    contrast: number;
    shiftEdge: number;
    smartRadius: boolean;
}

export interface ColorRangePrefs {
    /** Built-in preset selected in the Select dropdown. */
    select: 'sampled' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas' | 'highlights' | 'midtones' | 'shadows' | 'skin-tones';
    fuzziness: number;
    /** Localized Color Clusters checkbox state. */
    localized: boolean;
    /** Range slider in pixels (only used when `localized` is true). 0..255. */
    range: number;
    invert: boolean;
}

export interface SelectionDialogPrefs {
    defringeWidth: number;
    borderWidth: number;
    smoothRadius: number;
    expandPx: number;
    contractPx: number;
    refineEdge: RefineEdgePrefs;
    colorRange: ColorRangePrefs;
}

export interface PanelsSlice {
    dialogs: DialogState;
    panelVisibility: PanelVisibility;
    copiedLayerStyle: import('../core/Layer').LayerEffect[] | null;
    isScaleEffectsDialogOpen: boolean;
    isBorderSelectionDialogOpen: boolean;
    isSmoothSelectionDialogOpen: boolean;
    isExpandSelectionDialogOpen: boolean;
    isContractSelectionDialogOpen: boolean;
    isTransformSelectionOpen: boolean;
    selectionDialogPrefs: SelectionDialogPrefs;
    setSelectionDialogPref: <K extends keyof SelectionDialogPrefs>(key: K, value: SelectionDialogPrefs[K]) => void;
    openBorderSelectionDialog: () => void;
    closeBorderSelectionDialog: () => void;
    openSmoothSelectionDialog: () => void;
    closeSmoothSelectionDialog: () => void;
    openExpandSelectionDialog: () => void;
    closeExpandSelectionDialog: () => void;
    openContractSelectionDialog: () => void;
    closeContractSelectionDialog: () => void;
    openTransformSelection: () => void;
    closeTransformSelection: () => void;
    setCopiedLayerStyle: (effects: import('../core/Layer').LayerEffect[] | null) => void;
    openScaleEffectsDialog: () => void;
    closeScaleEffectsDialog: () => void;
    togglePanelVisibility: (panel: PanelId) => void;
    setPanelVisibility: (panel: PanelId, visible: boolean) => void;
    toggleAllPanels: () => void;
    toggleAllPanelsExceptCanvas: () => void;
    setFeatherDialogOpen: (open: boolean) => void;
    openFilterDialog: (filterId: string, params?: Record<string, unknown>) => void;
    closeFilterDialog: () => void;
    openAdjustmentDialog: (adjustmentId: string, params?: Record<string, unknown>) => void;
    closeAdjustmentDialog: () => void;
    openImageSizeDialog: () => void;
    openCanvasSizeDialog: () => void;
    openTrimDialog: () => void;
    closeImageSizeDialog: () => void;
    closeCanvasSizeDialog: () => void;
    closeTrimDialog: () => void;
    openColorPicker: (target: 'primary' | 'secondary' | 'type') => void;
    closeColorPicker: () => void;
    openExportDialog: () => void;
    closeExportDialog: () => void;
    openNewDocumentDialog: () => void;
    closeNewDocumentDialog: () => void;
    openRefineEdgeDialog: () => void;
    closeRefineEdgeDialog: () => void;
    openSaveSelectionDialog: () => void;
    closeSaveSelectionDialog: () => void;
    openLoadSelectionDialog: () => void;
    closeLoadSelectionDialog: () => void;
    openColorRangeDialog: () => void;
    closeColorRangeDialog: () => void;
    openDefringeDialog: () => void;
    closeDefringeDialog: () => void;
}

/**
 * Snapshot of the most recently applied destructive filter or adjustment.
 * Edit > Fade replays the same `after` pixels blended back into `before`
 * using the user's chosen Opacity + Blend Mode.
 */
export interface LastEffectSnapshot {
    kind: 'filter' | 'adjustment';
    label: string;
    layerId: string;
    dirtyRect: { x: number; y: number; width: number; height: number };
    before: ImageData;
    after: ImageData;
}

export interface HistorySlice {
    historyTick: number;
    historyEntries: HistoryEntry[];
    currentHistoryIndex: number;
    historyMaxSize: number;
    canUndo: boolean;
    canRedo: boolean;
    lastEffect: LastEffectSnapshot | null;
    commitHistory: (action: HistoryAction) => HistoryEntry;
    executeCommand: (action: GenericHistoryAction) => HistoryEntry;
    executeCompoundCommand: (action: CompoundHistoryAction) => HistoryEntry;
    executeDocumentCommand: (options: DocumentHistoryCommandOptions) => HistoryEntry;
    undo: () => HistoryEntry | null;
    redo: () => HistoryEntry | null;
    revertToHistoryIndex: (index: number) => void;
    clearHistory: () => void;
    setHistoryMaxSize: (maxSize: number) => void;
    commitSnapshot: (label?: string) => void;
    setLastEffect: (snapshot: LastEffectSnapshot | null) => void;
}

export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'error' | 'success';
}

export type ToastErrorChannel = 'save' | 'load' | 'autosave' | 'export' | 'quota';

export interface ToastsSlice {
    toasts: Toast[];
    lastErrorChannel: ToastErrorChannel | null;
    addToast: (message: string, type?: Toast['type']) => void;
    reportError: (channel: ToastErrorChannel, message: string, type?: Toast['type']) => void;
    removeToast: (id: string) => void;
    clearLastErrorChannel: () => void;
}

export type RequirementStatus =
    | 'todo'
    | 'queued'
    | 'running'
    | 'done'
    | 'blocked'
    | 'failed'
    | 'needs-review'
    | 'cancelled';

export interface RequirementVerification {
    typecheck: 'pass' | 'fail' | 'not-run';
    lint: 'pass' | 'fail' | 'not-run';
    tests: 'pass' | 'fail' | 'not-run';
}

export interface RequirementReviewWorkspace {
    branchName: string;
    worktreePath: string;
    baseRef: string;
}

export interface RequirementItem {
    id: string;
    title: string;
    rawPrompt: string;
    normalizedPrompt: string;
    status: RequirementStatus;
    createdAt: string;
    updatedAt: string;
    startedAt?: string;
    completedAt?: string;
    source: 'user' | 'host' | 'agent';
    priority: 'low' | 'normal' | 'high';
    sourceContext?: {
        documentName?: string;
        activeTool?: string;
        activeLayerId?: string | null;
        selectedLayerIds?: string[];
        zoom?: number;
    };
    resultSummary?: string;
    failureReason?: string;
    changedFiles: string[];
    verification: RequirementVerification;
    runner?: string;
    reviewWorkspace?: RequirementReviewWorkspace;
    appliedAt?: string;
    mergeCommit?: string;
}

export interface RequirementsSlice {
    isRequirementsOverlayOpen: boolean;
    requirementsConnection: 'connecting' | 'online' | 'offline';
    requirementsDraft: string;
    selectedRequirementId: string | null;
    requirements: RequirementItem[];
    requirementLogs: Record<string, string[]>;
    setRequirementsOverlayOpen: (open: boolean) => void;
    toggleRequirementsOverlay: () => void;
    setRequirementsConnection: (connection: 'connecting' | 'online' | 'offline') => void;
    setRequirementsDraft: (draft: string) => void;
    selectRequirement: (id: string | null) => void;
    replaceRequirements: (items: RequirementItem[]) => void;
    upsertRequirement: (item: RequirementItem) => void;
    removeRequirement: (id: string) => void;
    appendRequirementLog: (requirementId: string, line: string) => void;
}

export type EditorStore =
    & DocumentSlice
    & LayersSlice
    & SelectionSlice
    & ToolsSlice
    & ViewSlice
    & ColorSlice
    & PanelsSlice
    & HistorySlice
    & ToastsSlice
    & RequirementsSlice
    & import('./presetsSlice').PresetsSlice;
