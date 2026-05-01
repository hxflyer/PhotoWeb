import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { Toolbar } from './components/Panels/Toolbar';
import { LayersPanel } from './components/Panels/LayersPanel';
import { PropertiesPanel } from './components/Panels/PropertiesPanel';
import { Viewport } from './components/Canvas/Viewport';
import { useEditorStore } from './store/editorStore';
import { InputNumberDialog } from './components/Dialogs/InputNumberDialog';
import './App.css'; // Ensure we have the global styles resetting body if not in index.css (done in index.css)

function App() {
  const { layers, addLayer, dialogs, setFeatherDialogOpen, setSelectionFeather, selection } = useEditorStore();

  useEffect(() => {
    // Initialize with a default layer if empty
    if (layers.length === 0) {
      addLayer();
    }
  }, []); // Run once on mount

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      } else if ((key === 'z' && (e.shiftKey || e.altKey)) || (key === 'y')) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <MainLayout
        toolbar={<Toolbar />}
        propertiesPanel={<PropertiesPanel />}
        layersPanel={<LayersPanel />}
        canvas={<Viewport />}
      />
      <InputNumberDialog
        isOpen={dialogs.isFeatherDialogOpen}
        onClose={() => setFeatherDialogOpen(false)}
        onConfirm={(val) => setSelectionFeather(val)}
        title="Selection Feather"
        label="Feather Radius (px)"
        initialValue={selection.feather || 0}
        min={0}
        max={200}
      />
    </>
  );
}

export default App;
