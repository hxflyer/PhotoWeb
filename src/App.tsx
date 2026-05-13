import { useEffect, useState, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { MainLayout } from './components/layout/MainLayout';
import { DocumentTab } from './components/layout/DocumentTab';
import { PasteboardContextMenu, type PasteboardContextMenuState } from './components/layout/PasteboardContextMenu';
import { MenuBar } from './components/layout/MenuBar';
import { StatusBar } from './components/layout/StatusBar';
import { ToastContainer } from './components/layout/ToastContainer';
import { Toolbar } from './components/Panels/Toolbar';
import { OptionsBar } from './components/Panels/OptionsBar';
import { RightPanelDock } from './components/Panels/RightPanelDock';
import { Viewport } from './components/Canvas/Viewport';
import { FreeTransformOverlay, type FreeTransformState } from './components/Canvas/FreeTransformOverlay';
import { WarpOverlay } from './components/Canvas/WarpOverlay';
import { useEditorStore } from './store/editorStore';
import { InputNumberDialog } from './components/Dialogs/InputNumberDialog';
import { FilterDialog } from './components/Dialogs/FilterDialog';
import { AdjustmentDialog } from './components/Dialogs/AdjustmentDialog';
import { ImageSizeDialog } from './components/Dialogs/ImageSizeDialog';
import { CanvasSizeDialog } from './components/Dialogs/CanvasSizeDialog';
import { ArbitraryRotationDialog } from './components/Dialogs/ArbitraryRotationDialog';
import { TrimDialog } from './components/Dialogs/TrimDialog';
import { ColorPickerDialog } from './components/Dialogs/ColorPickerDialog';
import { ExportDialog } from './components/Dialogs/ExportDialog';
import { NewDocumentDialog } from './components/Dialogs/NewDocumentDialog';
import { RefineEdgeDialog } from './components/Dialogs/RefineEdgeDialog';
import { DefringeDialog } from './components/Dialogs/DefringeDialog';
import { ScaleEffectsDialog } from './components/Dialogs/ScaleEffectsDialog';
import { SaveSelectionDialog, LoadSelectionDialog } from './components/Dialogs/SelectionDialogs';
import { ColorRangeDialog } from './components/Dialogs/ColorRangeDialog';
import { BorderSelectionDialog } from './components/Dialogs/BorderSelectionDialog';
import { SmoothSelectionDialog } from './components/Dialogs/SmoothSelectionDialog';
import { ExpandSelectionDialog, ContractSelectionDialog } from './components/Dialogs/ExpandSelectionDialog';
import { TransformSelectionOverlay } from './components/Canvas/TransformSelectionOverlay';
import { ShortcutsDialog } from './components/Dialogs/ShortcutsDialog';
import { PreferencesDialog } from './components/Dialogs/PreferencesDialog';
import { NewGuideDialog } from './components/Dialogs/NewGuideDialog';
import { StorageUsageDialog } from './components/Dialogs/StorageUsageDialog';
import { StrokePathDialog } from './components/Dialogs/StrokePathDialog';
import { FillPathDialog } from './components/Dialogs/FillPathDialog';
import { FadeDialog } from './components/Dialogs/FadeDialog';
import { RequirementsOverlay } from './components/Overlay/RequirementsOverlay';
import { getLastFilter, getFilter, applyFilterToLayer, setLastFilter } from './filters/index';
import { applyAdjustmentToLayer } from './adjustments';
import { initAutoSaveCheck } from './core/autoSave';
import { captureLayerRegion, createPixelHistoryAction } from './core/history';
import { bindTypePanelStore, bindTypeToastBridge, getEditingStyle, updateEditingStyle, type TypeLayerData } from './tools/type';
import { moveSelectedPixelsBy } from './tools/move';
import { cloneShapeData } from './tools/shapeCommands';
import { rerenderShapeLayer } from './tools/shapeRender';
import type { ShapeData } from './store/types';
import { nudgeSelectionBorderBy } from './tools/selectionMove';
import { loadImage } from './utils/imageLoader';
import { ingestFiles, summaryToast } from './utils/fileIngest';
import { requestViewportFit } from './utils/viewportFit';
import { copyActiveDocumentForClipboard } from './utils/copyImageForClipboard';
import { SaveAsDialog } from './components/Dialogs/SaveAsDialog';
import { CloseConfirmDialog } from './components/Dialogs/CloseConfirmDialog';
import { getLayerContentBounds } from './utils/canvasUtils';
import './App.css';

const START_FREE_TRANSFORM_EVENT = 'photoweb:start-free-transform';

const PAINT_FAMILY_TOOLS = new Set([
  'brush', 'pencil', 'eraser', 'magic-eraser', 'background-eraser',
  'clone-stamp', 'pattern-stamp', 'history-brush', 'art-history-brush',
  'spot-healing', 'healing-brush', 'patch', 'red-eye',
  'dodge', 'burn', 'sponge', 'blur', 'sharpen', 'smudge',
  'mixer-brush',
]);

function isPaintFamily(tool: string): boolean {
  return PAINT_FAMILY_TOOLS.has(tool);
}

// Screen mode state lives in viewSlice; see Toolbar / MenuBar / MainLayout for
// the menu, toolbar icon, and layout-tracker integrations.

function App() {
  // Narrow subscription: only fields that affect App's JSX (not color, brushSettings, etc.)
  const { dialogs, hasAutosave, selection, zoom, pan, isNewGuideDialogOpen, isScaleEffectsDialogOpen, isTransformSelectionOpen } = useEditorStore(
    useShallow(s => ({
      dialogs: s.dialogs,
      hasAutosave: s.hasAutosave,
      selection: s.selection,
      zoom: s.zoom,
      pan: s.pan,
      isNewGuideDialogOpen: s.isNewGuideDialogOpen,
      isScaleEffectsDialogOpen: s.isScaleEffectsDialogOpen,
      isTransformSelectionOpen: s.isTransformSelectionOpen,
    }))
  );
  // Shorthand for imperative reads — actions are stable Zustand references
  const gs = useEditorStore.getState;

  const [freeTransform, setFreeTransform] = useState<FreeTransformState | null>(null);
  const [warpState, setWarpState] = useState<{ layerId: string; snapshot: ImageData } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('Untitled');
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [adjustmentPreview, setAdjustmentPreview] = useState<{ image: ImageData; scale: number } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [strokePathOpen, setStrokePathOpen] = useState(false);
  const [fillPathOpen, setFillPathOpen] = useState(false);
  const [fadeDialogOpen, setFadeDialogOpen] = useState(false);
  const [pasteboardMenu, setPasteboardMenu] = useState<PasteboardContextMenuState | null>(null);
  const [pickingPasteboardColor, setPickingPasteboardColor] = useState(false);
  const colorTheme = useEditorStore(s => s.colorTheme);
  const pasteboardColor = useEditorStore(s => s.pasteboardColor);
  const pasteboardCustomColor = useEditorStore(s => s.pasteboardCustomColor);
  const neutralColorMode = useEditorStore(s => s.neutralColorMode);

  // Apply colorTheme as data-theme on :root so all CSS-variable-driven
  // components re-skin without a React subscription.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = colorTheme;
  }, [colorTheme]);

  // Neutral Color Mode (Photoshop 23.5): overrides --accent-primary and
  // --accent-highlight to gray so static "blue" UI accents (active tabs,
  // commit buttons, etc.) read as neutral. Color-related surfaces (Color
  // Picker, Gradient Editor) don't read from these tokens, so they're
  // unaffected — matching Photoshop's documented carve-out.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (neutralColorMode) {
      root.style.setProperty('--accent-primary', '0 0% 56%');
      root.style.setProperty('--accent-highlight', '0 0% 70%');
    } else {
      root.style.removeProperty('--accent-primary');
      root.style.removeProperty('--accent-highlight');
    }
  }, [neutralColorMode]);

  // Apply pasteboardColor by setting --pasteboard-bg. `default` clears the
  // override so the theme's --bg-canvas takes over.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const preset: Record<typeof pasteboardColor, string | null> = {
      default: null,
      black: 'hsl(0 0% 0%)',
      darkGray: 'hsl(0 0% 20%)',
      mediumGray: 'hsl(0 0% 40%)',
      lightGray: 'hsl(0 0% 70%)',
      custom: pasteboardCustomColor,
    };
    const value = preset[pasteboardColor];
    if (value == null) {
      root.style.removeProperty('--pasteboard-bg');
    } else {
      root.style.setProperty('--pasteboard-bg', value);
    }
  }, [pasteboardColor, pasteboardCustomColor]);

  // Shift+F2 / Shift+F1 cycle the interface color theme (lighter / darker).
  // Suppress inside editable elements so a literal F1 inside an input is
  // never hijacked.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'F1' && e.key !== 'F2') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      e.preventDefault();
      useEditorStore.getState().cycleColorTheme(e.key === 'F2' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Window-menu F-keys (F5 Brush Presets, F6 Color, F7 Layers, F8 Info) +
  // Tab / Shift+Tab to hide chrome. Suppressed inside inputs and when a
  // dialog is open (don't fight focus traps / Tab cycling).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      const s = useEditorStore.getState();
      const anyDialog = s.dialogs.isImageSizeOpen || s.dialogs.isCanvasSizeOpen
        || s.dialogs.isExportDialogOpen || s.dialogs.isNewDocumentDialogOpen
        || s.dialogs.isColorPickerOpen || s.dialogs.isRefineEdgeDialogOpen
        || s.dialogs.isSaveSelectionDialogOpen || s.dialogs.isLoadSelectionDialogOpen
        || s.dialogs.isColorRangeDialogOpen || s.dialogs.isDefringeDialogOpen
        || s.dialogs.isArbitraryRotationOpen
        || s.dialogs.isTrimOpen || s.dialogs.isFeatherDialogOpen
        || s.dialogs.filterDialog.isOpen || s.dialogs.adjustmentDialog.isOpen;
      if (anyDialog) return;

      if (!e.shiftKey && e.key === 'F5') { e.preventDefault(); s.togglePanelVisibility('brush-presets'); return; }
      if (!e.shiftKey && e.key === 'F6') { e.preventDefault(); s.togglePanelVisibility('color'); return; }
      if (!e.shiftKey && e.key === 'F7') { e.preventDefault(); s.togglePanelVisibility('layers'); return; }
      if (!e.shiftKey && e.key === 'F8') { e.preventDefault(); s.togglePanelVisibility('info'); return; }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          s.setChromeHidden(s.chromeHidden === 'right' ? 'none' : 'right');
        } else {
          s.setChromeHidden(s.chromeHidden === 'none' ? 'all' : 'none');
        }
        return;
      }

      // Esc exits Full Screen Mode back to Standard. Only fires in Full
      // Screen — Esc in Standard is reserved for other handlers (menu
      // close, gesture cancel, etc.). The `anyDialog` early return above
      // already prevents this from fighting dialog-Esc handlers.
      if (!e.shiftKey && e.key === 'Escape' && s.screenMode === 'full') {
        e.preventDefault();
        s.setScreenMode('standard');
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const openPrefs = () => setPreferencesOpen(true);
    const openStorage = () => setStorageOpen(true);
    const openStroke = () => setStrokePathOpen(true);
    const openFill = () => setFillPathOpen(true);
    const openFade = () => {
      if (useEditorStore.getState().lastEffect) setFadeDialogOpen(true);
    };
    window.addEventListener('photoweb:open-preferences', openPrefs);
    window.addEventListener('photoweb:open-storage-usage', openStorage);
    window.addEventListener('photoweb:open-stroke-path', openStroke);
    window.addEventListener('photoweb:open-fill-path', openFill);
    window.addEventListener('photoweb:open-fade', openFade);
    return () => {
      window.removeEventListener('photoweb:open-preferences', openPrefs);
      window.removeEventListener('photoweb:open-storage-usage', openStorage);
      window.removeEventListener('photoweb:open-stroke-path', openStroke);
      window.removeEventListener('photoweb:open-fill-path', openFill);
      window.removeEventListener('photoweb:open-fade', openFade);
    };
  }, []);
  const autoSaveStarted = useRef(false);
  const openFileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const loadFilesIntoStackRef = useRef<HTMLInputElement>(null);
  const numberKeyWindow = useRef<{ digits: number; time: number } | null>(null);

  useEffect(() => {
    // Re-apply persisted UI scale on every boot so users don't need to open
    // Preferences to see their saved font size again.
    if (typeof document !== 'undefined' && document.documentElement && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('photoweb:userPrefs:v1');
        if (raw) {
          const parsed = JSON.parse(raw) as { uiScale?: number };
          if (parsed && typeof parsed.uiScale === 'number' && Number.isFinite(parsed.uiScale) && parsed.uiScale > 0) {
            document.documentElement.style.fontSize = `${parsed.uiScale}rem`;
          }
        }
      } catch { /* malformed prefs — ignore */ }
    }

    if (gs().layers.length === 0) {
      gs().addLayer();
      // STAB-02: the boot-time addLayer is not a user edit; keep the doc clean.
      gs().markDocumentClean();
    }
    bindTypePanelStore(() => {
      const s = gs();
      return {
        layers: s.layers,
        activeLayerId: s.activeLayerId,
        // Bumps the layers array reference so Viewport's compositor re-runs.
        forceRender: () => useEditorStore.setState(state => ({ layers: [...state.layers] })),
      };
    });
    bindTypeToastBridge((message, type) => gs().addToast(message, type));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoSaveStarted.current) {
      autoSaveStarted.current = true;
      initAutoSaveCheck(() => useEditorStore.getState()).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function doQuickExportPng() {
    const s = gs();
    const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
    const ctx = c.getContext('2d')!;
    s.layers.forEach(l => { if (l.visible) { ctx.globalAlpha = l.opacity; ctx.globalCompositeOperation = l.blendMode; ctx.drawImage(l.canvas, 0, 0); } });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    c.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'export.png'; a.click(); URL.revokeObjectURL(u); }, 'image/png');
    s.addToast('PNG exported', 'success');
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // While the user is typing in a text input / contenteditable, don't hijack
      // alphabetic keys for tool shortcuts. Otherwise typing 'b' in the type
      // overlay would switch to the brush tool.
      const target = e.target as HTMLElement | null;
        if (target && (target.isContentEditable
          || target.tagName === 'INPUT'
          || target.tagName === 'TEXTAREA'
          || target.tagName === 'SELECT')) {
        return;
      }

      if (freeTransform) return;

      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (meta && key === 'z' && !e.shiftKey && !e.altKey) { e.preventDefault(); useEditorStore.getState().undo(); return; }
      if (meta && ((key === 'z' && (e.shiftKey || e.altKey)) || key === 'y')) { e.preventDefault(); useEditorStore.getState().redo(); return; }

      if (meta && key === 'f' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const last = getLastFilter(); if (!last) return;
        const s = useEditorStore.getState();
        const layer = s.layers.find(l => l.id === s.activeLayerId);
        if (layer) applyFilterToLayer(layer, last.id, last.params, s.selection);
        return;
      }
      if (meta && key === 'f' && e.altKey) {
        e.preventDefault();
        const last = getLastFilter(); if (last) gs().openFilterDialog(last.id, last.params);
        return;
      }
      if (meta && key === 'f' && e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (gs().lastEffect) setFadeDialogOpen(true);
        return;
      }

      if (meta && key === 't' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const s = useEditorStore.getState();
        const layer = s.layers.find(l => l.id === s.activeLayerId);
        if (!layer) return;
        const snapshot = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        setFreeTransform({ layerId: layer.id, snapshot, x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height, rotation: 0, skewX: 0, skewY: 0 });
        return;
      }
      if (meta && key === 't' && e.shiftKey) {
        e.preventDefault();
        const s = useEditorStore.getState();
        const layer = s.layers.find(l => l.id === s.activeLayerId);
        if (!layer) return;
        const snapshot = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
        setWarpState({ layerId: layer.id, snapshot });
        return;
      }

      if (meta && key === 'n' && !e.shiftKey) {
        e.preventDefault();
        if (gs().isDirty && !window.confirm('Unsaved changes will be lost. Create a new document anyway?')) return;
        gs().openNewDocumentDialog();
        return;
      }
      if (meta && key === 'o') {
        e.preventDefault();
        if (gs().isDirty && !window.confirm('Unsaved changes will be lost. Open another file anyway?')) return;
        openFileRef.current?.click();
        return;
      }
      if (meta && key === 's' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const name = gs().documentName;
        gs().saveFile(name).then(() => gs().addToast(`Saved "${name}"`, 'success')).catch(() => gs().addToast('Save failed', 'error'));
        return;
      }
      if (meta && key === 's' && e.shiftKey && !e.altKey) { e.preventDefault(); setSaveDialogName(gs().documentName); setSaveDialogOpen(true); return; }
      if (meta && key === 's' && e.shiftKey && e.altKey) { e.preventDefault(); doQuickExportPng(); return; }
      if (meta && key === 'w' && e.shiftKey && e.altKey) { e.preventDefault(); gs().openExportDialog(); return; }
      // File > Close (Cmd+W) and File > Close All (Cmd+Alt+W) — in single-doc
      // mode both collapse to the same Close path. Guard against firing while
      // a transform/warp gesture is live: Photoshop habit is to commit/cancel
      // the gesture first.
      if (meta && key === 'w' && !e.shiftKey) {
        e.preventDefault();
        if (freeTransform || warpState) return;
        const s = gs();
        if (s.layers.length === 0) return;
        if (s.isDirty) { setCloseConfirmOpen(true); } else { s.closeDocument(); }
        return;
      }

      if (meta && key === 'r') { e.preventDefault(); const s = gs(); s.setShowRulers(!s.showRulers); return; }
      if (meta && (key === "'" || key === '"')) { e.preventDefault(); const s = gs(); s.setShowGrid(!s.showGrid); return; }
      if (meta && e.shiftKey && key === ';') { e.preventDefault(); const s = gs(); s.setSnapEnabled(!s.snapEnabled); return; }

      if (!meta && !e.shiftKey && !e.altKey && key === 'q') { e.preventDefault(); const s = gs(); s.setQuickMaskMode(!s.quickMaskMode); return; }

      // Tab / Shift+Tab toggles workspace chrome visibility (Photoshop style).
      // Skip when focus is in a text input / contenteditable so users can still
      // tab through form fields.
      if (!meta && !e.altKey && key === 'tab') {
        e.preventDefault();
        if (e.shiftKey) gs().toggleAllPanelsExceptCanvas();
        else gs().toggleAllPanels();
        return;
      }

      if (meta && key === 'd' && !e.shiftKey && !e.altKey) { e.preventDefault(); gs().clearSelection(); return; }
      if (meta && key === 'd' && e.shiftKey && !e.altKey) { e.preventDefault(); gs().reselect(); return; }
      if (meta && key === 'h' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const s = gs();
        s.setSelectionEdgesHidden(!s.selection.edgesHidden);
        return;
      }
      if (meta && key === 'a') {
        e.preventDefault();
        const s = gs();
        s.setHasSelection(true);
        s.setSelectionOperations([{ mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: s.width, y: s.height }] }]);
        return;
      }
      if (meta && key === 'i' && e.altKey && !e.shiftKey) { e.preventDefault(); gs().openImageSizeDialog(); return; }
      if (meta && key === 'c' && e.altKey && !e.shiftKey) { e.preventDefault(); gs().openCanvasSizeDialog(); return; }
      if (meta && key === 'c' && !e.shiftKey && !e.altKey) { e.preventDefault(); copyActiveDocumentForClipboard(gs()); return; }
      if (meta && key === 'i' && !e.shiftKey && !e.altKey) { e.preventDefault(); gs().toggleInvertSelection(); return; }

      if (meta && key === '/') { e.preventDefault(); setShortcutsOpen(true); return; }

      if (meta && (key === '=' || key === '+')) { e.preventDefault(); gs().setZoom(Math.min(gs().zoom * 1.25, 32)); return; }
      if (meta && key === '-') { e.preventDefault(); gs().setZoom(Math.max(gs().zoom / 1.25, 0.02)); return; }
      if (meta && key === '0') { e.preventDefault(); requestViewportFit(); return; }
      if (meta && key === '1' && !e.shiftKey && !e.altKey) { e.preventDefault(); gs().setZoom(1); return; }

      if (meta && key === 'j' && !e.altKey) {
        e.preventDefault();
        const s = gs();
        if (e.shiftKey) {
          if (s.selection.hasSelection) s.layerViaCut();
          else if (s.activeLayerId) s.duplicateLayer(s.activeLayerId);
        } else {
          if (s.selection.hasSelection) s.layerViaCopy();
          else if (s.activeLayerId) s.duplicateLayer(s.activeLayerId);
        }
        return;
      }
      if (meta && key === 'g' && !e.altKey) {
        e.preventDefault();
        const s = gs();
        if (e.shiftKey) {
          const layer = s.layers.find(l => l.id === s.activeLayerId);
          if (layer && layer.kind === 'group') s.ungroupLayerGroup(layer.id);
        } else {
          s.createLayerGroup();
        }
        return;
      }
      if (meta && key === 'e' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const s = gs();
        if (s.activeLayerId) s.mergeLayerDown(s.activeLayerId);
        return;
      }
      if (meta && key === 'e' && e.shiftKey && !e.altKey) {
        e.preventDefault();
        gs().mergeVisible();
        return;
      }
      if (meta && key === 'e' && e.shiftKey && e.altKey) {
        e.preventDefault();
        gs().stampVisible();
        return;
      }

      if (!meta && !e.altKey && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
        const step = e.shiftKey ? 10 : 1;
        const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
        const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
        const s = gs();
        if (s.selection.hasSelection) {
          const moved = s.activeTool === 'move'
            ? moveSelectedPixelsBy(dx, dy, s)
            : nudgeSelectionBorderBy(dx, dy);
          if (moved) {
            e.preventDefault();
            return;
          }
        }
      }

      if (!meta && !e.shiftKey && !e.altKey && key === 'x') { e.preventDefault(); gs().swapColors(); return; }
      if (!meta && !e.shiftKey && !e.altKey && key === 'd') { e.preventDefault(); gs().resetColors(); return; }

      // F cycles screen modes (Standard / Full Screen With Menu / Full Screen).
      // Shift+F cycles backward. Reads through the store so the View menu and
      // toolbar icon stay in sync.
      if (!meta && !e.altKey && key === 'f') {
        e.preventDefault();
        gs().cycleScreenMode(e.shiftKey ? -1 : 1);
        return;
      }

      if (!meta && !e.altKey) {
        // Photoshop-style tool groups: tapping the letter activates the first
        // tool in the group; Shift+letter cycles through siblings. Type asserted
        // to string[] so newly-registered tools (magnetic-lasso, pattern-stamp)
        // can participate without requiring a ToolId union update.
        type TID = string;
        const toolGroups: Record<string, TID[]> = {
          v: ['move'],
          b: ['brush', 'pencil'],
          e: ['eraser', 'magic-eraser', 'background-eraser'],
          g: ['fill', 'gradient'],
          i: ['eyedropper', 'ruler'],
          j: ['spot-healing', 'healing-brush', 'patch', 'red-eye'],
          m: ['marquee-rect', 'marquee-ellipse'],
          l: ['lasso', 'lasso-poly', 'magnetic-lasso'],
          w: ['quick-selection', 'magic-wand'],
          c: ['crop'],
          t: ['type-horizontal', 'type-vertical'],
          p: ['pen', 'freeform-pen'],
          a: ['direct-selection', 'path-selection'],
          u: ['shape-rectangle', 'shape-rounded-rectangle', 'shape-ellipse', 'shape-polygon', 'shape-line', 'shape-custom'],
          h: ['hand'],
          z: ['zoom'],
          s: ['clone-stamp', 'pattern-stamp'],
          o: ['dodge', 'burn', 'sponge'],
        };
        const group = toolGroups[key];
        if (group) {
          e.preventDefault();
          const current = gs().activeTool;
          const idx = group.indexOf(current as TID);
          // Preferences > Tools > Use Shift Key for Tool Switch:
          //   true  (Photoshop default): plain letter activates / re-selects;
          //                              Shift+letter cycles.
          //   false: plain letter cycles when the active tool is already in
          //          the group; otherwise activates the first.
          const requiresShift = gs().useShiftForToolSwitch;
          let next: TID;
          if (requiresShift) {
            next = e.shiftKey
                ? group[(idx + 1) % group.length]
                : (idx >= 0 ? group[idx] : group[0]);
          } else {
            next = idx >= 0
                ? group[(idx + 1) % group.length]
                : group[0];
          }
          gs().setTool(next as import('./store/types').ToolId);
          return;
        }
      }

      // Number keys: opacity (and Shift+number = flow) for paint/retouch
      // tools. 1-9 = 10-90%, 0 = 100%. Photoshop has a ~300ms double-digit
      // window where consecutive digits compose a percentage (e.g. "2"+"5"
      // → 25%). Only when no meta/alt to avoid stomping Cmd+1, etc.
      if (!meta && !e.altKey && /^[0-9]$/.test(key) && isPaintFamily(gs().activeTool)) {
        e.preventDefault();
        const digit = parseInt(key, 10);
        const now = performance.now();
        const within = numberKeyWindow.current && (now - numberKeyWindow.current.time) < 300
          ? numberKeyWindow.current : null;
        let percent: number;
        if (within) {
          percent = within.digits * 10 + digit;
          if (percent > 100) percent = digit === 0 ? 100 : digit * 10;
          numberKeyWindow.current = null;
        } else {
          percent = digit === 0 ? 100 : digit * 10;
          numberKeyWindow.current = { digits: digit, time: now };
        }
        const value = Math.max(0, Math.min(1, percent / 100));
        if (e.shiftKey) gs().setBrushFlow(value);
        else gs().setBrushOpacity(value);
        return;
      }

      if (!meta && !e.altKey && key === '[') {
        e.preventDefault();
        const { brushSettings: bs } = gs();
        if (e.shiftKey) gs().setBrushHardness(Math.max(0, bs.hardness - 0.1));
        else gs().setBrushSize(Math.max(1, bs.size - 5));
        return;
      }
      if (!meta && !e.altKey && key === ']') {
        e.preventDefault();
        const { brushSettings: bs } = gs();
        if (e.shiftKey) gs().setBrushHardness(Math.min(1, bs.hardness + 0.1));
        else gs().setBrushSize(Math.min(2000, bs.size + 5));
        return;
      }

      if (meta && e.shiftKey && key === 'n') { e.preventDefault(); gs().addLayer(); return; }
      if ((meta && key === 'delete') || (meta && key === 'backspace')) {
        e.preventDefault();
        const s = gs();
        if (s.activeLayerId) s.removeLayer(s.activeLayerId);
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [freeTransform]); // stable: store values read via gs(); transform mode blocks tool shortcuts

  // Photoshop temporary navigation:
  //   Space        → temp Hand Tool
  //   Space + Cmd  → temp Zoom Tool (zoom in on click)
  //   Space + Cmd + Alt → temp Zoom Tool (zoom out on click; Alt routes
  //                       through the zoom tool's own click handler)
  // Releasing ANY of Space / Cmd restores the prior tool. Suppressed in
  // editable elements so a literal space keeps typing.
  useEffect(() => {
    let priorTool: import('./store/types').ToolId | null = null;
    let active: 'hand' | 'zoom' | null = null;
    const isEditable = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;
      return !!(el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'));
    };
    const restore = () => {
      if (priorTool && (gs().activeTool === 'hand' || gs().activeTool === 'zoom')) {
        gs().setTool(priorTool);
      }
      priorTool = null;
      active = null;
    };
    const onDown = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const s = gs();
      // Promote Hand → Zoom when Cmd/Ctrl pressed while Space is held.
      if ((e.key === 'Meta' || e.key === 'Control') && active === 'hand' && !e.repeat) {
        s.setTool('zoom');
        active = 'zoom';
        return;
      }
      // Demote Zoom → Hand when Space is the first press but Cmd was
      // already held — handled in the Space branch below.
      if (e.code !== 'Space' || e.repeat) return;
      e.preventDefault();
      if (active !== null) return;
      const useZoom = e.metaKey || e.ctrlKey;
      priorTool = s.activeTool;
      active = useZoom ? 'zoom' : 'hand';
      s.setTool(useZoom ? 'zoom' : 'hand');
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && active !== null) {
        restore();
        return;
      }
      if ((e.key === 'Meta' || e.key === 'Control') && active === 'zoom') {
        // Cmd released but Space may still be held: drop back to Hand.
        gs().setTool('hand');
        active = 'hand';
      }
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Alt/Option held with a paint tool active = temporary Eyedropper. Release
  // restores the paint tool. We only swap when no drag is in progress to
  // avoid disrupting an active stroke.
  useEffect(() => {
    let priorTool: import('./store/types').ToolId | null = null;
    const onDown = (e: KeyboardEvent) => {
      if (e.key !== 'Alt' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const s = gs();
      if (!isPaintFamily(s.activeTool)) return;
      priorTool = s.activeTool;
      s.setTool('eyedropper');
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key !== 'Alt') return;
      if (priorTool && gs().activeTool === 'eyedropper') {
        gs().setTool(priorTool);
      }
      priorTool = null;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  function startFreeTransform(layerId?: string) {
    const s = useEditorStore.getState();
    const layer = s.layers.find(l => l.id === (layerId ?? s.activeLayerId));
    if (!layer) return;
    const snapshot = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const typeData = layer.kind === 'type' ? layer.typeData as TypeLayerData | null : null;
    const shapeData = layer.kind === 'shape' && layer.shapeData
      ? cloneShapeData(layer.shapeData as ShapeData)
      : null;
    const bounds = typeData?.bounds
      ? { x: typeData.bounds.x, y: typeData.bounds.y, w: typeData.bounds.w, h: typeData.bounds.h }
      : typeData
        ? {
          x: typeData.transform.x,
          y: typeData.transform.y,
          w: Math.max(1, typeData.transform.width || typeData.style.fontSize * Math.max(1, typeData.text.length || 1) * 0.6),
          h: Math.max(1, typeData.transform.height || typeData.style.fontSize * 1.2),
        }
      : getLayerContentBounds(layer.canvas);
    if (!bounds) return;
    const source = layer.ctx.getImageData(bounds.x, bounds.y, bounds.w, bounds.h);
    setFreeTransform({
      layerId: layer.id,
      snapshot,
      source,
      sourceX: bounds.x,
      sourceY: bounds.y,
      typeDataSnapshot: typeData ? structuredClone(typeData) : undefined,
      shapeDataSnapshot: shapeData ?? undefined,
      x: bounds.x,
      y: bounds.y,
      width: bounds.w,
      height: bounds.h,
      rotation: 0,
      skewX: 0,
      skewY: 0,
    });
  }

  useEffect(() => {
    const onStart = (event: Event) => {
      const layerId = (event as CustomEvent<{ layerId?: string }>).detail?.layerId;
      startFreeTransform(layerId);
    };
    window.addEventListener(START_FREE_TRANSFORM_EVENT, onStart);
    return () => window.removeEventListener(START_FREE_TRANSFORM_EVENT, onStart);
  }, []);

  function startWarp() {
    const s = useEditorStore.getState();
    const layer = s.layers.find(l => l.id === s.activeLayerId);
    if (!layer) return;
    const snapshot = layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    setWarpState({ layerId: layer.id, snapshot });
  }

  async function handleOpenFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const img = await loadImage(file);
        const opened = gs().openImageAsDocument(img, file.name);
        if (opened) requestViewportFit();
      }
      catch { gs().addToast('Failed to open file', 'error'); }
    }
    if (openFileRef.current) openFileRef.current.value = '';
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const img = await loadImage(file);
        gs().addLayerFromImage(img, file.name);
      }
      catch { gs().addToast('Failed to import image', 'error'); }
    }
    if (importFileRef.current) importFileRef.current.value = '';
  }

  async function handleLoadFilesIntoStack(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      const summary = await ingestFiles(files, { treatFirstAsNewDoc: true });
      const toast = summaryToast(summary);
      if (toast) gs().addToast(toast.message, toast.level);
    }
    if (loadFilesIntoStackRef.current) loadFilesIntoStackRef.current.value = '';
  }

  const filterDlg = dialogs.filterDialog;
  const adjustmentDlg = dialogs.adjustmentDialog;
  useEffect(() => {
    if (!adjustmentDlg.isOpen) {
      const timeout = window.setTimeout(() => setAdjustmentPreview(null), 0);
      return () => window.clearTimeout(timeout);
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        const s = gs();
        const layer = s.layers.find(l => l.id === s.activeLayerId);
        if (!layer) {
          setAdjustmentPreview(null);
          return;
        }
        const maxSide = 560;
        const scale = Math.min(1, maxSide / Math.max(layer.canvas.width, layer.canvas.height));
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = Math.max(1, Math.round(layer.canvas.width * scale));
        previewCanvas.height = Math.max(1, Math.round(layer.canvas.height * scale));
        const ctx = previewCanvas.getContext('2d');
        if (!ctx) {
          setAdjustmentPreview(null);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(layer.canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        try {
          setAdjustmentPreview({ image: ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height), scale });
        } catch {
          setAdjustmentPreview(null);
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [adjustmentDlg.isOpen, adjustmentDlg.adjustmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only read full pixels synchronously for the legacy filter dialog.
  // getImageData is a GPU readback — calling it on every render (e.g. during color
  // slider drag) was causing multi-second UI freezes.
  const activeSourceImage: ImageData | null = (() => {
    if (!filterDlg.isOpen) return null;
    const s = gs();
    const layer = s.layers.find(l => l.id === s.activeLayerId);
    if (!layer) return null;
    try { return layer.ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height); }
    catch { return null; }
  })();

  return (
    <>
      <MainLayout
        menuBar={
          <MenuBar
            onNew={() => {
              if (gs().isDirty && !window.confirm('Unsaved changes will be lost. Create a new document anyway?')) return;
              gs().openNewDocumentDialog();
            }}
            onSaveAs={() => { setSaveDialogName(gs().documentName); setSaveDialogOpen(true); }}
            onFreeTransform={startFreeTransform}
            onWarp={startWarp}
            onOpenFile={() => {
              if (gs().isDirty && !window.confirm('Unsaved changes will be lost. Open another file anyway?')) return;
              openFileRef.current?.click();
            }}
            onPlaceEmbedded={() => importFileRef.current?.click()}
            onLoadFilesIntoStack={() => loadFilesIntoStackRef.current?.click()}
            onClose={() => {
              const s = gs();
              if (s.layers.length === 0) return;
              if (s.isDirty) { setCloseConfirmOpen(true); } else { s.closeDocument(); }
            }}
          />
        }
        optionsBar={<OptionsBar />}
        documentTab={
          <DocumentTab
            onRequestClose={() => {
              const s = gs();
              if (s.layers.length === 0) return;
              if (s.isDirty) { setCloseConfirmOpen(true); } else { s.closeDocument(); }
            }}
          />
        }
        toolbar={<Toolbar />}
        canvas={<Viewport toolsBlocked={!!freeTransform} />}
        rightPanel={<RightPanelDock />}
        statusBar={<StatusBar />}
        onPasteboardContextMenu={(e) => {
          e.preventDefault();
          setPasteboardMenu({ x: e.clientX, y: e.clientY });
        }}
      />
      {pasteboardMenu && (
        <PasteboardContextMenu
          state={pasteboardMenu}
          onClose={() => setPasteboardMenu(null)}
          onPickCustom={() => { setPasteboardMenu(null); setPickingPasteboardColor(true); }}
        />
      )}
      {pickingPasteboardColor && (
        <ColorPickerDialog
          isOpen={true}
          initialColor={gs().pasteboardCustomColor}
          title="Pasteboard Color"
          onConfirm={(hex) => {
            const normalized = hex.startsWith('#') ? hex : `#${hex}`;
            gs().setPasteboardCustomColor(normalized);
            gs().setPasteboardColor('custom');
            setPickingPasteboardColor(false);
          }}
          onClose={() => setPickingPasteboardColor(false)}
        />
      )}

      {/* Hidden open-file input */}
      <input ref={openFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOpenFile} />
      <input ref={importFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImportFile} />
      <input ref={loadFilesIntoStackRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleLoadFilesIntoStack} />

      {/* Autosave recovery banner */}
      {hasAutosave && (
        <div data-testid="autosave-recovery-banner"
          role="status"
          aria-live="assertive"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            background: 'hsl(var(--accent-primary))', color: 'hsl(var(--text-on-accent, 0 0% 100%))',
            padding: '6px 16px', fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 12, zIndex: 10001,
          }}>
          <span>Recovery information from a previous session was found.</span>
          <button data-testid="autosave-recover-btn"
            onClick={() => gs().loadFile('autosave').then(() => gs().dismissAutosave()).catch(() => { /* loadDocument already toasted */ })}
            style={{ padding: '2px 10px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, color: 'inherit', cursor: 'pointer', fontSize: 11 }}>
            Recover Document
          </button>
          <button data-testid="autosave-discard-btn"
            onClick={() => gs().dismissAutosave()}
            style={{ padding: '2px 10px', background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, color: 'inherit', cursor: 'pointer', fontSize: 11 }}>
            Discard Recovery
          </button>
        </div>
      )}

      <SaveAsDialog isOpen={saveDialogOpen} initialName={saveDialogName} onClose={() => setSaveDialogOpen(false)} />

      <CloseConfirmDialog
        isOpen={closeConfirmOpen}
        documentName={gs().documentName}
        onCancel={() => setCloseConfirmOpen(false)}
        onDontSave={() => { setCloseConfirmOpen(false); gs().closeDocument(); }}
        onSave={() => {
          const s = gs();
          const name = s.documentName || 'Untitled';
          s.saveFile(name)
            .then(() => { gs().addToast(`Saved "${name}"`, 'success'); setCloseConfirmOpen(false); gs().closeDocument(); })
            .catch(() => gs().addToast('Save failed', 'error'));
        }}
      />

      <ToastContainer />
      <RequirementsOverlay />

      <InputNumberDialog isOpen={dialogs.isFeatherDialogOpen} onClose={() => gs().setFeatherDialogOpen(false)}
        onConfirm={(val) => gs().setSelectionFeather(val)} title="Selection Feather"
        label="Feather Radius (px)" initialValue={selection.feather || 0} min={0} max={200} />

      <FilterDialog isOpen={filterDlg.isOpen} filterId={filterDlg.filterId} sourceImage={activeSourceImage}
        initialParams={filterDlg.params}
        onConfirm={(params) => {
          const s = gs();
          const layer = s.layers.find(l => l.id === s.activeLayerId);
          const filter = getFilter(filterDlg.filterId);
          if (layer && filter) {
            const rect = { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
            const before = captureLayerRegion(layer, rect);
            applyFilterToLayer(layer, filterDlg.filterId, params, s.selection);
            const after = captureLayerRegion(layer, rect);
            s.commitHistory(createPixelHistoryAction(layer, rect, before, `Filter: ${filterDlg.filterId}`));
            setLastFilter(filterDlg.filterId, params);
            s.setLastEffect({ kind: 'filter', label: filter.label, layerId: layer.id, dirtyRect: rect, before, after });
          }
        }}
        onClose={() => gs().closeFilterDialog()} />

      <AdjustmentDialog isOpen={adjustmentDlg.isOpen} adjustmentId={adjustmentDlg.adjustmentId}
        sourceImage={adjustmentPreview?.image ?? null} sourceScale={adjustmentPreview?.scale ?? 1}
        selection={selection} initialParams={adjustmentDlg.params}
        onConfirm={(params) => {
          const s = gs();
          const layer = s.layers.find(l => l.id === s.activeLayerId);
          if (!layer) return;
          const rect = { x: 0, y: 0, width: layer.canvas.width, height: layer.canvas.height };
          const before = captureLayerRegion(layer, rect);
          if (applyAdjustmentToLayer(layer, adjustmentDlg.adjustmentId, params, s.selection)) {
            const after = captureLayerRegion(layer, rect);
            s.commitHistory(createPixelHistoryAction(layer, rect, before, `Adjustment: ${adjustmentDlg.adjustmentId}`));
            const idLabel = adjustmentDlg.adjustmentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            s.setLastEffect({ kind: 'adjustment', label: idLabel, layerId: layer.id, dirtyRect: rect, before, after });
          }
        }}
        onClose={() => gs().closeAdjustmentDialog()} />

      <ImageSizeDialog isOpen={dialogs.isImageSizeOpen}
        currentWidth={gs().width} currentHeight={gs().height} currentResolution={gs().resolution}
        onConfirm={(w, h, resolution, method, resample) => gs().resizeImage(w, h, method, resolution, resample)} onClose={() => gs().closeImageSizeDialog()} />

      <CanvasSizeDialog isOpen={dialogs.isCanvasSizeOpen}
        currentWidth={gs().width} currentHeight={gs().height}
        onConfirm={(w, h, ax, ay, color) => gs().resizeCanvas(w, h, ax, ay, color)} onClose={() => gs().closeCanvasSizeDialog()} />

      <ArbitraryRotationDialog isOpen={dialogs.isArbitraryRotationOpen}
        onConfirm={(degrees) => gs().rotateCanvas(degrees)}
        onClose={() => gs().closeArbitraryRotationDialog()} />

      <TrimDialog isOpen={dialogs.isTrimOpen}
        onConfirm={(basis, sides) => gs().trimCanvas(basis, sides)} onClose={() => gs().closeTrimDialog()} />

      <ColorPickerDialog isOpen={dialogs.isColorPickerOpen}
        initialColor={dialogs.colorPickerTarget === 'primary' ? gs().primaryColor : dialogs.colorPickerTarget === 'secondary' ? gs().secondaryColor : getEditingStyle().color}
        title={dialogs.colorPickerTarget === 'primary' ? 'Foreground Color' : dialogs.colorPickerTarget === 'secondary' ? 'Background Color' : 'Type Color'}
        onConfirm={(color) => {
          if (dialogs.colorPickerTarget === 'primary') gs().setPrimaryColor(color);
          else if (dialogs.colorPickerTarget === 'secondary') gs().setSecondaryColor(color);
          else updateEditingStyle({ color });
        }}
        onClose={() => gs().closeColorPicker()} />

      <ExportDialog isOpen={dialogs.isExportDialogOpen} onClose={() => gs().closeExportDialog()} />
      <NewDocumentDialog isOpen={dialogs.isNewDocumentDialogOpen} onClose={() => gs().closeNewDocumentDialog()} />
      <RefineEdgeDialog isOpen={dialogs.isRefineEdgeDialogOpen} onClose={() => gs().closeRefineEdgeDialog()} />
      <DefringeDialog isOpen={dialogs.isDefringeDialogOpen} onClose={() => gs().closeDefringeDialog()}
        onConfirm={(width) => gs().defringeLayer(width)} />
      <ScaleEffectsDialog
        isOpen={isScaleEffectsDialogOpen}
        onClose={() => gs().closeScaleEffectsDialog()}
        onConfirm={(scale) => {
          const s = gs();
          if (s.activeLayerId) s.scaleLayerEffects(s.activeLayerId, scale);
        }}
      />
      <SaveSelectionDialog />
      <LoadSelectionDialog />
      <ColorRangeDialog />
      <BorderSelectionDialog />
      <SmoothSelectionDialog />
      <ExpandSelectionDialog />
      <ContractSelectionDialog />
      {isTransformSelectionOpen && (
        <TransformSelectionOverlay zoom={zoom} panX={pan.x} panY={pan.y} onClose={() => gs().closeTransformSelection()} />
      )}
      <ShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <PreferencesDialog isOpen={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
      <NewGuideDialog isOpen={isNewGuideDialogOpen} onClose={() => gs().setNewGuideDialogOpen(false)} />
      <StorageUsageDialog isOpen={storageOpen} onClose={() => setStorageOpen(false)} />
      <StrokePathDialog open={strokePathOpen} onClose={() => setStrokePathOpen(false)} />
      <FillPathDialog open={fillPathOpen} onClose={() => setFillPathOpen(false)} />
      <FadeDialog
        isOpen={fadeDialogOpen}
        snapshot={gs().lastEffect}
        onConfirm={(_opacity, _mode, result) => {
          const s = gs();
          const snap = s.lastEffect;
          if (!snap) return;
          const layer = s.layers.find(l => l.id === snap.layerId);
          if (!layer) return;
          const before = captureLayerRegion(layer, snap.dirtyRect);
          layer.ctx.putImageData(result, snap.dirtyRect.x, snap.dirtyRect.y);
          layer.markDirty(null);
          s.commitHistory(createPixelHistoryAction(layer, snap.dirtyRect, before, `Fade ${snap.label}`));
          useEditorStore.setState(state => ({ layers: [...state.layers] }));
        }}
        onClose={() => setFadeDialogOpen(false)}
      />

      {freeTransform && (
        <FreeTransformOverlay state={freeTransform} zoom={zoom} panX={pan.x} panY={pan.y}
          onCommit={() => {
            // Commit shape transforms via history so the geometry change is undoable.
            const s = gs();
            const layer = s.layers.find(l => l.id === freeTransform.layerId);
            if (layer && layer.kind === 'shape' && freeTransform.shapeDataSnapshot && layer.shapeData) {
              const before = freeTransform.shapeDataSnapshot;
              const after = cloneShapeData(layer.shapeData as ShapeData);
              s.commitHistory({
                kind: 'transform',
                label: 'Free Transform Shape',
                timestamp: Date.now(),
                apply: () => {
                  const l = gs().layers.find(x => x.id === freeTransform.layerId);
                  if (l) { l.shapeData = cloneShapeData(after); rerenderShapeLayer(l); useEditorStore.setState(st => ({ layers: [...st.layers] })); }
                },
                revert: () => {
                  const l = gs().layers.find(x => x.id === freeTransform.layerId);
                  if (l) { l.shapeData = cloneShapeData(before); rerenderShapeLayer(l); useEditorStore.setState(st => ({ layers: [...st.layers] })); }
                },
              });
            }
            setFreeTransform(null);
          }}
          onCancel={() => {
            const s = gs();
            const layer = s.layers.find(l => l.id === freeTransform.layerId);
            if (layer) {
              if (freeTransform.shapeDataSnapshot) {
                layer.shapeData = structuredClone(freeTransform.shapeDataSnapshot);
                rerenderShapeLayer(layer);
              } else {
                layer.ctx.putImageData(freeTransform.snapshot, 0, 0);
                if (freeTransform.typeDataSnapshot) layer.typeData = structuredClone(freeTransform.typeDataSnapshot);
                layer.markDirty(null);
              }
              useEditorStore.setState(state => ({ layers: [...state.layers] }));
            }
            setFreeTransform(null);
          }} />
      )}

      {warpState && (
        <WarpOverlay layerId={warpState.layerId} snapshot={warpState.snapshot} zoom={zoom} panX={pan.x} panY={pan.y}
          onCommit={() => setWarpState(null)}
          onCancel={() => {
            const s = gs();
            const layer = s.layers.find(l => l.id === warpState.layerId);
            if (layer) { layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height); layer.ctx.putImageData(warpState.snapshot, 0, 0); layer.markDirty(null); }
            setWarpState(null);
          }} />
      )}

      {/* Hidden image-ops elements for test harness */}
      <div style={{ display: 'none' }} data-testid="image-ops"
        data-rotate90cw={() => gs().rotateCanvas(90)} data-rotate90ccw={() => gs().rotateCanvas(-90)}
        data-rotate180={() => gs().rotateCanvas(180)} data-fliphorizontal={() => gs().flipCanvas('horizontal')}
        data-flipvertical={() => gs().flipCanvas('vertical')} data-imagesize={() => gs().openImageSizeDialog()}
        data-canvassize={() => gs().openCanvasSizeDialog()} data-rotatearbitrary={() => gs().openArbitraryRotationDialog()}
        data-trim={() => gs().openTrimDialog()} />
    </>
  );
}

export default App;
