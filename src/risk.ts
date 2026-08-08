import type { RiskLevel, ToolDefinition, ToolRisk } from './types.js';

const highVerbs = ['delete', 'destroy', 'drop', 'erase', 'execute', 'exec', 'publish', 'remove', 'run', 'send', 'upload', 'write'];
const mediumVerbs = ['create', 'install', 'modify', 'move', 'patch', 'post', 'put', 'rename', 'set', 'update'];
const riskyParameterPattern = /(command|content|destination|email|file|path|recipient|token|url)/i;

export function scanRisk(name: string, description: string, parameterNames: string[]): ToolRisk {
  const haystack = `${splitIdentifier(name)} ${description}`.toLowerCase();
  const verbs = [...highVerbs, ...mediumVerbs].filter((verb) => containsVerb(haystack, verb));
  const reasons: string[] = [];
  let level: RiskLevel = 'low';

  const highMatches = highVerbs.filter((verb) => containsVerb(haystack, verb));
  if (highMatches.length > 0) {
    level = 'high';
    reasons.push(`matches high-risk verb(s): ${highMatches.join(', ')}`);
  }

  const mediumMatches = mediumVerbs.filter((verb) => containsVerb(haystack, verb));
  if (level === 'low' && mediumMatches.length > 0) {
    level = 'medium';
    reasons.push(`matches state-changing verb(s): ${mediumMatches.join(', ')}`);
  }

  const riskyParameters = parameterNames.filter((parameter) => riskyParameterPattern.test(parameter));
  if (riskyParameters.length > 0) {
    if (level === 'low') {
      level = 'medium';
    }
    reasons.push(`accepts sensitive parameter(s): ${riskyParameters.sort().join(', ')}`);
  }

  if (reasons.length === 0) {
    reasons.push('no risky verbs or sensitive parameters detected');
  }

  return {
    level,
    reasons,
    verbs: verbs.sort()
  };
}

export function filterByMinimumRisk(tools: ToolDefinition[], minimum: RiskLevel): ToolDefinition[] {
  const order: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
  return tools.filter((tool) => order[tool.risk.level] >= order[minimum]);
}

function splitIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

function containsVerb(value: string, verb: string): boolean {
  return new RegExp(`(^|[^a-z])${escapeRegExp(verb)}([^a-z]|$)`, 'i').test(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
