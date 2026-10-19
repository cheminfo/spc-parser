import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { parse } from '../parse.ts';

import { parsedExtensions, summarize } from './summarize.ts';

// Optional run over a local corpus: SPC_CORPUS_DIR=/path/to/corpus npm run test-only
const corpusDirectory = process.env.SPC_CORPUS_DIR;
const ignoredFolders = /venv|node_modules/;

/**
 * Lists recursively the parseable files of a folder.
 * @param root - folder to scan.
 * @returns Absolute paths, sorted.
 */
function listCorpus(root: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(root, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    const isParsed = entry.isFile() && parsedExtensions.test(entry.name);
    const isIgnored = ignoredFolders.exec(entry.parentPath) !== null;
    if (!isParsed || isIgnored) continue;
    files.push(join(entry.parentPath, entry.name));
  }
  return files.toSorted((a, b) => a.localeCompare(b, 'en'));
}

/**
 * Parses a corpus file and describes what is wrong with the result.
 * @param path - absolute path.
 * @returns The problem, or undefined when the file parses cleanly or throws
 * an SpcParserError.
 */
function checkFile(path: string): string | undefined {
  try {
    const summary = summarize(parse, readFileSync(path));
    if (!('xMin' in summary) || summary.points === 0) return undefined;
    if (!Number.isFinite(summary.xMin + summary.xMax)) {
      return `${path}: non-finite X`;
    }
    if (summary.xMin === summary.xMax && summary.points > 1) {
      return `${path}: constant X`;
    }
    return undefined;
  } catch (error) {
    return `${path}: ${String(error)}`;
  }
}

test.skipIf(!corpusDirectory)(
  'every corpus file parses or throws an SpcParserError',
  () => {
    const failures: string[] = [];
    for (const path of listCorpus(corpusDirectory as string)) {
      const failure = checkFile(path);
      if (failure) failures.push(failure);
    }

    expect(failures).toStrictEqual([]);
  },
  600_000,
);
