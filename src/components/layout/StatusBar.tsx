import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';

export function StatusBar() {
  const zoom = useEditorStore(s => s.zoom);
  const width = useEditorStore(s => s.width);
  const height = useEditorStore(s => s.height);
  const layers = useEditorStore(s => s.layers);
  const documentName = useEditorStore(s => s.documentName);

  const cursorRef = useRef<HTMLSpanElement>(null);

  // Track cursor globally — no store update needed
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.textContent = `X: ${e.clientX}  Y: ${e.clientY}`;
      }
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  const pct = Math.round(zoom * 100);
  const visibleLayers = layers.filter(l => l.visible).length;
  const docSizeMB = ((width * height * 4 * layers.length) / 1024 / 1024).toFixed(1);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoMode, setInfoMode] = useState<'size' | 'layers'>('size');

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
            ? `Doc: ${(width * height * 4 / 1024 / 1024).toFixed(1)}M / ${docSizeMB}M`
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

      <div style={{ flex: 1 }} />

      {/* Cursor coordinates */}
      <span ref={cursorRef} style={{ fontVariantNumeric: 'tabular-nums', minWidth: 110 }}>
        X: —  Y: —
      </span>

      <div style={{ width: 1, height: 12, background: 'hsl(var(--border-mid))' }} />

      {/* Document name */}
      <span style={{ color: 'hsl(var(--text-muted))', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {documentName}
      </span>
    </div>
  );
}
