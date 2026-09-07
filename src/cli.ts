#!/usr/bin/env node
import { basename } from 'node:path';
import { diffCatalogs } from './diff.js';
import { readJsonFile, writeTextFile } from './io.js';
import { renderMarkdown } from './markdown.js';
import { coerceCatalog, normalizeCatalogs } from './normalize.js';
import { filterByMinimumRisk } from './risk.js';
import { stableStringify } from './stable.js';
import type { DiffReport, RiskLevel, ToolCatalog, ToolDefinition } from './types.js';

type Command = 'import' | 'docs' | 'diff' | 'risk' | 'help';

interface ParsedArgs {
  command: Command;
  positionals: string[];
  options: Map<string, string | boolean>;
}

interface CommandContract {
  minPositionals: number;
  maxPositionals?: number;
  options: readonly string[];
}

const riskLevels: RiskLevel[] = ['low', 'medium', 'high'];
const commandContracts: Record<Command, CommandContract> = {
  import: { minPositionals: 1, options: ['output'] },
  docs: { minPositionals: 1, maxPositionals: 1, options: ['output'] },
  diff: { minPositionals: 2, maxPositionals: 2, options: ['format', 'output'] },
  risk: { minPositionals: 1, maxPositionals: 1, options: ['min', 'fail-on', 'output'] },
  help: { minPositionals: 0, maxPositionals: 0, options: [] }
};

