// Input simulator + command-script runner.
// Tests describe a feature as an ordered list of user inputs, then assert on
// store state, layer pixels, or selection paths. The simulator dispatches
// real DOM events (jsdom) and synthetic React pointer events so the same
// handlers users hit at runtime are exercised.

import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Layer } from '../core/Layer';

export interface Modifiers {
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;
    meta?: boolean;
}

export type Command =
    | { type: 'mouseDown'; target?: string | HTMLElement; x: number; y: number; button?: number; modifiers?: Modifiers }
    | { type: 'mouseMove'; target?: string | HTMLElement; x: number; y: number; buttons?: number }
    | { type: 'mouseUp'; target?: string | HTMLElement; x?: number; y?: number; button?: number }
    | { type: 'click'; target: string | HTMLElement; modifiers?: Modifiers }
    | { type: 'dblclick'; target: string | HTMLElement }
    | { type: 'keyDown'; key: string; modifiers?: Modifiers }
    | { type: 'keyUp'; key: string; modifiers?: Modifiers }
    | { type: 'type'; target: string | HTMLElement; text: string }
    | { type: 'wait'; ms?: number };

function resolve(root: HTMLElement, target?: string | HTMLElement): HTMLElement {
    if (!target) return root;
    if (typeof target !== 'string') return target;
    const found = root.querySelector(target);
    if (!found) throw new Error(`Simulator: selector "${target}" matched nothing`);
    return found as HTMLElement;
}

function buildEventInit(
    x: number,
    y: number,
    extra: { button?: number; buttons?: number; modifiers?: Modifiers } = {},
): MouseEventInit {
    const m = extra.modifiers ?? {};
    return {
        clientX: x,
        clientY: y,
        button: extra.button ?? 0,
        buttons: extra.buttons ?? 1,
        bubbles: true,
        cancelable: true,
        shiftKey: !!m.shift,
        altKey: !!m.alt,
        ctrlKey: !!m.ctrl,
        metaKey: !!m.meta,
    };
}

function buildKeyInit(key: string, modifiers?: Modifiers): KeyboardEventInit {
    const m = modifiers ?? {};
    return {
        key,
        bubbles: true,
        cancelable: true,
        shiftKey: !!m.shift,
        altKey: !!m.alt,
        ctrlKey: !!m.ctrl,
        metaKey: !!m.meta,
    };
}

export async function runScript(commands: Command[], root: HTMLElement = document.body): Promise<void> {
    for (const cmd of commands) {
        switch (cmd.type) {
            case 'mouseDown': {
                const el = resolve(root, cmd.target);
                fireEvent.mouseDown(el, buildEventInit(cmd.x, cmd.y, { button: cmd.button, modifiers: cmd.modifiers }));
                break;
            }
            case 'mouseMove': {
                const el = resolve(root, cmd.target);
                fireEvent.mouseMove(el, buildEventInit(cmd.x, cmd.y, { buttons: cmd.buttons ?? 1 }));
                break;
            }
            case 'mouseUp': {
                const el = resolve(root, cmd.target);
                fireEvent.mouseUp(el, buildEventInit(cmd.x ?? 0, cmd.y ?? 0, { button: cmd.button }));
                break;
            }
            case 'click': {
                const el = resolve(root, cmd.target);
                if (cmd.modifiers) {
                    fireEvent.click(el, buildEventInit(0, 0, { modifiers: cmd.modifiers }));
                } else {
                    fireEvent.click(el);
                }
                break;
            }
            case 'dblclick': {
                const el = resolve(root, cmd.target);
                fireEvent.doubleClick(el);
                break;
            }
            case 'keyDown': {
                fireEvent.keyDown(window, buildKeyInit(cmd.key, cmd.modifiers));
                break;
            }
            case 'keyUp': {
                fireEvent.keyUp(window, buildKeyInit(cmd.key, cmd.modifiers));
                break;
            }
            case 'type': {
                const el = resolve(root, cmd.target);
                await userEvent.type(el, cmd.text);
                break;
            }
            case 'wait': {
                await new Promise(r => setTimeout(r, cmd.ms ?? 0));
                break;
            }
        }
    }
}

export interface PixelRGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export function pixelAt(canvas: HTMLCanvasElement, x: number, y: number): PixelRGBA {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas has no 2D context');
    const data = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
}

export function layerPixelAt(layer: Layer, x: number, y: number): PixelRGBA {
    return pixelAt(layer.canvas, x, y);
}

export function expectPixelClose(actual: PixelRGBA, expected: Partial<PixelRGBA>, tolerance = 4): boolean {
    const within = (a: number, e?: number) => e === undefined ? true : Math.abs(a - e) <= tolerance;
    return (
        within(actual.r, expected.r) &&
        within(actual.g, expected.g) &&
        within(actual.b, expected.b) &&
        within(actual.a, expected.a)
    );
}

// Helper for tools registered in src/tools/registry.ts: build a synthetic
// ToolPointerEvent and dispatch through getTool(id).onPointerXxx without
// going through the React component tree. Useful when testing tool logic
// in isolation, before/without the Viewport.
export interface ToolDispatchOpts {
    canvasX: number;
    canvasY: number;
    button?: number;
    buttons?: number;
    pressure?: number;
    modifiers?: Modifiers;
}

export function makeToolPointerEvent(opts: ToolDispatchOpts): import('../tools/Tool').ToolPointerEvent {
    const m = opts.modifiers ?? {};
    return {
        canvasX: opts.canvasX,
        canvasY: opts.canvasY,
        clientX: opts.canvasX,
        clientY: opts.canvasY,
        button: opts.button ?? 0,
        buttons: opts.buttons ?? 1,
        shift: !!m.shift,
        alt: !!m.alt,
        ctrl: !!m.ctrl,
        meta: !!m.meta,
        pressure: opts.pressure ?? 0.5,
        pointerType: 'mouse',
        rawEvent: new MouseEvent('pointer') as unknown as PointerEvent,
    };
}
