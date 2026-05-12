import { useEffect, useRef, useState } from 'react';

export interface PanelFlyoutItem {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    separator?: boolean;
    checked?: boolean;
    submenuItems?: PanelFlyoutItem[];
}

interface PanelFlyoutProps {
    items: PanelFlyoutItem[];
    label?: string;
    testId?: string;
}

const FLYOUT_BTN: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'hsl(var(--text-muted))',
    cursor: 'pointer',
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    padding: 0,
    fontSize: 14,
    lineHeight: 1,
};

const MENU_STYLE: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    right: 0,
    minWidth: 200,
    background: 'hsl(var(--bg-panel))',
    border: '1px solid hsl(var(--border-light))',
    boxShadow: 'var(--shadow-menu)',
    padding: '4px 0',
    zIndex: 1100,
};

const MENU_ITEM_STYLE: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    textAlign: 'left',
    padding: '4px 12px',
    background: 'none',
    border: 'none',
    color: 'hsl(var(--text-main))',
    cursor: 'pointer',
    fontSize: 12,
};

/**
 * Reusable panel hamburger flyout. Renders a small triple-bar trigger;
 * clicking it shows the provided list of items. Items can be disabled,
 * marked with a check, or contain a sub-menu (rendered inline as a
 * lightweight cascading popup).
 */
export function PanelFlyout({ items, label = 'Panel menu', testId }: PanelFlyoutProps) {
    const [open, setOpen] = useState(false);
    const [submenu, setSubmenu] = useState<number | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function onDoc(e: MouseEvent) {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSubmenu(null);
            }
        }
        window.addEventListener('mousedown', onDoc);
        return () => window.removeEventListener('mousedown', onDoc);
    }, [open]);

    function runItem(item: PanelFlyoutItem) {
        if (item.disabled || item.separator) return;
        if (item.submenuItems) return;
        item.onClick?.();
        setOpen(false);
        setSubmenu(null);
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex' }}>
            <button
                type="button"
                aria-label={label}
                title={label}
                data-testid={testId ?? 'panel-flyout-trigger'}
                onClick={() => setOpen(v => !v)}
                style={FLYOUT_BTN}
            >
                {/* Triple bar (hamburger) icon */}
                <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
                    <rect x="1" y="2" width="10" height="1.5" fill="currentColor" />
                    <rect x="1" y="5.25" width="10" height="1.5" fill="currentColor" />
                    <rect x="1" y="8.5" width="10" height="1.5" fill="currentColor" />
                </svg>
            </button>
            {open && (
                <div data-testid={testId ? `${testId}-menu` : 'panel-flyout-menu'} style={MENU_STYLE} onClick={(e) => e.stopPropagation()}>
                    {items.map((item, idx) => {
                        if (item.separator) {
                            return (
                                <div
                                    key={`sep-${idx}`}
                                    style={{ height: 1, background: 'hsl(var(--border-light))', margin: '4px 0' }}
                                />
                            );
                        }
                        return (
                            <div
                                key={`${item.label}-${idx}`}
                                style={{ position: 'relative' }}
                                onMouseEnter={() => item.submenuItems && setSubmenu(idx)}
                                onMouseLeave={() => item.submenuItems && setSubmenu(s => (s === idx ? null : s))}
                            >
                                <button
                                    type="button"
                                    disabled={item.disabled}
                                    data-testid={`panel-flyout-item-${item.label.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/-+$/, '')}`}
                                    onClick={() => runItem(item)}
                                    style={{
                                        ...MENU_ITEM_STYLE,
                                        color: item.disabled ? 'hsl(var(--text-muted))' : 'hsl(var(--text-main))',
                                        cursor: item.disabled ? 'default' : 'pointer',
                                    }}
                                    onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    <span>{item.checked ? '✓ ' : ''}{item.label}</span>
                                    {item.submenuItems && <span style={{ opacity: 0.6 }}>▸</span>}
                                </button>
                                {item.submenuItems && submenu === idx && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: '100%',
                                            minWidth: 200,
                                            background: 'hsl(var(--bg-panel))',
                                            border: '1px solid hsl(var(--border-light))',
                                            boxShadow: 'var(--shadow-menu)',
                                            padding: '4px 0',
                                            zIndex: 1101,
                                        }}
                                    >
                                        {item.submenuItems.map((sub, sIdx) => (
                                            sub.separator ? (
                                                <div key={`subsep-${sIdx}`} style={{ height: 1, background: 'hsl(var(--border-light))', margin: '4px 0' }} />
                                            ) : (
                                                <button
                                                    type="button"
                                                    key={`${sub.label}-${sIdx}`}
                                                    disabled={sub.disabled}
                                                    onClick={() => { if (!sub.disabled) { sub.onClick?.(); setOpen(false); setSubmenu(null); } }}
                                                    style={{
                                                        ...MENU_ITEM_STYLE,
                                                        color: sub.disabled ? 'hsl(var(--text-muted))' : 'hsl(var(--text-main))',
                                                        cursor: sub.disabled ? 'default' : 'pointer',
                                                    }}
                                                    onMouseEnter={(e) => { if (!sub.disabled) e.currentTarget.style.backgroundColor = 'hsl(var(--accent-primary))'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                >
                                                    <span>{sub.checked ? '✓ ' : ''}{sub.label}</span>
                                                </button>
                                            )
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
