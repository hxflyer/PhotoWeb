import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OptionsBar } from '../components/Panels/OptionsBar';
import { Toolbar } from '../components/Panels/Toolbar';
import { useEditorStore } from '../store/editorStore';
import { getMagneticLassoOptions, setMagneticLassoOptions } from '../tools/magneticLasso';
import { ensureStubsRegistered } from '../tools/stubs';

ensureStubsRegistered();

function reset() {
    useEditorStore.setState((s) => ({
        ...s,
        activeTool: 'lasso',
        toolbarGroupActive: {},
    }));
    setMagneticLassoOptions({ width: 10, contrast: 10, frequency: 57 });
}

describe('13-lasso UI exposure', () => {
    beforeEach(reset);

    it('toolbar lasso flyout exposes and activates Magnetic Lasso', () => {
        render(<Toolbar />);

        fireEvent.contextMenu(screen.getByTestId('toolbar-lasso'));
        fireEvent.click(screen.getByTestId('toolbar-flyout-magnetic-lasso'));

        expect(useEditorStore.getState().activeTool).toBe('magnetic-lasso');
        expect(Object.values(useEditorStore.getState().toolbarGroupActive)).toContain('magnetic-lasso');
    });

    it('Magnetic Lasso Options Bar fields update width contrast and frequency', () => {
        useEditorStore.getState().setTool('magnetic-lasso');
        render(<OptionsBar />);

        fireEvent.change(screen.getByTestId('magnetic-lasso-width'), { target: { value: '22' } });
        fireEvent.change(screen.getByTestId('magnetic-lasso-contrast'), { target: { value: '35' } });
        fireEvent.change(screen.getByTestId('magnetic-lasso-frequency'), { target: { value: '80' } });

        expect(getMagneticLassoOptions()).toMatchObject({ width: 22, contrast: 35, frequency: 80 });
    });
});
