import type { StateCreator } from 'zustand';
import type { EditorStore, RequirementItem, RequirementsSlice } from './types';

const MAX_REQUIREMENT_LOG_LINES = 500;

function sortRequirements(items: RequirementItem[]): RequirementItem[] {
    return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export const createRequirementsSlice: StateCreator<EditorStore, [], [], RequirementsSlice> = (set) => ({
    isRequirementsOverlayOpen: false,
    requirementsConnection: 'offline',
    requirementsDraft: '',
    selectedRequirementId: null,
    requirements: [],
    requirementLogs: {},
    setRequirementsOverlayOpen: (open) => set({ isRequirementsOverlayOpen: open }),
    toggleRequirementsOverlay: () => set(state => ({ isRequirementsOverlayOpen: !state.isRequirementsOverlayOpen })),
    setRequirementsConnection: (connection) => set({ requirementsConnection: connection }),
    setRequirementsDraft: (draft) => set({ requirementsDraft: draft }),
    selectRequirement: (id) => set({ selectedRequirementId: id }),
    replaceRequirements: (items) => set(state => {
        const requirements = sortRequirements(items);
        const selectedRequirementId = requirements.some(item => item.id === state.selectedRequirementId)
            ? state.selectedRequirementId
            : (requirements[0]?.id ?? null);
        return { requirements, selectedRequirementId };
    }),
    upsertRequirement: (item) => set(state => {
        const next = state.requirements.some(existing => existing.id === item.id)
            ? state.requirements.map(existing => existing.id === item.id ? item : existing)
            : [item, ...state.requirements];
        return {
            requirements: sortRequirements(next),
            selectedRequirementId: state.selectedRequirementId ?? item.id,
        };
    }),
    removeRequirement: (id) => set(state => {
        const requirements = state.requirements.filter(item => item.id !== id);
        const requirementLogs = { ...state.requirementLogs };
        delete requirementLogs[id];
        const selectedRequirementId = state.selectedRequirementId === id
            ? (requirements[0]?.id ?? null)
            : state.selectedRequirementId;
        return { requirements, requirementLogs, selectedRequirementId };
    }),
    appendRequirementLog: (requirementId, line) => set(state => ({
        requirementLogs: {
            ...state.requirementLogs,
            [requirementId]: [...(state.requirementLogs[requirementId] ?? []), line].slice(-MAX_REQUIREMENT_LOG_LINES),
        },
    })),
});
