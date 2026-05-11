import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RequirementRecord, RequirementStorePayload } from './types.js';

const EMPTY_STORE: RequirementStorePayload = {
    version: 1,
    items: [],
};

export class RequirementStore {
    constructor(private readonly filePath: string) {}

    async load(): Promise<RequirementRecord[]> {
        try {
            const raw = await readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(raw) as RequirementStorePayload;
            return Array.isArray(parsed.items) ? parsed.items : [];
        } catch {
            return [];
        }
    }

    async save(items: RequirementRecord[]): Promise<void> {
        await mkdir(dirname(this.filePath), { recursive: true });
        const tempPath = `${this.filePath}.tmp`;
        const payload: RequirementStorePayload = {
            ...EMPTY_STORE,
            items,
        };
        await writeFile(tempPath, JSON.stringify(payload, null, 2), 'utf8');
        await rename(tempPath, this.filePath);
    }
}
