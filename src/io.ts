import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { JsonValue } from './types.js';

export async function readJsonFile(path: string): Promise<JsonValue> {
  const label = path === '-' ? 'stdin' : path;
  const raw = path === '-' ? await readStdin() : await readFile(path, 'utf8');
  try {
    return JSON.parse(stripBomPrefix(raw)) as JsonValue;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: ${detail}`);
  }
}

function stripBomPrefix(raw: string): string {
  return raw.startsWith('\uFEFF') ? raw.slice(1) : raw;
}

export async function writeTextFile(path: string | undefined, content: string): Promise<void> {
  if (!path || path === '-') {
    process.stdout.write(content);
    return;
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}
