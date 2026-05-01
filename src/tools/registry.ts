import type { Tool } from './Tool';

const registry: Record<string, Tool> = {};

export function registerTool(tool: Tool): void {
    registry[tool.id] = tool;
}

export function getTool(id: string): Tool | undefined {
    return registry[id];
}

export function listTools(): Tool[] {
    return Object.values(registry);
}

export function unregisterTool(id: string): void {
    delete registry[id];
}
