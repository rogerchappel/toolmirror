import { isObject } from './stable.js';
import type { JsonObject, JsonValue } from './types.js';

const sensitivePattern = /(api[-_]?key|auth|bearer|credential|password|private[-_]?key|secret|token)/i;
const defaultLikeKeys = new Set(['const', 'default', 'enum', 'example', 'examples']);

export function isSensitiveName(name: string): boolean {
  return sensitivePattern.test(name);
}

export function redactSensitiveDefaults(value: JsonValue, path: string[] = []): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveDefaults(item, path));
  }

  if (!isObject(value)) {
    return value;
  }

  const output: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    const nextPath = [...path, key];
    const insideSensitiveProperty = nextPath.some((part) => isSensitiveName(part));

    if (insideSensitiveProperty && defaultLikeKeys.has(key)) {
      output[key] = '[REDACTED]';
      continue;
    }

    output[key] = redactSensitiveDefaults(child, nextPath);
  }
  return output;
}
