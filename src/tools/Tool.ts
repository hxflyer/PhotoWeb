import type { ReactNode } from 'react';
import type { EditorStore } from '../store/types';

export interface ToolPointerEvent {
    canvasX: number;
    canvasY: number;
    clientX: number;
    clientY: number;
    button: number;
    buttons: number;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    ctrl: boolean;
    pressure: number;
    pointerType: 'mouse' | 'pen' | 'touch';
    rawEvent: PointerEvent;
}

export interface ToolKeyEvent {
    key: string;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    ctrl: boolean;
    rawEvent: KeyboardEvent;
}

export interface ToolContext {
    store: EditorStore;
    getStore: () => EditorStore;
    requestRender: () => void;
}

export interface OverlayRenderContext {
    ctx: CanvasRenderingContext2D;
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
}

export interface Tool {
    id: string;
    label: string;
    cursor: string | ((ctx: ToolContext) => string);
    options?: () => ReactNode;
    onActivate?: (ctx: ToolContext) => void;
    onDeactivate?: (ctx: ToolContext) => void;
    onPointerDown?: (e: ToolPointerEvent, ctx: ToolContext) => void;
    onPointerMove?: (e: ToolPointerEvent, ctx: ToolContext) => void;
    onPointerUp?: (e: ToolPointerEvent, ctx: ToolContext) => void;
    onKeyDown?: (e: ToolKeyEvent, ctx: ToolContext) => void;
    onKeyUp?: (e: ToolKeyEvent, ctx: ToolContext) => void;
    // Called once per frame after layer compositing. Tools draw their own
    // ephemeral UI here — pen anchors, marquee preview, transform handles, etc.
    // The ctx is the on-screen canvas's 2D context; tools must not persist
    // state on it (no leftover globalAlpha / lineDash, always save/restore).
    renderOverlay?: (overlay: OverlayRenderContext, toolCtx: ToolContext) => void;
}
