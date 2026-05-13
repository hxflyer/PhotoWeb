import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { computeMemoryEstimate, formatMemoryMB } from '../../utils/storageEstimate';
import type { StatusBarInfoMode, ToolId } from '../../store/types';

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
  ruler: 'Ruler',
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

const INFO_MODES: { id: StatusBarInfoMode; label: string }[] = [
  { id: 'documentSizes', label: 'Document Sizes' },
  { id: 'documentProfile', label: 'Document Profile' },
  { id: 'documentDimensions', label: 'Document Dimensions' },
  { id: 'currentTool', label: 'Current Tool' },
  { id: 'layerCount', label: 'Layer Count' },
];

// Photoshop's press-and-hold popover threshold. ~150ms feels like a hold,
// shorter feels like an accidental click.
const HOLD_DELAY_MS = 150;
const HOLD_CANCEL_PX = 4;

/**
 * Editable zoom-percent readout with Ctrl/Cmd-hover scrubby slider.
 * Click to type a new value (Enter commits, Esc reverts); Ctrl/Cmd-drag
 * scrubs the zoom exponentially.
 */
function ZoomDisplay({ zoom, pct }: { zoom: number; pct: number }) {
    const [editing, setEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const dragRef = useRef<{ startX: number; startZoom: number } | null>(null);

    function commit(raw: string) {
        const cleaned = raw.replace(/%/g, '').trim();
        const n = Number(cleaned);
        if (!Number.isFinite(n) || n <= 0) {
            setEditing(false);
            return;
        }
        const z = Math.max(0.05, Math.min(32, n / 100));
        useEditorStore.getState().setZoom(z);
        setEditing(false);
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const next = Math.max(0.05, Math.min(32, dragRef.current.startZoom * Math.exp(dx * 0.005)));
        useEditorStore.getState().setZoom(next);
    }
    function onMouseUp() {
        dragRef.current = null;
        document.removeEventListener('mousemove', onMouseMoveDoc);
        document.removeEventListener('mouseup', onMouseUp);
    }
    function onMouseMoveDoc(e: MouseEvent) {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const next = Math.max(0.05, Math.min(32, dragRef.current.startZoom * Math.exp(dx * 0.005)));
        useEditorStore.getState().setZoom(next);
    }

    function onMouseDown(e: React.MouseEvent) {
        if (e.button !== 0) return;
        if (!(e.metaKey || e.ctrlKey)) return;
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startZoom: zoom };
        document.addEventListener('mousemove', onMouseMoveDoc);
        document.addEventListener('mouseup', onMouseUp);
    }

    return (
        <div
            data-testid="statusbar-zoom"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'default',
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
        >
            {editing ? (
                <input
                    data-testid="statusbar-zoom-input"
                    autoFocus
                    defaultValue={inputValue}
                    onBlur={(e) => commit(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); commit((e.target as HTMLInputElement).value); }
                        else if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
                    }}
                    style={{
                        background: 'hsl(var(--bg-input))',
                        border: '1px solid hsl(var(--accent-primary))',
                        color: 'hsl(var(--text-main))',
                        width: 44,
                        fontSize: 11,
                        padding: '1px 4px',
                        borderRadius: 2,
                    }}
                />
            ) : (
                <span
                    data-testid="statusbar-zoom-pct"
                    onClick={(e) => {
                        if (e.metaKey || e.ctrlKey) return; // Ctrl-click reserved for scrubby
                        setInputValue(String(pct));
                        setEditing(true);
                    }}
                    style={{ color: 'hsl(var(--text-main))', cursor: 'text' }}
                    title="Click to set zoom · Cmd/Ctrl-drag to scrub"
                >
                    {pct}%
                </span>
            )}
        </div>
    );
}

