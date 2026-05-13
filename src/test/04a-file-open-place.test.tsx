/**
 * 04a-file-open-place — fileIngest pipeline + File menu wiring.
 *
 * The drag-drop handler in Viewport.tsx and the menu-driven Place Embedded
 * / Load Files into Stack actions both route through ingestFiles. Test
 * behavior at that boundary.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ingestFiles, summaryToast } from '../utils/fileIngest';
import { useEditorStore } from '../store/editorStore';

// jsdom's Image doesn't fire onload for data: URLs. Patch the prototype so
// any new Image() resolves synchronously once src is set.
let _originalImageSrc: PropertyDescriptor | undefined;
beforeEach(() => {
    _originalImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        set(this: HTMLImageElement) {
            queueMicrotask(() => this.onload?.(new Event('load')));
        },
        get() { return ''; },
    });
});
afterEach(() => {
    vi.restoreAllMocks();
    if (_originalImageSrc) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', _originalImageSrc);
    }
    // Reset to a fresh document with the default Background layer.
    useEditorStore.getState().newDocument(800, 600, '#ffffff');
});

function pngFile(name: string): File {
    // 1×1 transparent PNG — minimal but decodable by browsers and jsdom's
    // Image stub via FileReader.readAsDataURL.
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const binary = atob(pngBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], name, { type: 'image/png' });
}

function txtFile(name: string): File {
    return new File(['hello'], name, { type: 'text/plain' });
}

function pwbdocFile(name: string): File {
    return new File(['{}'], name, { type: 'application/json' });
}

describe('04a — ingestFiles routing', () => {
    it('rejects multiple .pwbdoc files in a single drop', async () => {
        const result = await ingestFiles([pwbdocFile('a.pwbdoc'), pwbdocFile('b.pwbdoc')]);
        expect(result.rejected).toMatch(/Only one .pwbdoc/);
    });

    it('rejects mixing .pwbdoc with images', async () => {
        const result = await ingestFiles([pwbdocFile('a.pwbdoc'), pngFile('b.png')]);
        expect(result.rejected).toMatch(/Can't mix/);
    });

    it('non-image files in a multi-pick are skipped, images still ingest', async () => {
        const openSpy = vi.spyOn(useEditorStore.getState(), 'openImageAsDocument').mockImplementation(() => true);
        const layerSpy = vi.spyOn(useEditorStore.getState(), 'addLayerFromImage').mockImplementation(() => { /* noop */ });
        const result = await ingestFiles([
            pngFile('one.png'),
            txtFile('readme.txt'),
            pngFile('two.png'),
        ], { treatFirstAsNewDoc: false });
        expect(result.skipped).toEqual(['readme.txt']);
        // Both images route through addLayerFromImage (existing doc).
        expect(layerSpy).toHaveBeenCalledTimes(2);
        expect(openSpy).not.toHaveBeenCalled();
    });

    it('with no document open and treatFirstAsNewDoc=true, first image opens as document, rest add as layers', async () => {
        // Force "no document" — clear layers via direct state set.
        useEditorStore.setState(s => ({ ...s, layers: [] }));
        const openSpy = vi.spyOn(useEditorStore.getState(), 'openImageAsDocument').mockImplementation(() => true);
        const layerSpy = vi.spyOn(useEditorStore.getState(), 'addLayerFromImage');
        await ingestFiles([pngFile('a.png'), pngFile('b.png'), pngFile('c.png')], { treatFirstAsNewDoc: true });
        expect(openSpy).toHaveBeenCalledTimes(1);
        expect(layerSpy).toHaveBeenCalledTimes(2);
    });

    it('with a document open and treatFirstAsNewDoc=true, every image still adds as layer', async () => {
        // newDocument was called in afterEach restore — document has the
        // background layer, so layers.length > 0.
        const openSpy = vi.spyOn(useEditorStore.getState(), 'openImageAsDocument').mockImplementation(() => true);
        const layerSpy = vi.spyOn(useEditorStore.getState(), 'addLayerFromImage').mockImplementation(() => { /* noop */ });
        await ingestFiles([pngFile('a.png'), pngFile('b.png')], { treatFirstAsNewDoc: true });
        expect(openSpy).not.toHaveBeenCalled();
        expect(layerSpy).toHaveBeenCalledTimes(2);
    });

    it('preserves drop order', async () => {
        const calls: string[] = [];
        vi.spyOn(useEditorStore.getState(), 'addLayerFromImage').mockImplementation((_img, name) => {
            calls.push(name);
        });
        await ingestFiles([pngFile('first.png'), pngFile('second.png'), pngFile('third.png')]);
        expect(calls).toEqual(['first.png', 'second.png', 'third.png']);
    });
});

describe('04a — summaryToast', () => {
    it('null on empty', () => {
        expect(summaryToast({ opened: null, layered: [], skipped: [], rejected: null })).toBeNull();
    });

    it('rejection takes precedence', () => {
        const t = summaryToast({ opened: 'a', layered: ['b'], skipped: [], rejected: 'nope' });
        expect(t?.level).toBe('error');
        expect(t?.message).toBe('nope');
    });

    it('opened only', () => {
        const t = summaryToast({ opened: 'photo.jpg', layered: [], skipped: [], rejected: null });
        expect(t).toEqual({ message: 'Opened "photo.jpg"', level: 'success' });
    });

    it('single layer add', () => {
        const t = summaryToast({ opened: null, layered: ['leaf.png'], skipped: [], rejected: null });
        expect(t).toEqual({ message: 'Added "leaf.png"', level: 'success' });
    });

    it('multiple layers add', () => {
        const t = summaryToast({ opened: null, layered: ['a', 'b', 'c'], skipped: [], rejected: null });
        expect(t).toEqual({ message: 'Added 3 layers', level: 'success' });
    });

    it('opened plus layers combined', () => {
        const t = summaryToast({ opened: 'first.png', layered: ['b', 'c'], skipped: [], rejected: null });
        expect(t?.message).toBe('Opened "first.png" + added 2 layer(s)');
    });

    it('skipped only', () => {
        const t = summaryToast({ opened: null, layered: [], skipped: ['x.txt'], rejected: null });
        expect(t).toEqual({ message: 'Skipped 1 non-image file(s)', level: 'info' });
    });
});
