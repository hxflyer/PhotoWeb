import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface InputNumberDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: number) => void;
    title: string;
    label: string;
    initialValue: number;
    min?: number;
    max?: number;
}

export function InputNumberDialog({ isOpen, onClose, onConfirm, title, label, initialValue, min = 0, max = 100 }: InputNumberDialogProps) {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) setValue(initialValue); // eslint-disable-line react-hooks/set-state-in-effect
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onConfirm(value);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)'
        }} onClick={onClose}>
            <div style={{
                width: '300px',
                backgroundColor: 'hsl(var(--bg-panel))',
                border: '1px solid hsl(var(--border-light))',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid hsl(var(--border-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'hsl(var(--bg-header))'
                }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'hsl(var(--text-main))' }}>{title}</h3>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: 'hsl(var(--text-muted))',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        borderRadius: '4px'
                    }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', color: 'hsl(var(--text-muted))', fontSize: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 500 }}>{label}</label>
                        <input
                            type="number"
                            value={value}
                            min={min}
                            max={max}
                            onChange={(e) => setValue(Number(e.target.value))}
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                            style={{
                                background: 'hsl(var(--bg-input))',
                                border: '1px solid hsl(var(--border-light))',
                                color: 'hsl(var(--text-main))',
                                padding: '8px',
                                borderRadius: '4px',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px 16px',
                    borderTop: '1px solid hsl(var(--border-light))',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    backgroundColor: 'hsl(var(--bg-header))'
                }}>
                    <button onClick={onClose} style={{
                        padding: '6px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid hsl(var(--border-light))',
                        color: 'hsl(var(--text-main))',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                    }}>Cancel</button>
                    <button onClick={handleSubmit} style={{
                        padding: '6px 12px',
                        backgroundColor: 'hsl(var(--accent-primary))',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 500
                    }}>Confirm</button>
                </div>
            </div>
        </div>
    );
}
