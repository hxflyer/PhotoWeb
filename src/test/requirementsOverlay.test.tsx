import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import type { FormEvent } from 'react';
import { RequirementsOverlay } from '../components/Overlay/RequirementsOverlay';
import { useEditorStore } from '../store/editorStore';
import { runScript } from './simulator';
import type { RequirementItem } from '../store/types';

class FakeEventSource {
    static instances: FakeEventSource[] = [];
    onmessage: ((event: MessageEvent<string>) => void) | null = null;
    onerror: (() => void) | null = null;
    closed = false;
    url: string;

    constructor(url: string) {
        this.url = url;
        FakeEventSource.instances.push(this);
    }

    emit(payload: unknown) {
        this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
    }

    close() {
        this.closed = true;
    }
}

function makeRequirement(overrides: Partial<RequirementItem>): RequirementItem {
    return {
        id: overrides.id ?? crypto.randomUUID(),
        title: overrides.title ?? 'Test requirement',
        rawPrompt: overrides.rawPrompt ?? 'Test requirement',
        normalizedPrompt: overrides.normalizedPrompt ?? overrides.rawPrompt ?? 'Test requirement',
        status: overrides.status ?? 'queued',
        createdAt: overrides.createdAt ?? '2026-05-10T12:00:00.000Z',
        updatedAt: overrides.updatedAt ?? '2026-05-10T12:00:00.000Z',
        source: overrides.source ?? 'user',
        priority: overrides.priority ?? 'normal',
        sourceContext: overrides.sourceContext,
        resultSummary: overrides.resultSummary,
        failureReason: overrides.failureReason,
        changedFiles: overrides.changedFiles ?? [],
        verification: overrides.verification ?? {
            typecheck: 'not-run',
            lint: 'not-run',
            tests: 'not-run',
        },
        runner: overrides.runner,
        reviewWorkspace: overrides.reviewWorkspace,
        appliedAt: overrides.appliedAt,
        mergeCommit: overrides.mergeCommit,
        startedAt: overrides.startedAt,
        completedAt: overrides.completedAt,
    };
}

