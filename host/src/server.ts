import { Buffer } from 'node:buffer';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { cwd, env } from 'node:process';
import { RequirementService } from './RequirementService.js';
import { RequirementStore } from './RequirementStore.js';
import { createAgentAdapter } from './runner/createAdapter.js';
import type { CreateRequirementInput, HostEvent } from './types.js';
import { VerificationRunner } from './VerificationRunner.js';
import { WorkspaceManager } from './workspace/WorkspaceManager.js';

const PORT = Number(env.PHOTOWEB_AGENT_HOST_PORT ?? '4317');

function setJsonHeaders(res: ServerResponse, statusCode = 200): void {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE,GET,POST,OPTIONS');
}

function setSseHeaders(res: ServerResponse): void {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of req) {
        if (typeof chunk === 'string') {
            chunks.push(new TextEncoder().encode(chunk));
        } else {
            chunks.push(chunk);
        }
    }
    const text = new TextDecoder().decode(Buffer.concat(chunks));
    if (!text) return null;
    return JSON.parse(text) as T;
}

function sendJson(res: ServerResponse, body: unknown, statusCode = 200): void {
    setJsonHeaders(res, statusCode);
    res.end(JSON.stringify(body));
}

function sendEvent(res: ServerResponse, event: HostEvent): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function bootstrap(): Promise<void> {
    const repoRoot = cwd();
    const agentRoot = resolve(repoRoot, '.photoweb-agent');
    const store = new RequirementStore(resolve(agentRoot, 'requirements.json'));
    const adapter = await createAgentAdapter();
    const workspaceManager = new WorkspaceManager(repoRoot, resolve(agentRoot, 'worktrees'));
    const verificationRunner = new VerificationRunner();
    const service = new RequirementService(store, adapter, workspaceManager, verificationRunner, repoRoot);
    await service.init();

    const server = createServer(async (req, res) => {
        const method = req.method ?? 'GET';
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `localhost:${PORT}`}`);

        if (method === 'OPTIONS') {
            setJsonHeaders(res, 204);
            res.end();
            return;
        }

        if (method === 'GET' && url.pathname === '/health') {
            sendJson(res, { ok: true, busy: false });
            return;
        }

        if (method === 'GET' && url.pathname === '/requirements') {
            sendJson(res, { items: service.list() });
            return;
        }

        if (method === 'POST' && url.pathname === '/requirements') {
            try {
                const body = await readJsonBody<CreateRequirementInput>(req);
                if (!body?.rawPrompt?.trim()) {
                    sendJson(res, { error: 'rawPrompt is required' }, 400);
                    return;
                }
                const item = await service.create(body);
                sendJson(res, { item }, 201);
            } catch {
                sendJson(res, { error: 'Invalid JSON body' }, 400);
            }
            return;
        }

        const retryMatch = method === 'POST'
            ? url.pathname.match(/^\/requirements\/([^/]+)\/retry$/)
            : null;
        if (retryMatch) {
            const item = await service.retry(retryMatch[1]);
            if (!item) {
                sendJson(res, { error: 'Requirement not found' }, 404);
                return;
            }
            sendJson(res, { item });
            return;
        }

        const refreshMatch = method === 'POST'
            ? url.pathname.match(/^\/requirements\/([^/]+)\/refresh$/)
            : null;
        if (refreshMatch) {
            const item = await service.refresh(refreshMatch[1]);
            if (!item) {
                sendJson(res, { error: 'Requirement not found' }, 404);
                return;
            }
            sendJson(res, { item });
            return;
        }

        const stopMatch = method === 'POST'
            ? url.pathname.match(/^\/requirements\/([^/]+)\/stop$/)
            : null;
        if (stopMatch) {
            const item = await service.stop(stopMatch[1]);
            if (!item) {
                sendJson(res, { error: 'Requirement not found' }, 404);
                return;
            }
            sendJson(res, { item });
            return;
        }

        const removeMatch = method === 'DELETE'
            ? url.pathname.match(/^\/requirements\/([^/]+)$/)
            : null;
        if (removeMatch) {
            const removed = await service.remove(removeMatch[1]);
            if (!removed) {
                sendJson(res, { error: 'Requirement not found' }, 404);
                return;
            }
            sendJson(res, { ok: true });
            return;
        }

        if (method === 'GET' && url.pathname === '/events') {
            setSseHeaders(res);
            res.write(': connected\n\n');
            const unsubscribe = service.subscribe(event => {
                sendEvent(res, event);
            });
            req.on('close', () => {
                unsubscribe();
            });
            return;
        }

        sendJson(res, { error: 'Not found' }, 404);
    });

    server.listen(PORT, () => {
        console.log(`Photoweb agent host listening on http://localhost:${PORT}`);
        console.log(`Selected agent runner: ${adapter.name}`);
    });
}

void bootstrap();
