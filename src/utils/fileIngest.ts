/**
 * File ingest pipeline used by both the canvas drop handler and the
 * File > Place Embedded… / File > Scripts > Load Files into Stack…
 * menu actions.
 *
 * Photoshop habit:
 *   - Drop / open with NO document: first image opens as a new document;
 *     subsequent images add as layers.
 *   - Drop / open with a document: every image adds as a layer in order.
 *   - .pwbdoc native document files are not stackable.
 *
 * Failure modes are reported via toast (one per failure) rather than
 * swallowed silently. Per-file is sequential — readers run one at a time
 * so layer order matches drop / pick order.
 */
import { useEditorStore } from '../store/editorStore';

export interface IngestSummary {
    opened: string | null;
    layered: string[];
    skipped: string[];
    rejected: string | null;
}

function isImageFile(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    // Some OS drag-drops omit `type`; fall back to extension.
    return /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name);
}

function readAsImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Could not decode ${file.name}`));
            img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
        reader.readAsDataURL(file);
    });
}

function readAsPhotowebDoc(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
        reader.readAsText(file);
    });
}

/**
 * Process a list of dropped / picked files. Returns a summary suitable for
 * a single end-of-ingest toast. Routes the first image to a new document
 * iff `treatFirstAsNewDoc` is true and the store has no layers.
 */
export async function ingestFiles(
    files: File[],
    opts: { treatFirstAsNewDoc?: boolean } = {},
): Promise<IngestSummary> {
    const summary: IngestSummary = {
        opened: null,
        layered: [],
        skipped: [],
        rejected: null,
    };
    if (files.length === 0) return summary;

    // Photoweb native documents are not stackable. Reject mixed or
    // multi-pwbdoc drops up front; allow a single .pwbdoc through to the
    // existing loadFile path (handled by callers, not here).
    const photowebFiles = files.filter(f => f.name.toLowerCase().endsWith('.pwbdoc'));
    if (photowebFiles.length > 1) {
        summary.rejected = 'Only one .pwbdoc file can be opened at a time';
        return summary;
    }
    if (photowebFiles.length === 1 && files.length > 1) {
        summary.rejected = `Can't mix .pwbdoc files with images`;
        return summary;
    }
    if (photowebFiles.length === 1) {
        // Single .pwbdoc — write to localStorage and load through the store.
        const file = photowebFiles[0];
        try {
            const text = await readAsPhotowebDoc(file);
            const base = file.name.replace(/\.pwbdoc$/i, '');
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(`photoweb-doc:${base}`, text);
            }
            await useEditorStore.getState().loadFile(base);
            summary.opened = file.name;
        } catch {
            summary.rejected = `Could not open ${file.name}`;
        }
        return summary;
    }

    // From here on, only image files (we already excluded .pwbdoc above).
    let firstAsNew = !!opts.treatFirstAsNewDoc;
    if (firstAsNew && useEditorStore.getState().layers.length > 0) {
        firstAsNew = false; // existing doc — every file adds as a layer
    }

    for (const file of files) {
        if (!isImageFile(file)) {
            summary.skipped.push(file.name);
            continue;
        }
        try {
            const img = await readAsImage(file);
            const s = useEditorStore.getState();
            if (firstAsNew && summary.opened === null) {
                s.openImageAsDocument(img, file.name);
                summary.opened = file.name;
            } else {
                s.addLayerFromImage(img, file.name);
                summary.layered.push(file.name);
            }
        } catch {
            summary.skipped.push(file.name);
        }
    }
    return summary;
}

/**
 * Convert an IngestSummary into a single user-facing toast message and
 * severity. Returns null when nothing happened (eg. all-empty drop).
 */
export function summaryToast(summary: IngestSummary): { message: string; level: 'success' | 'info' | 'error' } | null {
    if (summary.rejected) return { message: summary.rejected, level: 'error' };
    const total = (summary.opened ? 1 : 0) + summary.layered.length;
    if (total === 0 && summary.skipped.length === 0) return null;
    if (total === 0) return { message: `Skipped ${summary.skipped.length} non-image file(s)`, level: 'info' };
    if (summary.opened && summary.layered.length === 0) {
        return { message: `Opened "${summary.opened}"`, level: 'success' };
    }
    if (summary.opened && summary.layered.length > 0) {
        return {
            message: `Opened "${summary.opened}" + added ${summary.layered.length} layer(s)`,
            level: 'success',
        };
    }
    if (summary.layered.length === 1) {
        return { message: `Added "${summary.layered[0]}"`, level: 'success' };
    }
    return { message: `Added ${summary.layered.length} layers`, level: 'success' };
}
