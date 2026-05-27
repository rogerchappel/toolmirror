import { redactSensitiveDefaults } from './redact.js';
import { scanRisk } from './risk.js';
import { isObject, sortJson, stableCompare } from './stable.js';
import type { JsonObject, JsonValue, ToolCatalog, ToolDefinition, ToolParameter } from './types.js';

interface Candidate {
  name: string;
  description: string;
  schema: JsonValue;
  source: string;
}

export function normalizeCatalogs(inputs: Array<{ label: string; value: JsonValue }>): ToolCatalog {
  const byName = new Map<string, ToolDefinition>();

  for (const input of inputs) {
    for (const candidate of extractCandidates(input.value, input.label)) {
      const schema = sortJson(redactSensitiveDefaults(candidate.schema));
      const parameters = summarizeParameters(schema);
      byName.set(candidate.name, {
        name: candidate.name,
        description: candidate.description,
        parameters,
        schema,
        source: candidate.source,
        risk: scanRisk(candidate.name, candidate.description, parameters.map((parameter) => parameter.name))
      });
    }
  }

  return {
    schemaVersion: 1,
    generatedBy: 'toolmirror',
    tools: [...byName.values()].sort((a, b) => stableCompare(a.name, b.name))
  };
}

export function coerceCatalog(value: JsonValue, label = 'catalog'): ToolCatalog {
  if (isObject(value) && value.schemaVersion === 1 && value.generatedBy === 'toolmirror' && Array.isArray(value.tools)) {
    return normalizeCatalogs([{ label, value: value.tools }]);
  }

  return normalizeCatalogs([{ label, value }]);
}

function extractCandidates(value: JsonValue, source: string): Candidate[] {
  const candidates: Candidate[] = [];
  walk(value, source, candidates);
  return candidates;
}

function walk(value: JsonValue, source: string, candidates: Candidate[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${source}[${index}]`, candidates));
    return;
  }

  if (!isObject(value)) return;

  const direct = candidateFromObject(value, source);
  if (direct) {
    candidates.push(direct);
    return;
  }

  for (const key of ['tools', 'functions']) {
    const child = value[key];
    if (Array.isArray(child)) {
      child.forEach((item, index) => walk(item, `${source}.${key}[${index}]`, candidates));
    }
  }

  const capabilities = value.capabilities;
  if (isObject(capabilities) && Array.isArray(capabilities.tools)) {
    capabilities.tools.forEach((item, index) => walk(item, `${source}.capabilities.tools[${index}]`, candidates));
  }
}

function candidateFromObject(value: JsonObject, source: string): Candidate | undefined {
  if (value.type === 'function' && isObject(value.function)) {
    return candidateFromObject(value.function, `${source}.function`);
  }

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return undefined;

  const schema = pickSchema(value);
  if (schema === undefined && typeof value.description !== 'string') return undefined;

  return {
    name,
    description: typeof value.description === 'string' ? value.description.trim() : '',
    schema: schema ?? { type: 'object', properties: {} },
    source
  };
}

function pickSchema(value: JsonObject): JsonValue | undefined {
  for (const key of ['inputSchema', 'parameters', 'schema']) {
    const schema = value[key];
    if (schema !== undefined) return schema;
  }
  return undefined;
}

function summarizeParameters(schema: JsonValue): ToolParameter[] {
  if (!isObject(schema)) return [];

  const properties = isObject(schema.properties) ? schema.properties : {};
  const required = new Set(Array.isArray(schema.required) ? schema.required.filter((item): item is string => typeof item === 'string') : []);

  return Object.entries(properties)
    .map(([name, value]) => ({
      name,
      type: describeType(value),
      required: required.has(name),
      description: isObject(value) && typeof value.description === 'string' ? value.description : ''
    }))
    .sort((a, b) => stableCompare(a.name, b.name));
}

function describeType(value: JsonValue): string {
  if (!isObject(value)) return 'unknown';
  if (typeof value.type === 'string') return value.type;
  if (Array.isArray(value.type)) return value.type.filter((item): item is string => typeof item === 'string').join(' | ') || 'unknown';
  if (Array.isArray(value.enum)) return 'enum';
  return 'object';
}
