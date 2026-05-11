import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { computeMemoryEstimate, formatMemoryMB } from '../../utils/storageEstimate';
import type { ToolId } from '../../store/types';

const TOOL_LABELS: Record<ToolId, string> = {
  move: 'Move',
  brush: 'Brush',
  eraser: 'Eraser',
  select: 'Selection',
  fill: 'Paint Bucket',
  'clone-stamp': 'Clone Stamp',
  gradient: 'Gradient',
  crop: 'Crop',
  'shape-rect': 'Rectangle Shape',
  'shape-circle': 'Ellipse Shape',
  'marquee-rect': 'Rectangular Marquee',
  'marquee-ellipse': 'Elliptical Marquee',
  lasso: 'Lasso',
  'lasso-poly': 'Polygonal Lasso',
  'magic-wand': 'Magic Wand',
  'quick-selection': 'Quick Selection',
  pencil: 'Pencil',
  dodge: 'Dodge',
  burn: 'Burn',
  sponge: 'Sponge',
  pen: 'Pen',
  'freeform-pen': 'Freeform Pen',
  'path-selection': 'Path Selection',
  'direct-selection': 'Direct Selection',
  eyedropper: 'Eyedropper',
  'type-horizontal': 'Horizontal Type',
  'type-vertical': 'Vertical Type',
  hand: 'Hand',
  zoom: 'Zoom',
  'shape-rectangle': 'Rectangle',
  'shape-rounded-rectangle': 'Rounded Rectangle',
  'shape-ellipse': 'Ellipse',
  'shape-polygon': 'Polygon',
  'shape-line': 'Line',
  'shape-custom': 'Custom Shape',
  'magic-eraser': 'Magic Eraser',
  'background-eraser': 'Background Eraser',
  'spot-healing': 'Spot Healing Brush',
  'healing-brush': 'Healing Brush',
  patch: 'Patch',
  'red-eye': 'Red Eye',
};

export function StatusBar() {
  const zoom = useEditorStore(s => s.zoom);
  const width = useEditorStore(s => s.width);
  const height = useEditorStore(s => s.height);
  const layers = useEditorStore(s => s.layers);
  const documentName = useEditorStore(s => s.documentName);
  const isDirty = useEditorStore(s => s.isDirty);
  const activeTool = useEditorStore(s => s.activeTool);
  const pan = useEditorStore(s => s.pan);

  const cursorRef = useRef<HTMLSpanElement>(null);

  // Track cursor in canvas-space using the document canvas geometry. The
  // document is rendered with `transform: translate(pan) scale(zoom)` on a
  // [data-photoweb-document] element; convert client coordinates through that
  // mapping so reported X/Y match the underlying pixel grid.
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!cursorRef.current) return;
      const docEl = document.querySelector('[data-photoweb-document]') as HTMLElement | null;
      if (!docEl) {
        cursorRef.current.textContent = 'X: —  Y: —';
        return;
      }
      const rect = docEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.round(((e.clientX - rect.left) / rect.width) * width);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * height);
      if (x < 0 || y < 0 || x > width || y > height) {
        cursorRef.current.textContent = 'X: —  Y: —';
      } else {
        cursorRef.current.textContent = `X: ${x}  Y: ${y}`;
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
    // pan/zoom are read indirectly via getBoundingClientRect on the rendered doc.
  }, [width, height, pan.x, pan.y, zoom]);

  const pct = Math.round(zoom * 100);
  const visibleLayers = layers.filter(l => l.visible).length;
  // Memory estimate accounts for layers, masks, and undo-history buffers.
  const estimate = computeMemoryEstimate(useEditorStore.getState());
  const docSizeMB = formatMemoryMB(estimate.totalBytes);
  const flatSizeMB = formatMemoryMB(width * height * 4);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoMode, setInfoMode] = useState<'size' | 'layers'>('size');

  const toolLabel = TOOL_LABELS[activeTool] ?? activeTool;

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      backgroundColor: 'hsl(var(--bg-header))',
      borderTop: '1px solid hsl(var(--border-light))',
      padding: '0 8px',
      gap: 12,
      fontSize: 11,
      color: 'hsl(var(--text-muted))',
      userSelect: 'none',
    }}>
      {/* Zoom */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <span style={{ color: 'hsl(var(--text-main))' }}>{pct}%</span>
      </div>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Doc info */}
      <div
        style={{ position: 'relative', cursor: 'default' }}
        onMouseDown={() => setDropdownOpen(o => !o)}
      >
        <span>
          {infoMode === 'size'
            ? `Doc: ${flatSizeMB}M / ${docSizeMB}M`
            : `Layers: ${visibleLayers}/${layers.length}`}
        </span>
        {dropdownOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: 0,
            background: 'hsl(var(--bg-header))',
            border: '1px solid hsl(var(--border-light))',
            padding: '4px 0',
            zIndex: 9000,
            minWidth: 160,
          }}>
            {(['size', 'layers'] as const).map(m => (
              <div key={m}
                onMouseDown={(e) => { e.stopPropagation(); setInfoMode(m); setDropdownOpen(false); }}
                style={{
                  padding: '3px 16px',
                  fontSize: 11,
                  cursor: 'default',
                  background: infoMode === m ? 'hsl(var(--accent-primary))' : 'transparent',
                  color: infoMode === m ? 'white' : 'hsl(var(--text-main))',
                }}
              >
                {m === 'size' ? 'Document Sizes' : 'Layer Count'}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Dimensions */}
      <span>{width} × {height} px</span>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Active tool */}
      <span data-testid="status-active-tool" style={{ color: 'hsl(var(--text-main))' }}>
        {toolLabel}
      </span>

      <div style={{ flex: 1 }} />

      {/* Cursor coordinates */}
      <span ref={cursorRef} data-testid="status-cursor-coords" style={{ fontVariantNumeric: 'tabular-nums', minWidth: 110 }}>
        X: —  Y: —
      </span>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Dirty-state indicator */}
      {isDirty && (
        <span data-testid="dirty-indicator" style={{ color: 'hsl(var(--accent-warning, 38 92% 60%))', fontVariantNumeric: 'tabular-nums' }}>
          ● Unsaved changes
        </span>
      )}

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Document name */}
      <span style={{ color: 'hsl(var(--text-muted))', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {documentName}
      </span>
    </div>
  );
}
