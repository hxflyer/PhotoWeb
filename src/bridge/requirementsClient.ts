import type { RequirementItem } from '../store/types';

export interface RequirementSubmission {
    rawPrompt: string;
    appContext: {
        documentName: string;
        activeTool: string;
        activeLayerId: string | null;
        selectedLayerIds: string[];
        zoom: number;
    };
}

export type RequirementEvent =
    | { type: 'requirement.created'; item: RequirementItem }
    | { type: 'requirement.updated'; item: RequirementItem }
    | { type: 'requirement.removed'; requirementId: string }
    | { type: 'requirement.log'; requirementId: string; line: string }
    | { type: 'host.status'; busy: boolean; queueDepth: number };

const DEFAULT_HOST_URL = 'http://localhost:4317';

function getHostUrl(): string {
    const configured = import.meta.env.VITE_REQUIREMENTS_HOST_URL;
    return typeof configured === 'string' && configured.trim().length > 0
        ? configured.replace(/\/$/, '')
        : DEFAULT_HOST_URL;
}

function apiUrl(path: string): string {
    return `${getHostUrl()}${path}`;
}

async function parseJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
    }
    return await response.json() as T;
}

export async function listRequirements(): Promise<RequirementItem[]> {
    const data = await parseJson<{ items: RequirementItem[] }>(await fetch(apiUrl('/requirements')));
    return data.items;
}

export async function createRequirement(input: RequirementSubmission): Promise<RequirementItem> {
    const data = await parseJson<{ item: RequirementItem }>(await fetch(apiUrl('/requirements'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    }));
    return data.item;
}

export async function retryRequirement(id: string): Promise<RequirementItem> {
    const data = await parseJson<{ item: RequirementItem }>(await fetch(apiUrl(`/requirements/${id}/retry`), {
        method: 'POST',
    }));
    return data.item;
}

export async function refreshRequirement(id: string): Promise<RequirementItem> {
    const data = await parseJson<{ item: RequirementItem }>(await fetch(apiUrl(`/requirements/${id}/refresh`), {
        method: 'POST',
    }));
    return data.item;
}

export async function stopRequirement(id: string): Promise<RequirementItem> {
    const data = await parseJson<{ item: RequirementItem }>(await fetch(apiUrl(`/requirements/${id}/stop`), {
        method: 'POST',
    }));
    return data.item;
}

export async function removeRequirement(id: string): Promise<void> {
    await parseJson<{ ok: true }>(await fetch(apiUrl(`/requirements/${id}`), {
        method: 'DELETE',
    }));
}

export function openRequirementsEventSource(): EventSource | null {
    if (typeof EventSource === 'undefined') return null;
    return new EventSource(apiUrl('/events'));
}
