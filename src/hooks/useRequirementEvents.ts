import { useEffect } from 'react';
import { listRequirements, openRequirementsEventSource, type RequirementEvent } from '../bridge/requirementsClient';
import { useEditorStore } from '../store/editorStore';

const REQUIREMENTS_POLL_INTERVAL_MS = 5000;

export function useRequirementEvents(enabled: boolean) {
    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;
        let polling = false;
        const store = useEditorStore.getState();
        store.setRequirementsConnection('connecting');

        const refreshList = async () => {
            if (polling) return;
            polling = true;
            try {
                const items = await listRequirements();
                if (cancelled) return;
                const state = useEditorStore.getState();
                state.replaceRequirements(items);
                state.setRequirementsConnection('online');
            } catch {
                if (cancelled) return;
                useEditorStore.getState().setRequirementsConnection('offline');
            } finally {
                polling = false;
            }
        };

        void refreshList();
        const pollTimer = window.setInterval(() => {
            void refreshList();
        }, REQUIREMENTS_POLL_INTERVAL_MS);

        const source = openRequirementsEventSource();
        if (!source) {
            return () => {
                cancelled = true;
                window.clearInterval(pollTimer);
            };
        }

        source.onmessage = event => {
            if (cancelled) return;
            const payload = JSON.parse(event.data) as RequirementEvent;
            const state = useEditorStore.getState();
            if (payload.type === 'requirement.created' || payload.type === 'requirement.updated') {
                state.upsertRequirement(payload.item);
                state.setRequirementsConnection('online');
                return;
            }
            if (payload.type === 'requirement.removed') {
                state.removeRequirement(payload.requirementId);
                state.setRequirementsConnection('online');
                return;
            }
            if (payload.type === 'requirement.log') {
                state.appendRequirementLog(payload.requirementId, payload.line);
                return;
            }
            if (payload.type === 'host.status') {
                state.setRequirementsConnection('online');
            }
        };
        source.onerror = () => {
            if (cancelled) return;
            useEditorStore.getState().setRequirementsConnection('offline');
        };

        return () => {
            cancelled = true;
            window.clearInterval(pollTimer);
            source.close();
        };
    }, [enabled]);
}
