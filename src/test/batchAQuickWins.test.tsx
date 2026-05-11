/**
 * Batch A quick wins — simulator-driven coverage for the small dialog/panel
 * polish slice. Each describe-block exercises one item in order.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Batch A — TestDialog removal', () => {
    it('removes the dead Dialogs/TestDialog.tsx file', () => {
        const p = resolve(__dirname, '../components/Dialogs/TestDialog.tsx');
        expect(existsSync(p)).toBe(false);
    });
});
