export const VIEWPORT_FIT_EVENT = 'photoweb:fit-document';

export function requestViewportFit(): void {
    requestAnimationFrame(() => {
        window.dispatchEvent(new Event(VIEWPORT_FIT_EVENT));
    });
}