export function StatusBar() {
  const zoom = useEditorStore(s => s.zoom);
  const width = useEditorStore(s => s.width);
  const height = useEditorStore(s => s.height);
  const resolution = useEditorStore(s => s.resolution);
  const layers = useEditorStore(s => s.layers);
  const documentName = useEditorStore(s => s.documentName);
  const isDirty = useEditorStore(s => s.isDirty);
  const activeTool = useEditorStore(s => s.activeTool);
  const pan = useEditorStore(s => s.pan);
  const infoMode = useEditorStore(s => s.statusBarInfoMode);
  const setInfoMode = useEditorStore(s => s.setStatusBarInfoMode);

  const cursorRef = useRef<HTMLSpanElement>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const infoFieldRef = useRef<HTMLDivElement | null>(null);

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

  // Close the info-mode menu on Esc or outside-click.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
      }
    };
    const onDown = (e: MouseEvent) => {
      if (!infoFieldRef.current) return;
      if (infoFieldRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [menuOpen]);

  function startHold(e: React.MouseEvent) {
    if (e.button !== 0) return;
    holdAnchorRef.current = { x: e.clientX, y: e.clientY };
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(() => {
      setPopoverOpen(true);
      holdTimerRef.current = null;
    }, HOLD_DELAY_MS);
  }

  function moveHold(e: React.MouseEvent) {
    const anchor = holdAnchorRef.current;
    if (!anchor) return;
    const dx = e.clientX - anchor.x;
    const dy = e.clientY - anchor.y;
    if (dx * dx + dy * dy > HOLD_CANCEL_PX * HOLD_CANCEL_PX) {
      // Drag detected: cancel the pending hold without showing popover.
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setPopoverOpen(false);
      holdAnchorRef.current = null;
    }
  }

  function endHold() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdAnchorRef.current = null;
    setPopoverOpen(false);
  }

  const pct = Math.round(zoom * 100);
  const visibleLayers = layers.filter(l => l.visible).length;
  const estimate = computeMemoryEstimate(useEditorStore.getState());
  const docSizeMB = formatMemoryMB(estimate.totalBytes);
  const flatSizeMB = formatMemoryMB(width * height * 4);
  const toolLabel = TOOL_LABELS[activeTool] ?? activeTool;

  let infoText: string;
  switch (infoMode) {
    case 'documentProfile':
      infoText = 'sRGB IEC61966-2.1 (8bpc)';
      break;
    case 'documentDimensions':
      infoText = `${width} px × ${height} px (${resolution} ppi)`;
      break;
    case 'currentTool':
      infoText = toolLabel;
      break;
    case 'layerCount':
      infoText = `Layers: ${visibleLayers}/${layers.length}`;
      break;
    case 'documentSizes':
    default:
      infoText = `Doc: ${flatSizeMB}M / ${docSizeMB}M`;
      break;
  }

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
      <ZoomDisplay zoom={zoom} pct={pct} />

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Info field + click-and-hold popover + > arrow menu */}
      <div
        ref={infoFieldRef}
        style={{ position: 'relative', cursor: 'default', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <span
          data-testid="status-info-text"
          onMouseDown={startHold}
          onMouseMove={moveHold}
          onMouseUp={endHold}
          onMouseLeave={endHold}
        >
          {infoText}
        </span>
        <span
          data-testid="status-info-arrow"
          aria-label="Status info mode menu"
          role="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            setMenuOpen(o => !o);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 12,
            height: 12,
            color: menuOpen ? 'hsl(var(--text-main))' : 'hsl(var(--text-muted))',
            cursor: 'default',
            fontSize: 9,
          }}
        >
          ▶
        </span>
        {popoverOpen && (
          <div
            data-testid="status-info-popover"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 6,
              background: 'hsl(var(--bg-header))',
              border: '1px solid hsl(var(--border-light))',
              boxShadow: 'var(--shadow-menu)',
              padding: '6px 10px',
              fontSize: 11,
              color: 'hsl(var(--text-main))',
              whiteSpace: 'nowrap',
              zIndex: 9100,
              lineHeight: 1.5,
            }}
          >
            <div>Width: {width} pixels</div>
            <div>Height: {height} pixels</div>
            <div>Channels: 3 (RGB Color, 8bpc)</div>
            <div>Resolution: 72 pixels/inch</div>
          </div>
        )}
        {menuOpen && (
          <div
            data-testid="status-info-menu"
            role="menu"
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: 4,
              background: 'hsl(var(--bg-header))',
              border: '1px solid hsl(var(--border-light))',
              boxShadow: 'var(--shadow-menu)',
              padding: '3px 0',
              minWidth: 200,
              zIndex: 9100,
            }}
          >
            {INFO_MODES.map(m => (
              <div
                key={m.id}
                role="menuitem"
                data-testid={`status-info-mode-${m.id}`}
                data-active={infoMode === m.id || undefined}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setInfoMode(m.id);
                  setMenuOpen(false);
                }}
                style={{
                  padding: '4px 20px 4px 24px',
                  fontSize: 11,
                  cursor: 'default',
                  position: 'relative',
                  color: 'hsl(var(--text-main))',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'hsl(var(--accent-primary))'; (e.currentTarget as HTMLDivElement).style.color = 'white'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = 'hsl(var(--text-main))'; }}
              >
                {infoMode === m.id && (
                  <span style={{ position: 'absolute', left: 8, fontSize: 10 }}>✓</span>
                )}
                {m.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      <span>{width} × {height} px</span>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      <span data-testid="status-active-tool" style={{ color: 'hsl(var(--text-main))' }}>
        {toolLabel}
      </span>

      <div style={{ flex: 1 }} />

      <span ref={cursorRef} data-testid="status-cursor-coords" style={{ fontVariantNumeric: 'tabular-nums', minWidth: 110 }}>
        X: —  Y: —
      </span>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {isDirty && (
        <span data-testid="dirty-indicator" style={{ color: 'hsl(var(--accent-warning, 38 92% 60%))', fontVariantNumeric: 'tabular-nums' }}>
          ● Unsaved changes
        </span>
      )}

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      <span style={{ color: 'hsl(var(--text-muted))', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {documentName}
      </span>
    </div>
  );
}
