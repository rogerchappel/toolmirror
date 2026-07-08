import { redactSensitiveDefaults } from './redact.js';
import { scanRisk } from './risk.js';
import { isObject, sortJson, stableCompare, stableStringify } from './stable.js';
import type { JsonObject, JsonValue, ToolCatalog, ToolDefinition, ToolParameter } from './types.js';

interface Candidate {
  name: string;
  description: string;
  schema: JsonValue;
  source: string;
}

const OPENAPI_METHODS = new Set(['delete', 'get', 'head', 'options', 'patch', 'post', 'put']);

export function normalizeCatalogs(inputs: Array<{ label: string; value: JsonValue }>): ToolCatalog {
  const byName = new Map<string, ToolDefinition[]>();

  for (const input of inputs) {
    for (const candidate of extractCandidates(input.value, input.label)) {
      const schema = sortJson(redactSensitiveDefaults(candidate.schema));
      const parameters = summarizeParameters(schema);
      const definition = {
        name: candidate.name,
        description: candidate.description,
        parameters,
        schema,
        source: candidate.source,
        risk: scanRisk(candidate.name, candidate.description, parameters.map((parameter) => parameter.name))
      };
      const definitions = byName.get(candidate.name) ?? [];
      definitions.push(definition);
      byName.set(candidate.name, definitions);
    }
  }

  const tools = [...byName.entries()].map(([name, definitions]) => resolveDuplicate(name, definitions));

  return {
    schemaVersion: 1,
    generatedBy: 'toolmirror',
    tools: tools.sort((a, b) => stableCompare(a.name, b.name))
  };
}

function resolveDuplicate(name: string, definitions: ToolDefinition[]): ToolDefinition {
  const ordered = [...definitions].sort((a, b) => stableCompare(a.source, b.source));
  const signatures = new Set(ordered.map(definitionSignature));
  if (signatures.size > 1) {
    throw new Error(`conflicting definitions for tool "${name}" at ${ordered.map((item) => item.source).join(', ')}`);
  }
  return ordered[0];
}

function definitionSignature(definition: ToolDefinition): string {
  const { source: _source, ...content } = definition;
  return stableStringify(content, 0);
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

  collectOpenApiOperations(value, source, candidates);

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

function collectOpenApiOperations(value: JsonObject, source: string, candidates: Candidate[]): void {
  if (typeof value.openapi !== 'string' || !isObject(value.paths)) return;

  for (const [pathName, pathItem] of Object.entries(value.paths)) {
    if (!isObject(pathItem)) continue;
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!OPENAPI_METHODS.has(method.toLowerCase()) || !isObject(operation)) continue;
      const operationId = typeof operation.operationId === 'string' ? operation.operationId.trim() : '';
      const name = operationId || `${method}_${pathName}`.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_|_$/g, '');
      const description = typeof operation.description === 'string'
        ? operation.description.trim()
        : typeof operation.summary === 'string'
          ? operation.summary.trim()
          : '';
      candidates.push({
        name,
        description,
        schema: openApiInputSchema(pathItem, operation, method, pathName),
        source: `${source}.paths.${pathName}.${method}`
      });
    }
  }
}

function openApiInputSchema(pathItem: JsonObject, operation: JsonObject, method: string, pathName: string): JsonObject {
  const properties: JsonObject = {
    method: { type: 'string', description: 'HTTP method', const: method.toUpperCase() },
    path: { type: 'string', description: 'OpenAPI path', const: pathName }
  };
  const required = new Set<string>();
  const parameters = new Map<string, JsonObject>();
  for (const parameter of [...openApiParameters(pathItem), ...openApiParameters(operation)]) {
    const parameterName = typeof parameter.name === 'string' ? parameter.name.trim() : '';
    if (parameterName) parameters.set(parameterName, parameter);
  }

  for (const [parameterName, parameter] of parameters) {
    const schema: JsonObject = isObject(parameter.schema) ? { ...parameter.schema } : { type: 'string' };
    if (typeof parameter.description === 'string' && parameter.description.trim()) {
      schema.description = parameter.description.trim();
    }
    properties[parameterName] = schema;
    if (parameter.required === true || parameter.in === 'path') required.add(parameterName);
  }

  const requestBody = openApiRequestBody(operation.requestBody);
  if (requestBody) {
    properties.body = requestBody.schema;
    if (requestBody.required) required.add('body');
  }

  const schema: JsonObject = { type: 'object', properties };
  if (required.size > 0) schema.required = [...required].sort(stableCompare);
  return schema;
}

function openApiParameters(container: JsonObject): JsonObject[] {
  return Array.isArray(container.parameters) ? container.parameters.filter(isObject) : [];
}

function openApiRequestBody(value: JsonValue | undefined): { schema: JsonValue; required: boolean } | undefined {
  if (!isObject(value)) return undefined;

  if (typeof value.$ref === 'string') {
    return { schema: { $ref: value.$ref }, required: value.required === true };
  }

  if (!isObject(value.content)) return undefined;
  const mediaType = value.content['application/json'] ?? Object.values(value.content).find(isObject);
  if (!isObject(mediaType) || mediaType.schema === undefined) return undefined;
  return { schema: mediaType.schema, required: value.required === true };
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
