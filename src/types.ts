export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface ToolParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ToolRisk {
  level: RiskLevel;
  reasons: string[];
  verbs: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  schema: JsonValue;
  source: string;
  risk: ToolRisk;
}

export interface ToolCatalog {
  schemaVersion: 1;
  generatedBy: 'toolmirror';
  tools: ToolDefinition[];
}

export interface DiffReport {
  added: ToolDefinition[];
  removed: ToolDefinition[];
  changed: ToolChange[];
  summary: {
    added: number;
    removed: number;
    changed: number;
    unchanged: number;
  };
}

export interface ToolChange {
  name: string;
  before: ToolDefinition;
  after: ToolDefinition;
  changes: string[];
}
