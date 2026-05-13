import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getLastFilter, applyFilterToLayer } from '../../filters/index';
import { requestViewportFit } from '../../utils/viewportFit';
import { copyActiveDocumentForClipboard } from '../../utils/copyImageForClipboard';
import { applyAdjustmentToLayer } from '../../adjustments';
import { createWorkPathFromLayer } from '../../tools/textToPath';
import { convertActiveLayerToShape } from '../../tools/typeCommands';
import { getActivePath } from '../../tools/pen';

// ── Types ─────────────────────────────────────────────────────────────────────
type MI =
  | { k: 'act'; l: string; s?: string; f: () => void; d?: boolean }
  | { k: 'chk'; l: string; s?: string; v: () => boolean; f: () => void }
  | { k: 'sep' }
  | { k: 'sub'; l: string; items: MI[]; d?: boolean };

const sep: MI = { k: 'sep' };
const act = (l: string, f: () => void, s?: string, d?: boolean): MI => ({ k: 'act', l, f, s, d });
const chk = (l: string, v: () => boolean, f: () => void, s?: string): MI => ({ k: 'chk', l, v, f, s });
const sub = (l: string, ...items: MI[]): MI => ({ k: 'sub', l, items });

// ── Props ─────────────────────────────────────────────────────────────────────
interface MenuBarProps {
  onNew: () => void;
  onSaveAs: () => void;
  onFreeTransform: () => void;
  onWarp: () => void;
  onOpenFile: () => void;
  onPlaceEmbedded: () => void;
  onLoadFilesIntoStack: () => void;
}

// ── Sub-menu popup ────────────────────────────────────────────────────────────
interface PopupProps {
  items: MI[];
  x: number;
  y: number;
  onClose: () => void;
  depth?: number;
}

