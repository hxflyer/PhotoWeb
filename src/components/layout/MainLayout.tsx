import type { ReactNode } from 'react';

interface MainLayoutProps {
    toolbar: ReactNode;
    propertiesPanel: ReactNode;
    layersPanel: ReactNode;
    canvas: ReactNode;
}

export function MainLayout({ toolbar, propertiesPanel, layersPanel, canvas }: MainLayoutProps) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr 260px', /* Slimmer toolbar, slightly wider panel */
            gridTemplateRows: '40px 1fr', /* Slimmer header */
            width: '100vw',
            height: '100vh',
            backgroundColor: 'hsl(var(--bg-dark))',
            color: 'hsl(var(--text-main))',
            fontFamily: 'var(--font-sans)'
        }}>
            {/* Top Header / Properties Panel */}
            <div style={{
                gridColumn: '1 / -1',
                gridRow: '1',
                backgroundColor: 'hsl(var(--bg-header))',
                borderBottom: '1px solid hsl(var(--border-light))',
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                zIndex: 20, /* Higher Z-index for menu/popups */
                fontSize: '13px'
            }}>
                {propertiesPanel}
            </div>

            {/* Left Toolbar */}
            <div style={{
                gridColumn: '1',
                gridRow: '2',
                backgroundColor: 'hsl(var(--bg-panel))',
                borderRight: '1px solid hsl(var(--border-light))',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                gap: '8px',
                zIndex: 10
            }}>
                {toolbar}
            </div>

            {/* Center Canvas Area */}
            <div style={{
                gridColumn: '2',
                gridRow: '2',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#121212', /* Almost black canvas bg */
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Dot grid can be nice, but Photoshop is usually just flat dark gray. Keeping generic dark. */}
                {canvas}
            </div>

            {/* Right Layers/Properties Panel */}
            <div style={{
                gridColumn: '3',
                gridRow: '2',
                backgroundColor: 'hsl(var(--bg-panel))',
                borderLeft: '1px solid hsl(var(--border-light))',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 10
            }}>
                {layersPanel}
            </div>
        </div>
    );
}
