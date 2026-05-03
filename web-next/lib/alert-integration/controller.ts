import fs from 'node:fs/promises';
import path from 'node:path';

export const fallbackDocCopy = '当前告警源暂未提供集成指南。';

type ReadFile = (path: string, encoding: BufferEncoding) => Promise<string>;

export async function loadIntegrationDoc(baseDir: string, source: string, readFile: ReadFile = fs.readFile) {
  const candidates = [`${source}.zh-CN.md`, `${source}.en-US.md`];
  for (const fileName of candidates) {
    try {
      return await readFile(path.join(baseDir, fileName), 'utf8');
    } catch {}
  }
  return fallbackDocCopy;
}
