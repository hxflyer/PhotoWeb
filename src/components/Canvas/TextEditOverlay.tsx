import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import {
    applyStyleRun,
    bindTextEditorBridge,
    styleAtOffset,
    type TypeLayerData,
    type TypeStyleRun,
    type TypeTextMode,
} from '../../tools/type';

export interface TextEditTransform {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
}

export type TextAntiAlias = 'none' | 'sharp' | 'crisp' | 'strong' | 'smooth';

export interface TextStyle {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;          // 400=Regular, 700=Bold, etc.
    fontStyle: 'normal' | 'italic';
    color: string;
    letterSpacing: number;       // tracking, in 1/1000 em
    lineHeight: number;          // leading multiplier (1.2 = 120% of fontSize); 0 = Auto
    textAlign: 'left' | 'center' | 'right' | 'justify';
    // PS Character panel extras
    scaleX: number;              // horizontal scaling (1 = 100%)
    scaleY: number;              // vertical scaling
    baselineShift: number;       // pixels — positive = up
    fauxBold: boolean;
    fauxItalic: boolean;
    allCaps: boolean;
    smallCaps: boolean;
    superscript: boolean;
    subscript: boolean;
    underline: boolean;
    strikethrough: boolean;
    antiAlias: TextAntiAlias;
    // PS Paragraph panel extras
    indentLeft: number;          // px
    indentRight: number;
    indentFirst: number;
    spaceBefore: number;
    spaceAfter: number;
    hyphenate: boolean;
}

export interface TextEditOverlayProps {
    visible: boolean;
    transform: TextEditTransform;
    style: TextStyle;
    initialValue: string;
    styleRuns?: TypeStyleRun[];
    textMode?: TypeTextMode;
    zoom: number;
    onChange?: (value: string, styleRuns?: TypeStyleRun[]) => void;
    onTransformChange?: (transform: TextEditTransform) => void;
    onCommit: (value: string) => void;
    onCancel: () => void;
}

