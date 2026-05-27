import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { JsonValue } from './types.js';

export async function readJsonFile(path: string): Promise<JsonValue> {
  const raw = path === '-' ? await readStdin() : await readFile(path, 'utf8');
  return JSON.parse(raw) as JsonValue;
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