async function main(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    switch (args.command) {
      case 'import':
        return await importCommand(args);
      case 'docs':
        return await docsCommand(args);
      case 'diff':
        return await diffCommand(args);
      case 'risk':
        return await riskCommand(args);
      case 'help':
        process.stdout.write(usage());
        return 0;
    }
  } catch (error) {
    process.stderr.write(`toolmirror: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

async function importCommand(args: ParsedArgs): Promise<number> {
  if (args.positionals.length === 0) {
    throw new Error('import requires at least one JSON input');
  }
  if (args.positionals.filter((path) => path === '-').length > 1) {
    throw new Error('import accepts at most one stdin input ("-")');
  }

  const inputs = await Promise.all(
    args.positionals.map(async (path) => ({
      label: path === '-' ? 'stdin' : basename(path),
      value: await readJsonFile(path)
    }))
  );

  await writeTextFile(outputPath(args), stableStringify(normalizeCatalogs(inputs)));
  return 0;
}

async function docsCommand(args: ParsedArgs): Promise<number> {
  const [catalogPath] = args.positionals;
  if (!catalogPath) {
    throw new Error('docs requires a catalog JSON input');
  }

  const catalog = coerceCatalog(await readJsonFile(catalogPath), catalogPath);
  await writeTextFile(outputPath(args), renderMarkdown(catalog));
  return 0;
}

async function diffCommand(args: ParsedArgs): Promise<number> {
  const [beforePath, afterPath] = args.positionals;
  if (!beforePath || !afterPath) {
    throw new Error('diff requires before and after catalog JSON inputs');
  }

  const before = coerceCatalog(await readJsonFile(beforePath), beforePath);
  const after = coerceCatalog(await readJsonFile(afterPath), afterPath);
  const report = diffCatalogs(before, after);
  const format = stringOption(args, 'format', 'text');

  if (format === 'json') {
    await writeTextFile(outputPath(args), stableStringify(report));
  } else if (format === 'text') {
    await writeTextFile(outputPath(args), renderDiff(report));
  } else {
    throw new Error('--format must be "text" or "json"');
  }

  return report.summary.added + report.summary.removed + report.summary.changed > 0 ? 2 : 0;
}

async function riskCommand(args: ParsedArgs): Promise<number> {
  const [catalogPath] = args.positionals;
  if (!catalogPath) {
    throw new Error('risk requires a catalog JSON input');
  }

  const minimum = riskOption(args, 'min', 'medium');
  const failOn = optionalRiskOption(args, 'fail-on');
  const catalog = coerceCatalog(await readJsonFile(catalogPath), catalogPath);
  const riskyTools = filterByMinimumRisk(catalog.tools, minimum);

  await writeTextFile(outputPath(args), renderRisk(riskyTools, minimum));

  if (failOn && filterByMinimumRisk(catalog.tools, failOn).length > 0) {
    return 3;
  }
  return 0;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [rawCommand = 'help', ...rest] = argv;
  const command = rawCommand === '--help' || rawCommand === '-h' ? 'help' : rawCommand;
  if (!isCommand(command)) {
    throw new Error(`unknown command: ${rawCommand}\n\n${usage()}`);
  }

  const positionals: string[] = [];
  const options = new Map<string, string | boolean>();

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }

    const option = arg.slice(2);
    const equalsIndex = option.indexOf('=');
    const rawName = equalsIndex === -1 ? option : option.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : option.slice(equalsIndex + 1);
    if (!rawName) throw new Error(`invalid option: ${arg}`);
    if (!commandContracts[command].options.includes(rawName)) {
      throw new Error(`unsupported option for ${command}: --${rawName}`);
    }

    if (inlineValue !== undefined) {
      if (inlineValue.length === 0) throw new Error(`--${rawName} requires a value`);
      options.set(rawName, inlineValue);
      continue;
    }

    const next = rest[index + 1];
    if (next && !next.startsWith('--')) {
      options.set(rawName, next);
      index += 1;
    } else throw new Error(`--${rawName} requires a value`);
  }

  const contract = commandContracts[command];
  if (positionals.length < contract.minPositionals) {
    throw new Error(`${command} requires at least ${contract.minPositionals} positional argument${contract.minPositionals === 1 ? '' : 's'}`);
  }
  if (contract.maxPositionals !== undefined && positionals.length > contract.maxPositionals) {
    throw new Error(`${command} accepts ${contract.maxPositionals} positional argument${contract.maxPositionals === 1 ? '' : 's'}`);
  }

  return { command, positionals, options };
}

function outputPath(args: ParsedArgs): string | undefined {
  return args.options.get('output') as string | undefined;
}

function stringOption(args: ParsedArgs, name: string, fallback: string): string {
  const value = args.options.get(name);
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new Error(`--${name} requires a value`);
  return value;
}

function riskOption(args: ParsedArgs, name: string, fallback: RiskLevel): RiskLevel {
  const value = stringOption(args, name, fallback);
  if (!isRiskLevel(value)) throw new Error(`--${name} must be one of: ${riskLevels.join(', ')}`);
  return value;
}

function optionalRiskOption(args: ParsedArgs, name: string): RiskLevel | undefined {
  if (!args.options.has(name)) return undefined;
  return riskOption(args, name, 'high');
}

function renderDiff(report: DiffReport): string {
  const lines = [
    `Added: ${report.summary.added}`,
    `Removed: ${report.summary.removed}`,
    `Changed: ${report.summary.changed}`,
    `Unchanged: ${report.summary.unchanged}`,
    ''
  ];

  appendTools(lines, 'Added tools', report.added);
  appendTools(lines, 'Removed tools', report.removed);

  if (report.changed.length > 0) {
    lines.push('Changed tools');
    for (const change of report.changed) {
      lines.push(`- ${change.name}: ${change.changes.join(', ')}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}`;
}

function renderRisk(tools: ToolDefinition[], minimum: RiskLevel): string {
  const lines = [`Risk report (${minimum}+)`, ''];
  if (tools.length === 0) {
    lines.push('No matching tools.', '');
    return lines.join('\n');
  }

  for (const tool of tools) {
    lines.push(`- ${tool.name}: ${tool.risk.level} - ${tool.risk.reasons.join('; ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

function appendTools(lines: string[], heading: string, tools: ToolDefinition[]): void {
  if (tools.length === 0) return;
  lines.push(heading);
  for (const tool of tools) {
    lines.push(`- ${tool.name} (${tool.risk.level})`);
  }
  lines.push('');
}

function usage(): string {
  return `Usage:
  toolmirror import <catalog.json...> [--output toolmirror.lock.json]
  toolmirror docs <catalog.json> [--output TOOLING.md]
  toolmirror diff <before.json> <after.json> [--format text|json] [--output diff.txt]
  toolmirror risk <catalog.json> [--min low|medium|high] [--fail-on low|medium|high] [--output risk.txt]
`;
}

function isCommand(value: string): value is Command {
  return ['import', 'docs', 'diff', 'risk', 'help'].includes(value);
}

function isRiskLevel(value: string): value is RiskLevel {
  return riskLevels.includes(value as RiskLevel);
}

process.exitCode = await main(process.argv.slice(2));
