import type { ReactNode } from 'react';

interface MainLayoutProps {
  menuBar: ReactNode;
  optionsBar: ReactNode;
  toolbar: ReactNode;
  canvas: ReactNode;
  rightPanel: ReactNode;
  statusBar: ReactNode;
}

export function MainLayout({ menuBar, optionsBar, toolbar, canvas, rightPanel, statusBar }: MainLayoutProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '48px 1fr 260px',
      gridTemplateRows: '24px 30px 1fr 22px',
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

      {/* ── Row 3: Left toolbar ── */}
      <div style={{
        gridColumn: 1,
        gridRow: 3,
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

      {/* ── Row 3: Canvas area ── */}
      <div style={{
        gridColumn: 2,
        gridRow: 3,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'hsl(var(--bg-canvas))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {canvas}
      </div>

      {/* ── Row 3: Right panel ── */}
      <div style={{
        gridColumn: 3,
        gridRow: 3,
        backgroundColor: 'hsl(var(--bg-panel))',
        borderLeft: '1px solid hsl(var(--border-light))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 10,
      }}>
        {rightPanel}
      </div>

      {/* ── Row 4: Status bar (full width) ── */}
      <div style={{ gridColumn: '1 / -1', gridRow: 4, zIndex: 20 }}>
        {statusBar}
      </div>
    </div>
  );
}
