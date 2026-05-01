import { useEffect, useRef } from 'react';

export interface TextEditTransform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    color: string;
    letterSpacing: number;
    lineHeight: number;
    textAlign: 'left' | 'center' | 'right' | 'justify';
}

export interface TextEditOverlayProps {
    visible: boolean;
    transform: TextEditTransform;
    style: TextStyle;
    initialValue: string;
    zoom: number;
    onChange?: (value: string) => void;
    onCommit: (value: string) => void;
    onCancel: () => void;
}

export function TextEditOverlay(props: TextEditOverlayProps) {
    const {
        visible,
        transform,
        style,
        initialValue,
        zoom,
        onChange,
        onCommit,
        onCancel,
    } = props;
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!visible) return;
        const el = ref.current;
        if (!el) return;
        el.innerText = initialValue;
        el.focus();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    }, [visible, initialValue]);

    if (!visible) return null;

    const transformCss = [
        `translate(${transform.x}px, ${transform.y}px)`,
        `rotate(${transform.rotation}rad)`,
        `scale(${zoom})`,
    ].join(' ');

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={(e) => onChange?.((e.target as HTMLDivElement).innerText)}
            onBlur={(e) => onCommit((e.target as HTMLDivElement).innerText)}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    onCommit((e.target as HTMLDivElement).innerText);
                }
            }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: transformCss,
                transformOrigin: '0 0',
                width: transform.width,
                minHeight: transform.height,
                fontFamily: style.fontFamily,
                fontSize: style.fontSize,
                fontWeight: style.fontWeight,
                fontStyle: style.fontStyle,
                color: style.color,
                letterSpacing: `${style.letterSpacing}px`,
                lineHeight: style.lineHeight,
                textAlign: style.textAlign,
                outline: '1px dashed #3b82f6',
                background: 'transparent',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                caretColor: style.color,
                pointerEvents: 'auto',
            }}
        />
    );
}