export function TextEditOverlay(props: TextEditOverlayProps) {
    const {
        visible,
        transform,
        style,
        initialValue,
        textMode = 'point',
        zoom,
        onChange,
        onTransformChange,
        onCommit,
        onCancel,
    } = props;
    const ref = useRef<HTMLDivElement>(null);
    const movingRef = useRef(false);
    const [moveHover, setMoveHover] = useState(false);
    const lastAcceptedRef = useRef<{ text: string; styleRuns?: TypeStyleRun[] }>({ text: initialValue, styleRuns: props.styleRuns });

    const styleToCss = (s: Partial<TextStyle>): Partial<CSSStyleDeclaration> => ({
        fontFamily: s.fontFamily,
        fontSize: s.fontSize == null ? undefined : `${s.fontSize}px`,
        fontWeight: s.fauxBold ? '700' : s.fontWeight == null ? undefined : String(s.fontWeight),
        fontStyle: s.fauxItalic ? 'italic' : s.fontStyle,
        color: s.color,
        letterSpacing: s.letterSpacing == null || s.fontSize == null ? undefined : `${s.letterSpacing / 1000 * s.fontSize}px`,
        lineHeight: s.lineHeight == null ? undefined : String(s.lineHeight === 0 ? 1.2 : s.lineHeight),
        textTransform: s.allCaps ? 'uppercase' : undefined,
        fontVariant: s.smallCaps ? 'small-caps' : undefined,
        textDecoration: [
            s.underline ? 'underline' : '',
            s.strikethrough ? 'line-through' : '',
        ].filter(Boolean).join(' ') || undefined,
        verticalAlign: s.superscript ? 'super' : s.subscript ? 'sub' : undefined,
    });

    const cssName = (key: string) => key.replace(/[A-Z]/g, ch => `-${ch.toLowerCase()}`);

    const applyCssStyle = (el: HTMLElement, s: Partial<TextStyle>) => {
        const css = styleToCss(s);
        Object.entries(css).forEach(([key, value]) => {
            if (value != null) {
                el.style.setProperty(cssName(key), String(value));
            }
        });
    };

    const renderStyledText = (root: HTMLDivElement, text: string, runs: TypeStyleRun[] | undefined) => {
        root.replaceChildren();
        if (!runs || runs.length === 0) {
            root.innerText = text;
            return;
        }
        const boundaries = new Set<number>([0, text.length]);
        runs.forEach(run => {
            boundaries.add(Math.max(0, Math.min(text.length, run.start)));
            boundaries.add(Math.max(0, Math.min(text.length, run.end)));
        });
        const points = [...boundaries].sort((a, b) => a - b);
        points.forEach((start, i) => {
            const end = points[i + 1];
            if (end == null || end <= start) return;
            const segment = text.slice(start, end);
            const active = runs.filter(run => start >= run.start && start < run.end);
            if (active.length === 0) {
                root.appendChild(document.createTextNode(segment));
                return;
            }
            const merged = active.reduce<Partial<TextStyle>>((acc, run) => ({ ...acc, ...run.style }), {});
            const span = document.createElement('span');
            span.dataset.typeStyle = JSON.stringify(merged);
            applyCssStyle(span, merged);
            span.innerText = segment;
            root.appendChild(span);
        });
    };

    const getSelectionOffsets = (): { start: number; end: number } | null => {
        const root = ref.current;
        const sel = window.getSelection();
        if (!root || !sel || sel.rangeCount === 0) return null;
        const range = sel.getRangeAt(0);
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
        const preStart = document.createRange();
        preStart.selectNodeContents(root);
        preStart.setEnd(range.startContainer, range.startOffset);
        const preEnd = document.createRange();
        preEnd.selectNodeContents(root);
        preEnd.setEnd(range.endContainer, range.endOffset);
        return { start: preStart.toString().length, end: preEnd.toString().length };
    };

    const setSelectionOffsets = (start: number, end: number) => {
        const root = ref.current;
        if (!root) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let pos = 0;
        let startNode: Node | null = null;
        let endNode: Node | null = null;
        let startOffset = 0;
        let endOffset = 0;
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const len = node.textContent?.length ?? 0;
            if (!startNode && start <= pos + len) {
                startNode = node;
                startOffset = Math.max(0, Math.min(len, start - pos));
            }
            if (!endNode && end <= pos + len) {
                endNode = node;
                endOffset = Math.max(0, Math.min(len, end - pos));
                break;
            }
            pos += len;
        }
        if (!startNode || !endNode) return;
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
    };

    const serializeRuns = (): { text: string; styleRuns: TypeStyleRun[] } => {
        const root = ref.current;
        if (!root) return { text: '', styleRuns: [] };
        const runs: TypeStyleRun[] = [];
        let text = '';
        const walk = (node: Node, inherited: Partial<TextStyle>) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const value = node.textContent ?? '';
                const start = text.length;
                text += value;
                if (value.length > 0 && Object.keys(inherited).length > 0) {
                    runs.push({ start, end: start + value.length, style: { ...inherited } });
                }
                return;
            }
            if (!(node instanceof HTMLElement)) {
                node.childNodes.forEach(child => walk(child, inherited));
                return;
            }
            let next = inherited;
            if (node.dataset.typeStyle) {
                try { next = { ...next, ...JSON.parse(node.dataset.typeStyle) as Partial<TextStyle> }; }
                catch { next = inherited; }
            }
            node.childNodes.forEach(child => walk(child, next));
        };
        root.childNodes.forEach(child => walk(child, {}));
        return { text, styleRuns: runs };
    };

    // Initialise the contenteditable's text + caret ONCE per mount.
    // Re-running this on every keystroke (initialValue changes via onChange→setEditingType)
    // would overwrite innerText mid-typing and eat characters.
    useEffect(() => {
        if (!visible) return;
        const el = ref.current;
        if (!el) return;
        renderStyledText(el, initialValue, props.styleRuns);
        lastAcceptedRef.current = { text: initialValue, styleRuns: props.styleRuns };
        // defer focus to next frame so the click that triggered mounting doesn't immediately steal it
        requestAnimationFrame(() => {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        });
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        bindTextEditorBridge({
            applyStylePatch: (patch) => {
                const root = ref.current;
                const selection = getSelectionOffsets();
                if (!root || !selection || selection.start === selection.end) return false;
                const current = serializeRuns();
                const data: TypeLayerData = {
                    id: 'editing',
                    text: current.text,
                    style,
                    styleRuns: current.styleRuns,
                    orientation: 'horizontal',
                    transform,
                };
                const next = applyStyleRun(data, selection.start, selection.end, patch);
                renderStyledText(root, next.text, next.styleRuns);
                setSelectionOffsets(selection.start, selection.end);
                onChange?.(next.text, next.styleRuns);
                return true;
            },
            getSelectionStyle: () => {
                const selection = getSelectionOffsets();
                const current = serializeRuns();
                if (!selection || current.text.length === 0) return null;
                const offset = Math.min(current.text.length - 1, Math.min(selection.start, selection.end));
                return styleAtOffset({
                    id: 'editing',
                    text: current.text,
                    style,
                    styleRuns: current.styleRuns,
                    orientation: 'horizontal',
                    transform,
                }, Math.max(0, offset));
            },
        });
        return () => bindTextEditorBridge(null);
    }, [style, transform, onChange]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!visible) return null;

    const stopTextMouseEvent = (e: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>) => {
        // Do not preventDefault: native contenteditable must keep caret placement,
        // drag selection, and selected-text replacement behavior.
        e.stopPropagation();
    };

    const restoreAccepted = () => {
        const root = ref.current;
        if (!root) return;
        renderStyledText(root, lastAcceptedRef.current.text, lastAcceptedRef.current.styleRuns);
    };

    const isOverflowingBox = (): boolean => {
        const root = ref.current;
        if (!root || textMode !== 'box') return false;
        return root.scrollHeight > root.clientHeight + 1 || root.scrollWidth > root.clientWidth + 1;
    };

    const notifyRichChange = () => {
        const current = serializeRuns();
        if (textMode === 'box' && isOverflowingBox()) {
            restoreAccepted();
            return;
        }
        lastAcceptedRef.current = current;
        onChange?.(current.text, current.styleRuns);
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        } else if (e.code === 'NumpadEnter' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
            // Numpad Enter commits without inserting a newline; main Enter
            // inserts a line break; Cmd/Ctrl+Enter is the secondary commit.
            e.preventDefault();
            onCommit((e.target as HTMLDivElement).innerText);
        }
    };

    // Apply the type layer's stored rotation so the live <contenteditable>
    // overlay matches the rasterized text orientation. Hit-test code in
    // type.ts already accounts for rotation; this completes the loop.
    const rotationRad = typeof transform.rotation === 'number' ? transform.rotation : 0;
    const transformCss = [
        `translate(${transform.x}px, ${transform.y}px)`,
        `rotate(${rotationRad}rad)`,
    ].join(' ');

    const boxHandles = [
        ['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0],
        ['w', 0, 0.5], ['c', 0.5, 0.5], ['e', 1, 0.5],
        ['sw', 0, 1], ['s', 0.5, 1], ['se', 1, 1],
    ] as const;

    const startResize = (handle: string, e: PointerEvent<HTMLDivElement>) => {
        if (textMode !== 'box') return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        const startX = e.clientX;
        const startY = e.clientY;
        const start = { ...transform };
        const minW = 24;
        const minH = Math.max(24, style.fontSize * 1.2);
        const onMove = (ev: globalThis.PointerEvent) => {
            const dx = (ev.clientX - startX) / zoom;
            const dy = (ev.clientY - startY) / zoom;
            let { x, y, width, height } = start;
            if (handle.includes('e')) width = Math.max(minW, start.width + dx);
            if (handle.includes('s')) height = Math.max(minH, start.height + dy);
            if (handle.includes('w')) {
                width = Math.max(minW, start.width - dx);
                x = start.x + (start.width - width);
            }
            if (handle.includes('n')) {
                height = Math.max(minH, start.height - dy);
                y = start.y + (start.height - height);
            }
            onTransformChange?.({ ...start, x, y, width, height });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const textContentRect = (): { left: number; top: number; right: number; bottom: number } | null => {
        const root = ref.current;
        if (!root || textMode !== 'box' || root.innerText.length === 0) return null;
        const range = document.createRange();
        range.selectNodeContents(root);
        const rects = Array.from(range.getClientRects()).filter(rect => rect.width > 0 || rect.height > 0);
        if (rects.length === 0) return null;
        return rects.reduce((acc, rect) => ({
            left: Math.min(acc.left, rect.left),
            top: Math.min(acc.top, rect.top),
            right: Math.max(acc.right, rect.right),
            bottom: Math.max(acc.bottom, rect.bottom),
        }), {
            left: rects[0].left,
            top: rects[0].top,
            right: rects[0].right,
            bottom: rects[0].bottom,
        });
    };

    const isOutsideEditableText = (e: PointerEvent<HTMLDivElement>): boolean => {
        const rect = textContentRect();
        if (!rect) return false;
        const slack = 4;
        return e.clientX < rect.left - slack
            || e.clientX > rect.right + slack
            || e.clientY < rect.top - slack
            || e.clientY > rect.bottom + slack;
    };

    const startMove = (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        movingRef.current = true;
        setMoveHover(true);
        const startX = e.clientX;
        const startY = e.clientY;
        const start = { ...transform };
        const onMove = (ev: globalThis.PointerEvent) => {
            const dx = (ev.clientX - startX) / zoom;
            const dy = (ev.clientY - startY) / zoom;
            onTransformChange?.({ ...start, x: start.x + dx, y: start.y + dy });
        };
        const onUp = () => {
            movingRef.current = false;
            setMoveHover(false);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const handleTextPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        if (isOutsideEditableText(e)) {
            startMove(e);
            return;
        }
        stopTextMouseEvent(e);
    };

    const handleTextPointerMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!movingRef.current) setMoveHover(isOutsideEditableText(e));
        stopTextMouseEvent(e);
    };

    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: transformCss,
                transformOrigin: '0 0',
                width: textMode === 'box' ? transform.width : 'max-content',
                minWidth: textMode === 'box' ? 24 : 1,
                height: textMode === 'box' ? transform.height : 'auto',
                pointerEvents: 'auto',
                outline: textMode === 'box' ? '1px dashed #d7d7d7' : 'none',
                boxSizing: 'border-box',
            }}
        >
            <div
                aria-hidden
                onPointerDown={startMove}
                onPointerEnter={() => setMoveHover(true)}
                onPointerLeave={() => { if (!movingRef.current) setMoveHover(false); }}
                style={{
                    position: 'absolute',
                    inset: -8,
                    zIndex: 0,
                    cursor: 'move',
                    pointerEvents: 'auto',
                    touchAction: 'none',
                }}
            />
            <div
                ref={ref}
                contentEditable
                suppressContentEditableWarning
                spellCheck={false}
                onBeforeInput={(e) => {
                    if (textMode === 'box' && isOverflowingBox() && !e.nativeEvent.inputType.startsWith('delete')) e.preventDefault();
                }}
                onInput={notifyRichChange}
                onKeyDown={handleKeyDown}
                onKeyUp={notifyRichChange}
                onPointerDown={handleTextPointerDown}
                onPointerMove={handleTextPointerMove}
                onPointerUp={stopTextMouseEvent}
                onPointerLeave={() => { if (!movingRef.current) setMoveHover(false); }}
                onMouseDown={stopTextMouseEvent}
                onMouseMove={stopTextMouseEvent}
                onMouseUp={(e) => { stopTextMouseEvent(e); notifyRichChange(); }}
                onClick={stopTextMouseEvent}
                onDoubleClick={stopTextMouseEvent}
                style={{
                    position: 'relative',
                    zIndex: 1,
                    transform: `scale(${style.scaleX}, ${style.scaleY})`,
                    transformOrigin: '0 0',
                    width: textMode === 'box' ? '100%' : 'max-content',
                    minWidth: textMode === 'box' ? undefined : 1,
                    height: textMode === 'box' ? '100%' : 'auto',
                    maxHeight: textMode === 'box' ? '100%' : undefined,
                    overflow: textMode === 'box' ? 'hidden' : 'visible',
                    fontFamily: style.fontFamily,
                    fontSize: style.fontSize,
                    fontWeight: style.fauxBold ? 700 : style.fontWeight,
                    fontStyle: style.fauxItalic ? 'italic' : style.fontStyle,
                    color: style.color,
                    letterSpacing: `${style.letterSpacing / 1000 * style.fontSize}px`,
                    lineHeight: style.lineHeight === 0 ? 1.2 : style.lineHeight,
                    textAlign: style.textAlign,
                    textTransform: style.allCaps ? 'uppercase' : undefined,
                    fontVariant: style.smallCaps ? 'small-caps' : undefined,
                    textDecoration: [
                        style.underline ? 'underline' : '',
                        style.strikethrough ? 'line-through' : '',
                    ].filter(Boolean).join(' ') || undefined,
                    paddingLeft: style.indentLeft,
                    paddingRight: style.indentRight,
                    paddingTop: style.spaceBefore,
                    paddingBottom: style.spaceAfter,
                    textIndent: style.indentFirst,
                    hyphens: style.hyphenate ? 'auto' : 'manual',
                    outline: 'none',
                    background: 'transparent',
                    whiteSpace: textMode === 'box' ? 'pre-wrap' : 'pre',
                    wordBreak: textMode === 'box' ? 'break-word' : 'normal',
                    caretColor: style.color,
                    boxSizing: 'border-box',
                    cursor: textMode === 'box' && moveHover ? 'move' : 'text',
                }}
            />
            {textMode === 'box' && boxHandles.map(([id, x, y]) => (
                <div
                    key={id}
                    onPointerDown={(e) => id === 'c' ? startMove(e) : startResize(id, e)}
                    title={id === 'c' ? 'Move text box' : `Resize ${id}`}
                    style={{
                        position: 'absolute',
                        left: `calc(${x * 100}% - 3px)`,
                        top: `calc(${y * 100}% - 3px)`,
                        width: 6,
                        height: 6,
                        background: '#f7f7f7',
                        border: '1px solid #111',
                        boxSizing: 'border-box',
                        cursor: id === 'c' ? 'move' : `${id}-resize`,
                        zIndex: 3,
                        pointerEvents: 'auto',
                        touchAction: 'none',
                    }}
                />
            ))}
        </div>
    );
}
