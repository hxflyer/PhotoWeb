import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RefineEdgeDialog } from '../components/Dialogs/RefineEdgeDialog';

describe('RefineEdgeDialog', () => {
    it('exposes Selection / Layer Mask / New Layer With Mask as output options', () => {
        render(<RefineEdgeDialog isOpen onClose={vi.fn()} />);
        const select = screen.getByText('Output To').parentElement?.querySelector('select') as HTMLSelectElement | null;
        expect(select).toBeTruthy();
        const values = Array.from(select!.options).map(o => o.value);
        expect(values).toContain('selection');
        expect(values).toContain('layer-mask');
        expect(values).toContain('new-layer-with-mask');
    });
});
