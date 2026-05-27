import type { JsonObject, JsonValue } from './types.js';

export function isObject(value: JsonValue | unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sortJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }

  if (!isObject(value)) {
    return value;
  }

  const sorted: JsonObject = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortJson(value[key]);
  }
  return sorted;
}

export function stableStringify(value: JsonValue, space = 2): string {
  return `${JSON.stringify(sortJson(value), null, space)}\n`;
}

export function stableCompare(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}