function MenuPopup({ items, x, y, onClose, depth = 0 }: PopupProps) {
  const [subOpen, setSubOpen] = useState<number | null>(null);
  const [subPos, setSubPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  const [clampedX, setClampedX] = useState(x);
  const [clampedY, setClampedY] = useState(y);
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth; const vh = window.innerHeight;
    setClampedX(Math.min(x, vw - rect.width - 4));
    setClampedY(Math.min(y, vh - rect.height - 4));
  }, [x, y]);

  const handleItem = (item: MI, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.k === 'act') { if (!item.d) { item.f(); onClose(); } return; }
    if (item.k === 'chk') { item.f(); onClose(); return; }
    if (item.k === 'sub') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setSubPos({ x: rect.right, y: rect.top });
      setSubOpen(subOpen === idx ? null : idx);
    }
  };

  const handleItemHover = (item: MI, idx: number, e: React.MouseEvent) => {
    if (item.k === 'sub') {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setSubPos({ x: rect.right, y: rect.top });
      setSubOpen(idx);
    } else {
      setSubOpen(null);
    }
  };

  return (
    <div ref={ref} className="ps-menu-dropdown" style={{ left: clampedX, top: clampedY }}>
      {items.map((item, idx) => {
        if (item.k === 'sep') return <div key={idx} className="ps-menu-sep" />;
        const disabled = item.k === 'act' ? !!item.d : item.k === 'sub' ? !!item.d : false;
        const isCheck = item.k === 'chk';
        const checked = isCheck ? item.v() : false;
        return (
          <div
            key={idx}
            className={`ps-menu-item${disabled ? ' disabled' : ''}${subOpen === idx ? ' open' : ''}`}
            onClick={(e) => handleItem(item, idx, e)}
            onMouseEnter={(e) => !disabled && handleItemHover(item, idx, e)}
          >
            {isCheck && <span className="check">{checked ? <Check size={12} /> : ''}</span>}
            <span>{item.l}</span>
            {item.k === 'act' && item.s && <span className="shortcut">{item.s}</span>}
            {item.k === 'chk' && item.s && <span className="shortcut">{item.s}</span>}
            {item.k === 'sub' && <span className="arrow"><ChevronRight size={12} /></span>}
            {item.k === 'sub' && subOpen === idx && (
              <MenuPopup items={item.items} x={subPos.x} y={subPos.y} onClose={onClose} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── MenuBar ───────────────────────────────────────────────────────────────────
export function MenuBar({ onNew, onSaveAs, onFreeTransform, onWarp, onOpenFile, onPlaceEmbedded, onLoadFilesIntoStack }: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const barRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!openMenu) return;
    const handle = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [openMenu]);

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  const openFilter = useCallback((id: string, defaults: Record<string, unknown>) => {
    useEditorStore.getState().openFilterDialog(id, defaults);
  }, []);

  const openAdjustment = useCallback((id: string) => {
    useEditorStore.getState().openAdjustmentDialog(id, {});
  }, []);

  const applyDirectAdjustment = useCallback((id: string) => {
    const store = useEditorStore.getState();
    const layer = store.layers.find(l => l.id === store.activeLayerId);
    if (!layer) return;
    applyAdjustmentToLayer(layer, id, {}, store.selection);
  }, []);

  // ── Menu definitions ───────────────────────────────────────────────────────
  const menus: Record<string, MI[]> = {
    File: [
      act('New…', onNew, '⌘N'),
      act('Open…', onOpenFile, '⌘O'),
      act('Place Embedded…', onPlaceEmbedded),
      sub('Scripts',
        act('Load Files into Stack…', onLoadFilesIntoStack),
      ),
      sep,
      act('Save', () => {
        const s = useEditorStore.getState();
        s.saveFile(s.documentName).then(() => s.addToast(`Saved "${s.documentName}"`, 'success')).catch(() => s.addToast('Save failed', 'error'));
      }, '⌘S'),
      act('Save As…', onSaveAs, '⌘⇧S'),
      sep,
      act('Export As…', () => useEditorStore.getState().openExportDialog(), '⌘⇧⌥E'),
      act('Quick Export as PNG', () => {
        const s = useEditorStore.getState();
        const c = document.createElement('canvas'); c.width = s.width; c.height = s.height;
        const ctx = c.getContext('2d')!;
        s.layers.forEach(l => { if (l.visible) { ctx.globalAlpha = l.opacity; ctx.globalCompositeOperation = l.blendMode; ctx.drawImage(l.canvas, 0, 0); } });
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        c.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'export.png'; a.click(); URL.revokeObjectURL(u); }, 'image/png');
        s.addToast('PNG exported', 'success');
      }, '⌘⇧⌥S'),
      sep,
      act('Revert', () => useEditorStore.getState().loadFile(useEditorStore.getState().documentName).catch(() => {})),
    ],

    Edit: [
      act('Undo', () => useEditorStore.getState().undo(), '⌘Z'),
      act('Redo', () => useEditorStore.getState().redo(), '⌘⇧Z'),
      sep,
      (() => {
        const last = useEditorStore.getState().lastEffect;
        return act(
          last ? `Fade ${last.label}` : 'Fade',
          () => { window.dispatchEvent(new Event('photoweb:open-fade')); },
          '⌘⇧F',
          !last,
        );
      })(),
      sep,
      act('Cut', () => document.execCommand('cut'), '⌘X'),
      act('Copy', () => copyActiveDocumentForClipboard(useEditorStore.getState()), '⌘C'),
      act('Copy Merged', () => {}, '⌘⇧C', true),
      act('Paste', () => document.execCommand('paste'), '⌘V'),
      act('Paste in Place', () => {}, '⌘⇧V', true),
      sep,
      act('Fill…', () => {}, '⇧F5', true),
      act('Stroke…', () => {}, undefined, true),
      sep,
      act('Stroke Path…', () => {
        window.dispatchEvent(new Event('photoweb:open-stroke-path'));
      }, undefined, !getActivePath()),
      act('Fill Path…', () => {
        window.dispatchEvent(new Event('photoweb:open-fill-path'));
      }, undefined, !getActivePath()),
      sep,
      act('Free Transform', onFreeTransform, '⌘T'),
      sub('Transform',
        act('Scale', () => {}, undefined, true),
        act('Rotate', () => {}, undefined, true),
        act('Skew', () => {}, undefined, true),
        act('Distort', () => {}, undefined, true),
        act('Perspective', () => {}, undefined, true),
        sep,
        act('Warp', onWarp),
        sep,
        act('Rotate 180°', () => useEditorStore.getState().rotateCanvas(180)),
        act('Rotate 90° Clockwise', () => useEditorStore.getState().rotateCanvas(90)),
        act('Rotate 90° Counter Clockwise', () => useEditorStore.getState().rotateCanvas(-90)),
        act('Flip Horizontal', () => useEditorStore.getState().flipCanvas('horizontal')),
        act('Flip Vertical', () => useEditorStore.getState().flipCanvas('vertical')),
      ),
      sep,
      act('Define Brush Preset…', () => {
        const name = window.prompt('Brush preset name', 'New Brush Preset');
        if (name) useEditorStore.getState().saveBrushPreset(name);
      }),
      act('Define Pattern…', () => {
        const store = useEditorStore.getState();
        const layer = store.layers.find(l => l.id === store.activeLayerId);
        if (!layer) return;
        const name = window.prompt('Pattern name', 'New Pattern');
        if (!name) return;
        const sel = store.selection;
        const hasSel = sel.hasSelection && (sel.operations.length > 0 || sel.path.length > 1);
        if (hasSel) {
            let minX = layer.canvas.width, minY = layer.canvas.height, maxX = 0, maxY = 0;
            for (const op of sel.operations) {
                if (op.type === 'rect' && op.path.length === 2) {
                    const [a, b] = op.path;
                    minX = Math.min(minX, Math.floor(Math.min(a.x, b.x)));
                    minY = Math.min(minY, Math.floor(Math.min(a.y, b.y)));
                    maxX = Math.max(maxX, Math.ceil(Math.max(a.x, b.x)));
                    maxY = Math.max(maxY, Math.ceil(Math.max(a.y, b.y)));
                } else {
                    for (const p of op.path) {
                        minX = Math.min(minX, Math.floor(p.x));
                        minY = Math.min(minY, Math.floor(p.y));
                        maxX = Math.max(maxX, Math.ceil(p.x));
                        maxY = Math.max(maxY, Math.ceil(p.y));
                    }
                }
            }
            minX = Math.max(0, minX); minY = Math.max(0, minY);
            maxX = Math.min(layer.canvas.width, maxX);
            maxY = Math.min(layer.canvas.height, maxY);
            const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            c.getContext('2d')!.drawImage(layer.canvas, minX, minY, w, h, 0, 0, w, h);
            store.definePattern(name, c);
        } else {
            store.definePattern(name, layer.canvas);
        }
      }),
      sep,
      sub('Preferences',
        act('General…', () => window.dispatchEvent(new Event('photoweb:open-preferences'))),
        act('Storage Usage…', () => window.dispatchEvent(new Event('photoweb:open-storage-usage'))),
      ),
    ],

    Image: [
      sub('Mode',
        act('Bitmap', () => {}, undefined, true),
        act('Grayscale', () => {}, undefined, true),
        act('RGB Color', () => {}),
        act('CMYK Color', () => {}, undefined, true),
        act('Lab Color', () => {}, undefined, true),
        act('Multichannel', () => {}, undefined, true),
        sep,
        act('8 Bits/Channel', () => {}),
        act('16 Bits/Channel', () => {}, undefined, true),
        act('32 Bits/Channel', () => {}, undefined, true),
      ),
      sep,
      sub('New Adjustment Layer',
        act('Brightness/Contrast', () => useEditorStore.getState().addAdjustmentLayer('brightness-contrast')),
        act('Levels', () => useEditorStore.getState().addAdjustmentLayer('levels')),
        act('Curves', () => useEditorStore.getState().addAdjustmentLayer('curves')),
        act('Exposure', () => useEditorStore.getState().addAdjustmentLayer('exposure')),
        sep,
        act('Vibrance', () => useEditorStore.getState().addAdjustmentLayer('vibrance')),
        act('Hue/Saturation', () => useEditorStore.getState().addAdjustmentLayer('hue-saturation')),
        act('Color Balance', () => useEditorStore.getState().addAdjustmentLayer('color-balance')),
        act('Black & White', () => useEditorStore.getState().addAdjustmentLayer('black-and-white')),
        act('Photo Filter', () => useEditorStore.getState().addAdjustmentLayer('photo-filter')),
        act('Channel Mixer', () => useEditorStore.getState().addAdjustmentLayer('channel-mixer')),
        act('Selective Color', () => useEditorStore.getState().addAdjustmentLayer('selective-color')),
        act('Gradient Map', () => useEditorStore.getState().addAdjustmentLayer('gradient-map')),
        sep,
        act('Invert', () => useEditorStore.getState().addAdjustmentLayer('invert')),
        act('Posterize', () => useEditorStore.getState().addAdjustmentLayer('posterize')),
        act('Threshold', () => useEditorStore.getState().addAdjustmentLayer('threshold')),
      ),
      sub('Adjustments',
        act('Brightness/Contrast…', () => openAdjustment('brightness-contrast')),
        act('Levels…', () => openAdjustment('levels'), '⌘L'),
        act('Curves…', () => openAdjustment('curves'), '⌘M'),
        act('Exposure…', () => openAdjustment('exposure')),
        sep,
        act('Vibrance…', () => openAdjustment('vibrance')),
        act('Hue/Saturation…', () => openAdjustment('hue-saturation'), '⌘U'),
        act('Color Balance…', () => openAdjustment('color-balance'), '⌘B'),
        act('Black & White…', () => openAdjustment('black-and-white'), '⌘⌥⇧B'),
        act('Photo Filter…', () => openAdjustment('photo-filter')),
        act('Channel Mixer…', () => openAdjustment('channel-mixer')),
        act('Selective Color…', () => openAdjustment('selective-color')),
        act('Gradient Map…', () => openAdjustment('gradient-map')),
        sep,
        act('Invert', () => applyDirectAdjustment('invert'), '⌘I'),
        act('Posterize…', () => openAdjustment('posterize')),
        act('Threshold…', () => openAdjustment('threshold')),
        sep,
        act('Desaturate', () => applyDirectAdjustment('desaturate'), '⌘⇧U'),
        act('Auto Tone', () => applyDirectAdjustment('auto-tone'), '⌘⇧L'),
        act('Auto Contrast', () => applyDirectAdjustment('auto-contrast'), '⌘⌥⇧L'),
        act('Auto Color', () => applyDirectAdjustment('auto-color'), '⌘⇧B'),
      ),
      sep,
      act('Image Size…', () => useEditorStore.getState().openImageSizeDialog(), '⌘⌥I'),
      act('Canvas Size…', () => useEditorStore.getState().openCanvasSizeDialog(), '⌘⌥C'),
      sub('Image Rotation',
        act('180°', () => useEditorStore.getState().rotateCanvas(180)),
        act('90° Clockwise', () => useEditorStore.getState().rotateCanvas(90)),
        act('90° Counter Clockwise', () => useEditorStore.getState().rotateCanvas(-90)),
        act('Arbitrary…', () => {}, undefined, true),
        sep,
        act('Flip Canvas Horizontal', () => useEditorStore.getState().flipCanvas('horizontal')),
        act('Flip Canvas Vertical', () => useEditorStore.getState().flipCanvas('vertical')),
      ),
      act('Crop', () => {}, undefined, true),
      act('Trim…', () => useEditorStore.getState().openTrimDialog()),
    ],

    Layer: [
      sub('New',
        act('Layer…', () => useEditorStore.getState().addLayer(), '⌘⇧N'),
        act('Layer from Background…', () => {}, undefined, true),
        sep,
        act('Group…', () => useEditorStore.getState().createLayerGroup()),
        act('Group from Layers…', () => {
          const s = useEditorStore.getState();
          if (s.selectedLayerIds.length > 1) s.groupLayers(s.selectedLayerIds);
        }),
        sep,
        act('Solid Color…', () => useEditorStore.getState().addFillLayer({ kind: 'solid-color', color: '#ffffff' })),
        act('Gradient…', () => useEditorStore.getState().addFillLayer({ kind: 'gradient', type: 'linear', angle: 0, stops: [{ position: 0, color: '#000000', opacity: 1 }, { position: 1, color: '#ffffff', opacity: 1 }] })),
      ),
      act('Duplicate Layer…', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.duplicateLayer(s.activeLayerId); }, '⌘J'),
      sub('Delete',
        act('Layer', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.removeLayer(s.activeLayerId); }),
        act('Hidden Layers', () => {}, undefined, true),
      ),
      sep,
      act('Export As…', () => useEditorStore.getState().openExportDialog()),
      act('Quick Export as PNG', () => {}),
      sep,
      sub('New Fill Layer',
        act('Solid Color…', () => useEditorStore.getState().addFillLayer({ kind: 'solid-color', color: '#ffffff' })),
        act('Gradient…', () => useEditorStore.getState().addFillLayer({ kind: 'gradient', type: 'linear', angle: 0, stops: [{ position: 0, color: '#000000', opacity: 1 }, { position: 1, color: '#ffffff', opacity: 1 }] })),
      ),
      sub('New Adjustment Layer',
        act('Brightness/Contrast…', () => useEditorStore.getState().addAdjustmentLayer('brightness-contrast', {})),
        act('Levels…', () => useEditorStore.getState().addAdjustmentLayer('levels', {})),
        act('Curves…', () => useEditorStore.getState().addAdjustmentLayer('curves', {})),
        act('Exposure…', () => useEditorStore.getState().addAdjustmentLayer('exposure', {})),
        sep,
        act('Vibrance…', () => useEditorStore.getState().addAdjustmentLayer('vibrance', {})),
        act('Hue/Saturation…', () => useEditorStore.getState().addAdjustmentLayer('hue-saturation', {})),
        act('Color Balance…', () => useEditorStore.getState().addAdjustmentLayer('color-balance', {})),
        act('Black & White…', () => useEditorStore.getState().addAdjustmentLayer('black-and-white', {})),
        act('Photo Filter…', () => useEditorStore.getState().addAdjustmentLayer('photo-filter', {})),
        act('Channel Mixer…', () => useEditorStore.getState().addAdjustmentLayer('channel-mixer', {})),
        act('Selective Color…', () => useEditorStore.getState().addAdjustmentLayer('selective-color', {})),
        act('Gradient Map…', () => useEditorStore.getState().addAdjustmentLayer('gradient-map', {})),
        sep,
        act('Invert', () => useEditorStore.getState().addAdjustmentLayer('invert', {})),
        act('Posterize…', () => useEditorStore.getState().addAdjustmentLayer('posterize', {})),
        act('Threshold…', () => useEditorStore.getState().addAdjustmentLayer('threshold', {})),
      ),
      sep,
      sub('Layer Style',
        act('Copy Layer Style', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.copyLayerStyle(s.activeLayerId); }),
        act('Paste Layer Style', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.pasteLayerStyle(s.activeLayerId); }),
        act('Clear Layer Style', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.clearLayerStyle(s.activeLayerId); }),
        sep,
        act('Scale Effects…', () => useEditorStore.getState().openScaleEffectsDialog()),
      ),
      sep,
      sub('Layer Mask',
        act('Reveal All', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.addLayerMask(s.activeLayerId, 'reveal-all'); }),
        act('Hide All', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.addLayerMask(s.activeLayerId, 'hide-all'); }),
        act('Reveal Selection', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.addLayerMaskFromSelection(s.activeLayerId, 'reveal'); }),
        act('Hide Selection', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.addLayerMaskFromSelection(s.activeLayerId, 'hide'); }),
        sep,
        act('Disable', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.setLayerMaskEnabled(s.activeLayerId, false); }),
        act('Apply', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.applyLayerMask(s.activeLayerId); }),
        act('Delete', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.removeLayerMask(s.activeLayerId); }),
      ),
      sep,
      sub('Matting',
        act('Defringe…', () => useEditorStore.getState().openDefringeDialog()),
        act('Remove White Matte', () => useEditorStore.getState().removeWhiteMatte()),
        act('Remove Black Matte', () => useEditorStore.getState().removeBlackMatte()),
      ),
      sep,
      sub('Arrange',
        act('Bring to Front', () => {}, undefined, true),
        act('Bring Forward', () => {}, undefined, true),
        act('Send Backward', () => {}, undefined, true),
        act('Send to Back', () => {}, undefined, true),
      ),
      sub('Align',
        act('Left Edges', () => useEditorStore.getState().alignSelectedLayers('left')),
        act('Horizontal Centers', () => useEditorStore.getState().alignSelectedLayers('horizontal-center')),
        act('Right Edges', () => useEditorStore.getState().alignSelectedLayers('right')),
        sep,
        act('Top Edges', () => useEditorStore.getState().alignSelectedLayers('top')),
        act('Vertical Centers', () => useEditorStore.getState().alignSelectedLayers('vertical-center')),
        act('Bottom Edges', () => useEditorStore.getState().alignSelectedLayers('bottom')),
      ),
      sub('Distribute',
        act('Left Edges', () => useEditorStore.getState().distributeSelectedLayers('left')),
        act('Horizontal Centers', () => useEditorStore.getState().distributeSelectedLayers('horizontal-center')),
        act('Right Edges', () => useEditorStore.getState().distributeSelectedLayers('right')),
        sep,
        act('Top Edges', () => useEditorStore.getState().distributeSelectedLayers('top')),
        act('Vertical Centers', () => useEditorStore.getState().distributeSelectedLayers('vertical-center')),
        act('Bottom Edges', () => useEditorStore.getState().distributeSelectedLayers('bottom')),
      ),
      sep,
      act('Merge Down', () => { const s = useEditorStore.getState(); if (s.activeLayerId) s.mergeLayerDown(s.activeLayerId); }, '⌘E'),
      act('Merge Visible', () => useEditorStore.getState().mergeVisible(), '⌘⇧E'),
      act('Stamp Visible', () => useEditorStore.getState().stampVisible(), '⌘⌥⇧E'),
      act('Flatten Image', () => useEditorStore.getState().flattenImage()),
    ],

    Type: [
      sub('Panels',
        act('Character', () => {}, undefined, true),
        act('Paragraph', () => {}, undefined, true),
      ),
      sep,
      sub('Orientation',
        act('Horizontal', () => useEditorStore.getState().setTool('type-horizontal')),
        act('Vertical', () => useEditorStore.getState().setTool('type-vertical')),
      ),
      sep,
      act('Create Work Path', () => {
        const s = useEditorStore.getState();
        const layer = s.layers.find(l => l.id === s.activeLayerId);
        if (!layer) return;
        const added = createWorkPathFromLayer(layer);
        window.dispatchEvent(new Event('photoweb:paths-changed'));
        if (added === 0) window.alert('Could not trace any path from this layer.');
      }),
      act('Convert to Shape', () => {
        convertActiveLayerToShape();
      }),
      act('Rasterize Type Layer', () => {
        const s = useEditorStore.getState();
        if (s.activeLayerId) s.rasterizeTypeLayer(s.activeLayerId);
      }),
    ],

    Select: [
      act('All', () => {
        const s = useEditorStore.getState();
        s.setHasSelection(true);
        s.setSelectionOperations([{ mode: 'add', type: 'rect', path: [{ x: 0, y: 0 }, { x: s.width, y: s.height }] }]);
      }, '⌘A'),
      act('Deselect', () => useEditorStore.getState().clearSelection(), '⌘D'),
      act('Reselect', () => {}, '⌘⇧D', true),
      act('Inverse', () => useEditorStore.getState().toggleInvertSelection(), '⌘⇧I'),
      sep,
      act('All Layers', () => {}, '⌘⌥A', true),
      act('Deselect Layers', () => {}, undefined, true),
      act('Find Layers…', () => {}, '⌘⌥F', true),
      sep,
      act('Color Range…', () => useEditorStore.getState().openColorRangeDialog()),
      sep,
      act('Select and Mask…', () => useEditorStore.getState().openRefineEdgeDialog(), '⌘⌥R'),
      sep,
      sub('Modify',
        act('Border…', () => useEditorStore.getState().openBorderSelectionDialog()),
        act('Smooth…', () => useEditorStore.getState().openSmoothSelectionDialog()),
        act('Expand…', () => useEditorStore.getState().openExpandSelectionDialog()),
        act('Contract…', () => useEditorStore.getState().openContractSelectionDialog()),
        act('Feather…', () => useEditorStore.getState().setFeatherDialogOpen(true), '⇧F6'),
      ),
      act('Grow', () => useEditorStore.getState().growSelection()),
      act('Similar', () => useEditorStore.getState().similarSelection()),
      sep,
      act('Transform Selection', () => useEditorStore.getState().openTransformSelection()),
      chk('Edit in Quick Mask Mode', () => useEditorStore.getState().quickMaskMode, () => {
        const s = useEditorStore.getState(); s.setQuickMaskMode(!s.quickMaskMode);
      }, 'Q'),
      sep,
      act('Load Selection…', () => useEditorStore.getState().openLoadSelectionDialog()),
      act('Save Selection…', () => useEditorStore.getState().openSaveSelectionDialog()),
    ],

    Filter: [
      act('Last Filter', () => {
        const last = getLastFilter();
        if (!last) return;
        const s = useEditorStore.getState();
        const layer = s.layers.find(l => l.id === s.activeLayerId);
        if (layer) applyFilterToLayer(layer, last.id, last.params, s.selection);
      }, '⌘F', !getLastFilter()),
      act('Last Filter with Dialog…', () => {
        const last = getLastFilter();
        if (last) useEditorStore.getState().openFilterDialog(last.id, last.params);
      }, '⌘⌥F', !getLastFilter()),
      sep,
      sub('Blur',
        act('Gaussian Blur…', () => openFilter('blur-gaussian', { radius: 3 })),
        act('Box Blur…', () => openFilter('blur-box', { radius: 3 })),
        act('Motion Blur…', () => openFilter('blur-motion', { angle: 0, distance: 10 })),
        act('Surface Blur…', () => openFilter('blur-surface', { radius: 5, threshold: 15 })),
      ),
      sub('Sharpen',
        act('Unsharp Mask…', () => openFilter('sharpen-unsharp', { amount: 50, radius: 1, threshold: 0 })),
        act('Smart Sharpen…', () => openFilter('sharpen-smart', { amount: 100, radius: 1 })),
      ),
      sub('Noise',
        act('Add Noise…', () => openFilter('noise-add', { amount: 25, monochromatic: false })),
        act('Reduce Noise…', () => openFilter('noise-reduce', { strength: 6, preserveDetails: 50, reduceColorNoise: 50, sharpenDetails: 25 })),
        act('Median…', () => openFilter('noise-median', { radius: 2 })),
        act('Dust & Scratches…', () => openFilter('noise-dust-scratches', { radius: 4, threshold: 30 })),
        act('Despeckle', () => { const s = useEditorStore.getState(); const l = s.layers.find(x => x.id === s.activeLayerId); if (l) applyFilterToLayer(l, 'noise-despeckle', {}, s.selection); }),
      ),
      sub('Distort',
        act('Pinch…', () => openFilter('distort-pinch', { amount: 50 })),
        act('Spherize…', () => openFilter('distort-spherize', { amount: 50, mode: 'normal' })),
      ),
      sub('Stylize',
        act('Find Edges', () => { const s = useEditorStore.getState(); const l = s.layers.find(x => x.id === s.activeLayerId); if (l) applyFilterToLayer(l, 'stylize-find-edges', {}, s.selection); }),
        act('Emboss…', () => openFilter('stylize-emboss', { angle: -45, height: 3, amount: 100 })),
      ),
      sub('Render',
        act('Lens Flare…', () => openFilter('render-lens-flare', { brightness: 100, lensType: '105mm' })),
      ),
      sub('Other',
        act('High Pass…', () => openFilter('other-high-pass', { radius: 3 })),
      ),
    ],

    View: [
      act('Zoom In', () => { const s = useEditorStore.getState(); s.setZoom(Math.min(s.zoom * 1.25, 32)); }, '⌘+'),
      act('Zoom Out', () => { const s = useEditorStore.getState(); s.setZoom(Math.max(s.zoom / 1.25, 0.02)); }, '⌘-'),
      act('Fit on Screen', requestViewportFit, '⌘0'),
      act('100%', () => { useEditorStore.getState().setZoom(1); }, '⌘1'),
      sep,
      sub('Screen Mode',
        chk('Standard Screen Mode', () => useEditorStore.getState().screenMode === 'standard', () => useEditorStore.getState().setScreenMode('standard'), 'F'),
        chk('Full Screen Mode With Menu Bar', () => useEditorStore.getState().screenMode === 'full-with-menu', () => useEditorStore.getState().setScreenMode('full-with-menu'), 'F'),
        chk('Full Screen Mode', () => useEditorStore.getState().screenMode === 'full', () => useEditorStore.getState().setScreenMode('full'), 'F'),
      ),
      sep,
      sub('Show',
        chk('Rulers', () => useEditorStore.getState().showRulers, () => { const s = useEditorStore.getState(); s.setShowRulers(!s.showRulers); }, '⌘R'),
        chk('Grid', () => useEditorStore.getState().showGrid, () => { const s = useEditorStore.getState(); s.setShowGrid(!s.showGrid); }, "⌘'"),
        chk('Guides', () => useEditorStore.getState().showGuides, () => { const s = useEditorStore.getState(); s.setShowGuides(!s.showGuides); }, '⌘;'),
        chk('Selection Edges', () => useEditorStore.getState().showSelectionEdges, () => { const s = useEditorStore.getState(); s.setShowSelectionEdges(!s.showSelectionEdges); }, '⌘H'),
        chk('Snap', () => useEditorStore.getState().snapEnabled, () => { const s = useEditorStore.getState(); s.setSnapEnabled(!s.snapEnabled); }, '⌘⇧;'),
      ),
      sep,
      chk('Rulers', () => useEditorStore.getState().showRulers, () => { const s = useEditorStore.getState(); s.setShowRulers(!s.showRulers); }, '⌘R'),
      chk('Snap', () => useEditorStore.getState().snapEnabled, () => { const s = useEditorStore.getState(); s.setSnapEnabled(!s.snapEnabled); }, '⌘⇧;'),
      sub('Snap To',
        act('Guides', () => {}, undefined, true),
        act('Grid', () => {}, undefined, true),
        act('Layers', () => {}, undefined, true),
        act('Slices', () => {}, undefined, true),
        act('Document Bounds', () => {}),
      ),
      sep,
      sub('Guides',
        act('New Guide…', () => useEditorStore.getState().setNewGuideDialogOpen(true)),
        act('New Horizontal Guide', () => {
          const s = useEditorStore.getState();
          s.addGuideWithHistory('horizontal', Math.round(s.height / 2));
        }),
        act('New Vertical Guide', () => {
          const s = useEditorStore.getState();
          s.addGuideWithHistory('vertical', Math.round(s.width / 2));
        }),
        sep,
        chk('Lock Guides', () => useEditorStore.getState().guidesLocked, () => { const s = useEditorStore.getState(); s.setGuidesLocked(!s.guidesLocked); }, '⌘⌥;'),
        act('Clear Guides', () => useEditorStore.getState().clearGuidesWithHistory()),
      ),
    ],

    Window: [
      chk('History', () => useEditorStore.getState().panelVisibility.history, () => useEditorStore.getState().togglePanelVisibility('history')),
      chk('Layers', () => useEditorStore.getState().panelVisibility.layers, () => useEditorStore.getState().togglePanelVisibility('layers'), 'F7'),
      chk('Channels', () => useEditorStore.getState().panelVisibility.channels, () => useEditorStore.getState().togglePanelVisibility('channels')),
      chk('Paths', () => useEditorStore.getState().panelVisibility.paths, () => useEditorStore.getState().togglePanelVisibility('paths')),
      sep,
      chk('Color', () => useEditorStore.getState().panelVisibility.color, () => useEditorStore.getState().togglePanelVisibility('color'), 'F6'),
      chk('Swatches', () => useEditorStore.getState().panelVisibility.swatches, () => useEditorStore.getState().togglePanelVisibility('swatches')),
      chk('Adjustments', () => useEditorStore.getState().panelVisibility.adjustments, () => useEditorStore.getState().togglePanelVisibility('adjustments')),
      sep,
      chk('Character', () => useEditorStore.getState().panelVisibility.character, () => useEditorStore.getState().togglePanelVisibility('character')),
      chk('Paragraph', () => useEditorStore.getState().panelVisibility.paragraph, () => useEditorStore.getState().togglePanelVisibility('paragraph')),
      sep,
      chk('Properties', () => useEditorStore.getState().panelVisibility.properties, () => useEditorStore.getState().togglePanelVisibility('properties')),
      chk('Navigator', () => useEditorStore.getState().panelVisibility.navigator, () => useEditorStore.getState().togglePanelVisibility('navigator')),
      chk('Info', () => useEditorStore.getState().panelVisibility.info, () => useEditorStore.getState().togglePanelVisibility('info'), 'F8'),
      chk('Brush Presets', () => useEditorStore.getState().panelVisibility['brush-presets'], () => useEditorStore.getState().togglePanelVisibility('brush-presets'), 'F5'),
      sep,
      act('Tools', () => {}),
    ],

    Help: [
      act('Photoshop Help…', () => {}, 'F1', true),
      sep,
      act('About Photoshop', () => {}),
    ],
  };

  const menuNames = Object.keys(menus);

  const handleMenuClick = (name: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom });
    setOpenMenu(prev => prev === name ? null : name);
  };

  const handleMenuHover = (name: string, e: React.MouseEvent) => {
    if (!openMenu || openMenu === name) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.left, y: rect.bottom });
    setOpenMenu(name);
  };

  return (
    <div ref={barRef} style={{
      display: 'flex',
      alignItems: 'stretch',
      height: '100%',
      backgroundColor: 'hsl(var(--bg-header))',
      borderBottom: '1px solid hsl(var(--border-light))',
      position: 'relative',
      zIndex: 9100,
    }}>
      {menuNames.map(name => (
        <div
          key={name}
          onMouseDown={(e) => handleMenuClick(name, e)}
          onMouseEnter={(e) => handleMenuHover(name, e)}
          style={{
            padding: '0 8px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            cursor: 'default',
            color: openMenu === name ? 'white' : 'hsl(var(--text-main))',
            backgroundColor: openMenu === name ? 'hsl(var(--accent-primary))' : 'transparent',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
      ))}

      {openMenu && menus[openMenu] && (
        <MenuPopup
          items={menus[openMenu]}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setOpenMenu(null)}
        />
      )}
    </div>
  );
}
