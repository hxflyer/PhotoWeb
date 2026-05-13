import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';

interface MainLayoutProps {
  menuBar: ReactNode;
  optionsBar: ReactNode;
  documentTab: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  rightPanel: ReactNode;
  statusBar: ReactNode;
  onPasteboardContextMenu?: (e: ReactMouseEvent<HTMLDivElement>) => void;
}

export function MainLayout({
  menuBar,
  optionsBar,
  documentTab,
  toolbar,
  canvas,
  rightPanel,
  statusBar,
  onPasteboardContextMenu,
}: MainLayoutProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '48px 1fr 260px',
      gridTemplateRows: '24px 30px 26px 1fr 22px',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'hsl(var(--bg-dark))',
      color: 'hsl(var(--text-main))',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* ── Row 1: Menu bar (full width) ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 1, zIndex: 100 }}>
        {menuBar}
      </div>

      {/* ── Row 2: Options bar (full width) ── */}
      <div style={{
        gridColumn: '1 / -1',
        gridRow: 2,
        backgroundColor: 'hsl(var(--bg-header))',
        borderBottom: '1px solid hsl(var(--border-light))',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        zIndex: 50,
        overflow: 'hidden',
      }}>
        {optionsBar}
      </div>

      {/* ── Row 3: Document tab (full width above canvas) ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 3, zIndex: 40 }}>
        {documentTab}
      </div>

      {/* ── Row 4: Left toolbar ── */}
      <div style={{
        gridColumn: 1,
        gridRow: 4,
        backgroundColor: 'hsl(var(--bg-panel))',
        borderRight: '1px solid hsl(var(--border-light))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px 0',
        overflowY: 'auto',
        zIndex: 10,
      }}>
        {toolbar}
      </div>

      {/* ── Row 4: Canvas area (pasteboard) ── */}
      <div
        data-testid="pasteboard"
        onContextMenu={onPasteboardContextMenu}
        style={{
          gridColumn: 2,
          gridRow: 4,
          position: 'relative',
          overflow: 'hidden',
          // The CSS variable --pasteboard-bg is set by App.tsx whenever the
          // user picks a preset or custom pasteboard color; otherwise we
          // fall back to the theme's canvas background.
          backgroundColor: 'var(--pasteboard-bg, hsl(var(--bg-canvas)))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {canvas}
      </div>

      {/* ── Row 4: Right panel ── */}
      <div style={{
        gridColumn: 3,
        gridRow: 4,
        backgroundColor: 'hsl(var(--bg-panel))',
        borderLeft: '1px solid hsl(var(--border-light))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}>
        {rightPanel}
      </div>

      {/* ── Row 5: Status bar (full width) ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 5, zIndex: 20 }}>
        {statusBar}
      </div>
    </div>
  );
}
