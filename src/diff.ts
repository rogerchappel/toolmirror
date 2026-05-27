import { stableStringify } from './stable.js';
import type { DiffReport, ToolCatalog, ToolChange, ToolDefinition } from './types.js';

export function diffCatalogs(before: ToolCatalog, after: ToolCatalog): DiffReport {
  const beforeByName = indexByName(before.tools);
  const afterByName = indexByName(after.tools);
  const added = after.tools.filter((tool) => !beforeByName.has(tool.name));
  const removed = before.tools.filter((tool) => !afterByName.has(tool.name));
  const changed: ToolChange[] = [];
  let unchanged = 0;

  for (const beforeTool of before.tools) {
    const afterTool = afterByName.get(beforeTool.name);
    if (!afterTool) continue;

    const changes = compareTool(beforeTool, afterTool);
    if (changes.length > 0) {
      changed.push({ name: beforeTool.name, before: beforeTool, after: afterTool, changes });
    } else {
      unchanged += 1;
    }
  }

  return {
    added,
    removed,
    changed,
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      unchanged
    }
  };
}

function compareTool(before: ToolDefinition, after: ToolDefinition): string[] {
  const changes: string[] = [];
  if (before.description !== after.description) changes.push('description changed');
  if (stableStringify(before.schema) !== stableStringify(after.schema)) changes.push('schema changed');
  if (stableStringify(before.parameters) !== stableStringify(after.parameters)) changes.push('parameters changed');
  if (before.risk.level !== after.risk.level) changes.push(`risk changed from ${before.risk.level} to ${after.risk.level}`);
  return [...new Set(changes)];
}

function indexByName(tools: ToolDefinition[]): Map<string, ToolDefinition> {
  return new Map(tools.map((tool) => [tool.name, tool]));
}
