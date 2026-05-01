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
}