describe('RequirementsOverlay', () => {
    const originalFetch = globalThis.fetch;
    const originalEventSource = globalThis.EventSource;

    beforeEach(() => {
        cleanup();
        FakeEventSource.instances = [];
        useEditorStore.setState(state => ({
            ...state,
            isRequirementsOverlayOpen: false,
            requirementsConnection: 'offline',
            requirementsDraft: '',
            selectedRequirementId: null,
            requirements: [],
            requirementLogs: {},
            documentName: 'OverlayDoc',
            activeTool: 'brush',
            activeLayerId: 'layer-1',
            selectedLayerIds: ['layer-1'],
            zoom: 1,
        }));
    });

    afterEach(() => {
        cleanup();
        globalThis.fetch = originalFetch;
        globalThis.EventSource = originalEventSource;
        vi.restoreAllMocks();
    });

    it('opens the queue, submits a requirement, and applies streamed status updates', async () => {
        const existing = makeRequirement({
            id: 'existing-1',
            title: 'Existing queued requirement',
            rawPrompt: 'Existing queued requirement',
            createdAt: '2026-05-10T12:00:00.000Z',
        });
        const failed = makeRequirement({
            id: 'failed-1',
            title: 'Failed GIF export requirement',
            rawPrompt: 'Failed GIF export requirement',
            status: 'failed',
            createdAt: '2026-05-10T12:02:00.000Z',
            failureReason: 'Codex exited with code 2',
            reviewWorkspace: {
                branchName: 'agent/failed-1-1234',
                worktreePath: '/tmp/photoweb-review-failed-1',
                baseRef: 'main',
            },
        });
        const retried = makeRequirement({
            ...failed,
            status: 'queued',
            failureReason: undefined,
            reviewWorkspace: undefined,
        });
        const created = makeRequirement({
            id: 'created-1',
            title: 'Fix the overlay submit flow',
            rawPrompt: 'Fix the overlay submit flow',
        });

        const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;
            if (url.endsWith('/requirements') && (!init || init.method === undefined)) {
                return new Response(JSON.stringify({ items: [failed, existing] }), { status: 200 });
            }
            if (url.endsWith('/requirements') && init?.method === 'POST') {
                return new Response(JSON.stringify({ item: created }), { status: 201 });
            }
            if (url.endsWith('/requirements/failed-1/retry') && init?.method === 'POST') {
                return new Response(JSON.stringify({ item: retried }), { status: 200 });
            }
            if (url.endsWith('/requirements/failed-1') && init?.method === 'DELETE') {
                return new Response(JSON.stringify({ ok: true }), { status: 200 });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });
        globalThis.fetch = fetchMock;
        globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;

        const submitSpy = vi.fn((event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
        });
        const { container, findByTestId, getByTestId, queryByTestId } = render(
            <form onSubmit={submitSpy}>
                <RequirementsOverlay />
            </form>,
        );

        await runScript([{ type: 'click', target: getByTestId('requirements-overlay-toggle') }], container);

        await findByTestId('requirement-item-existing-1');
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4317/requirements');
        });
        await waitFor(() => {
            expect(FakeEventSource.instances).toHaveLength(1);
        });
        expect(queryByTestId('requirement-resubmit-failed-1')).toBeNull();

        await runScript([
            { type: 'click', target: getByTestId('requirement-retry-button') },
        ], container);
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4317/requirements/failed-1/retry', expect.objectContaining({ method: 'POST' }));
        });

        await runScript([
            { type: 'click', target: getByTestId('requirement-remove-failed-1') },
        ], container);
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4317/requirements/failed-1', expect.objectContaining({ method: 'DELETE' }));
            expect(queryByTestId('requirement-item-failed-1')).toBeNull();
            expect(submitSpy).not.toHaveBeenCalled();
        });

        await runScript([
            { type: 'type', target: getByTestId('requirements-overlay-input'), text: 'Fix the overlay submit flow' },
            { type: 'click', target: getByTestId('requirements-overlay-submit') },
        ], container);

        await findByTestId('requirement-item-created-1');
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith(
                'http://localhost:4317/requirements',
                expect.objectContaining({ method: 'POST' }),
            );
            expect(submitSpy).not.toHaveBeenCalled();
        });

        const source = FakeEventSource.instances[0];
        source.emit({
            type: 'requirement.log',
            requirementId: created.id,
            line: 'Host verification started',
        });
        source.emit({
            type: 'requirement.updated',
            item: {
                ...created,
                status: 'done',
                runner: 'codex',
                changedFiles: ['host/src/server.ts'],
                resultSummary: 'Implemented the request and merged it into main.',
                verification: { typecheck: 'pass', lint: 'pass', tests: 'pass' },
                mergeCommit: 'abc123def456',
                appliedAt: '2026-05-10T12:01:00.000Z',
                reviewWorkspace: {
                    branchName: 'agent/created-1-1234',
                    worktreePath: '/tmp/photoweb-review-created-1',
                    baseRef: 'main',
                },
            },
        });

        await waitFor(() => {
            expect(getByTestId('requirement-selected-status').textContent).toContain('Done');
            expect(container.textContent).toContain('host/src/server.ts');
            expect(container.textContent).toContain('Host verification started');
            expect(container.textContent).toContain('abc123def456');
        });
    });

    it('renders only the latest execution logs so noisy agent output stays responsive', async () => {
        const existing = makeRequirement({
            id: 'existing-1',
            title: 'Existing queued requirement',
            rawPrompt: 'Existing queued requirement',
            createdAt: '2026-05-10T12:00:00.000Z',
        });

        globalThis.fetch = vi.fn<typeof fetch>(async (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;
            if (url.endsWith('/requirements') && (!init || init.method === undefined)) {
                return new Response(JSON.stringify({ items: [existing] }), { status: 200 });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });
        globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;

        const { container, findByTestId, getByTestId } = render(<RequirementsOverlay />);

        await runScript([{ type: 'click', target: getByTestId('requirements-overlay-toggle') }], container);
        await findByTestId('requirement-item-existing-1');
        await waitFor(() => {
            expect(FakeEventSource.instances).toHaveLength(1);
        });

        const source = FakeEventSource.instances[0];
        for (let index = 0; index < 210; index += 1) {
            source.emit({
                type: 'requirement.log',
                requirementId: existing.id,
                line: `agent log line ${String(index).padStart(3, '0')}`,
            });
        }

        await waitFor(() => {
            expect(container.textContent).toContain('Showing latest 200 lines; 10 older lines hidden.');
            expect(container.textContent).toContain('agent log line 209');
            expect(container.textContent).toContain('agent log line 010');
            expect(container.textContent).not.toContain('agent log line 009');
            expect(container.textContent).not.toContain('agent log line 000');
        });
    });

    it('receives queue updates while the popup is closed', async () => {
        const created = makeRequirement({
            id: 'created-while-closed',
            title: 'Created while closed',
            rawPrompt: 'Created while closed',
            status: 'queued',
            createdAt: '2026-05-10T12:03:00.000Z',
        });

        globalThis.fetch = vi.fn<typeof fetch>(async (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;
            if (url.endsWith('/requirements') && (!init || init.method === undefined)) {
                return new Response(JSON.stringify({ items: [] }), { status: 200 });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });
        globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;

        const { container, findByTestId, getByTestId } = render(<RequirementsOverlay />);

        await waitFor(() => {
            expect(FakeEventSource.instances).toHaveLength(1);
        });
        FakeEventSource.instances[0].emit({
            type: 'requirement.created',
            item: created,
        });

        await runScript([{ type: 'click', target: getByTestId('requirements-overlay-toggle') }], container);
        await findByTestId('requirement-item-created-while-closed');

        FakeEventSource.instances[0].emit({
            type: 'requirement.removed',
            requirementId: created.id,
        });
        await waitFor(() => {
            expect(container.textContent).not.toContain('Created while closed');
        });
    });

    it('refreshes and stops a running task without submitting the page', async () => {
        const running = makeRequirement({
            id: 'running-1',
            title: 'Long running task',
            rawPrompt: 'Long running task',
            status: 'running',
            createdAt: '2026-05-10T12:05:00.000Z',
            startedAt: '2026-05-10T12:05:01.000Z',
            runner: 'codex',
            reviewWorkspace: {
                branchName: 'agent/running-1-1234',
                worktreePath: '/tmp/photoweb-review-running-1',
                baseRef: 'main',
            },
        });
        const refreshed = {
            ...running,
            failureReason: undefined,
        };
        const stopped = makeRequirement({
            ...running,
            status: 'cancelled',
            completedAt: '2026-05-10T12:06:00.000Z',
            failureReason: 'Stopped by user.',
            reviewWorkspace: undefined,
            runner: undefined,
        });

        const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;
            if (url.endsWith('/requirements') && (!init || init.method === undefined)) {
                return new Response(JSON.stringify({ items: [running] }), { status: 200 });
            }
            if (url.endsWith('/requirements/running-1/refresh') && init?.method === 'POST') {
                return new Response(JSON.stringify({ item: refreshed }), { status: 200 });
            }
            if (url.endsWith('/requirements/running-1/stop') && init?.method === 'POST') {
                return new Response(JSON.stringify({ item: stopped }), { status: 200 });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });
        globalThis.fetch = fetchMock;
        globalThis.EventSource = FakeEventSource as unknown as typeof EventSource;

        const submitSpy = vi.fn((event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
        });
        const { container, findByTestId, getByTestId } = render(
            <form onSubmit={submitSpy}>
                <RequirementsOverlay />
            </form>,
        );

        await runScript([{ type: 'click', target: getByTestId('requirements-overlay-toggle') }], container);
        await findByTestId('requirement-item-running-1');

        await runScript([
            { type: 'click', target: getByTestId('requirement-refresh-button') },
        ], container);
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4317/requirements/running-1/refresh', expect.objectContaining({ method: 'POST' }));
            expect(submitSpy).not.toHaveBeenCalled();
        });

        await runScript([
            { type: 'click', target: getByTestId('requirement-stop-button') },
        ], container);
        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4317/requirements/running-1/stop', expect.objectContaining({ method: 'POST' }));
            expect(getByTestId('requirement-selected-status').textContent).toContain('Cancelled');
            expect(submitSpy).not.toHaveBeenCalled();
        });
    });
});
