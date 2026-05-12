import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { evaluateNumericExpression } from '../../utils/numericExpression';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const cardStyle: React.CSSProperties = {
    background: '#2a2a2a', border: '1px solid #444', borderRadius: 6,
    padding: 16, minWidth: 320, color: 'white', fontSize: 12,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const inputStyle: React.CSSProperties = {
    background: '#333', border: '1px solid #555', borderRadius: 3,
    color: 'white', padding: '4px 8px', fontSize: 12, flex: 1,
};

function NewGuideDialogBody({ onClose }: { onClose: () => void }) {
    const addGuideWithHistory = useEditorStore(s => s.addGuideWithHistory);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const [position, setPosition] = useState<number>(0);
    const [positionText, setPositionText] = useState<string>('0');
    const inputRef = useRef<HTMLInputElement>(null);

    function commitPosition(text: string) {
        const v = evaluateNumericExpression(text);
        if (v !== null) {
            setPosition(v);
            setPositionText(String(v));
        } else {
            setPositionText(String(position));
        }
    }

    useEffect(() => {
        const id = window.setTimeout(() => inputRef.current?.focus(), 0);
        return () => window.clearTimeout(id);
    }, []);

    function commit() {
        // Parse any pending math expression in the position field before commit.
        const v = evaluateNumericExpression(positionText);
        const final = v !== null ? v : position;
        addGuideWithHistory(orientation, final);
        onClose();
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    }

    return (
        <div style={overlayStyle} onClick={onClose} onKeyDown={handleKeyDown}>
            <div style={cardStyle} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="new-guide-title" tabIndex={-1}>
                <div id="new-guide-title" style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>New Guide</div>

                <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 6, opacity: 0.85 }}>Orientation</div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 16 }}>
                        <input
                            type="radio"
                            name="new-guide-orientation"
                            value="horizontal"
                            checked={orientation === 'horizontal'}
                            onChange={() => setOrientation('horizontal')}
                        />
                        <span>Horizontal</span>
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <input
                            type="radio"
                            name="new-guide-orientation"
                            value="vertical"
                            checked={orientation === 'vertical'}
                            onChange={() => setOrientation('vertical')}
                        />
                        <span>Vertical</span>
                    </label>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 80, opacity: 0.85 }}>Position</span>
                    <input
                        ref={inputRef}
                        data-testid="new-guide-position"
                        type="text"
                        value={positionText}
                        onChange={e => {
                            setPositionText(e.target.value);
                            const v = evaluateNumericExpression(e.target.value);
                            if (v !== null) setPosition(v);
                        }}
                        onBlur={e => commitPosition(e.target.value)}
                        style={inputStyle}
                        aria-label="Position"
                    />
                    <span style={{ opacity: 0.7 }}>px</span>
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #555', borderRadius: 3, color: 'white', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={commit}
                        style={{ padding: '4px 12px', background: '#0090ff', border: 'none', borderRadius: 3, color: 'white', cursor: 'pointer' }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}

export function NewGuideDialog({ isOpen, onClose }: Props) {
    if (!isOpen) return null;
    // Unmounted when closed, so internal state resets naturally on next open.
    return <NewGuideDialogBody onClose={onClose} />;
}
