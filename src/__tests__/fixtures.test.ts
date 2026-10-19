import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { expect, test } from 'vitest';

const sourceDirectory = join(import.meta.dirname, '..');

const provenanceDirectories = [
  join('galactic', '__tests__', 'data', 'corpus'),
  join('uvProbe', '__tests__', 'data', 'corpus'),
  join('__tests__', 'data'),
];

/**
 * Computes the SHA-256 of a file as a hex string.
 * @param path - absolute file path.
 * @returns The lowercase hex digest.
 */
async function sha256(path: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', readFileSync(path));
  return Buffer.from(digest).toString('hex');
}

/**
 * Reads the file and sha256 columns of a PROVENANCE.md table.
 * @param directory - folder holding the PROVENANCE.md.
 * @returns The expected hash of every listed file.
 */
function readProvenance(directory: string): Record<string, string> {
  const text = readFileSync(join(directory, 'PROVENANCE.md'), 'utf8');
  const hashes: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const [, file, hash] = line.split('|').map((cell) => cell.trim());
    if (file && hash?.length === 64 && !hash.startsWith('-')) {
      hashes[file] = hash;
    }
  }
  return hashes;
}

/**
 * Computes the hash of every file of a folder, PROVENANCE.md excepted.
 * @param directory - the folder.
 * @returns The hash of every file.
 */
async function hashDirectory(
  directory: string,
): Promise<Record<string, string>> {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name !== 'PROVENANCE.md')
    .map((entry) => entry.name);
  const hashes = await Promise.all(
    files.map((file) => sha256(join(directory, file))),
  );
  return Object.fromEntries(
    files.map((file, index) => [file, hashes[index] as string]),
  );
}

/**
 * Lists every fixture file below a `data` folder of the sources.
 * @returns Paths relative to `src`.
 */
function listFixtures(): string[] {
  const entries = readdirSync(sourceDirectory, {
    recursive: true,
    withFileTypes: true,
  });
  const files: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name === 'PROVENANCE.md') continue;
    const path = relative(sourceDirectory, join(entry.parentPath, entry.name));
    if (path.split(sep).includes('data')) files.push(path);
  }
  return files;
}

/**
 * Groups files with identical content when at least one of them is a corpus
 * fixture (a file of a folder with a PROVENANCE.md).
 * @param files - paths relative to `src`.
 * @returns Groups of byte-identical files.
 */
async function findCorpusDuplicates(files: string[]): Promise<string[][]> {
  const hashes = await Promise.all(
    files.map((file) => sha256(join(sourceDirectory, file))),
  );
  const byHash = new Map<string, string[]>();
  for (let index = 0; index < files.length; index++) {
    const hash = hashes[index] as string;
    byHash.set(hash, [...(byHash.get(hash) ?? []), files[index] as string]);
  }
  const duplicates: string[][] = [];
  for (const group of byHash.values()) {
    const isInCorpus = group.some((file) =>
      provenanceDirectories.some((directory) =>
        file.startsWith(directory + sep),
      ),
    );
    if (group.length > 1 && isInCorpus) duplicates.push(group);
  }
  return duplicates;
}

test.each(provenanceDirectories)(
  '%s/PROVENANCE.md lists every file with its sha256',
  async (directory) => {
    const absolute = join(sourceDirectory, directory);

    await expect(hashDirectory(absolute)).resolves.toStrictEqual(
      readProvenance(absolute),
    );
  },
);

test('no corpus fixture duplicates another fixture', async () => {
  const fixtures = listFixtures();

  expect(fixtures).toStrictEqual(
    expect.arrayContaining([
      join('galactic', '__tests__', 'data', 'corpus', 'DEMO_3D.SPC'),
      join('galactic', '__tests__', 'data', 'm_evenz.spc'),
      join(
        'uvProbe',
        '__tests__',
        'data',
        'corpus',
        'shimadzu-flat-F80A20-1.SPC',
      ),
      join('__tests__', 'data', 'not-spc-uvprobe-kinetics.kin'),
    ]),
  );
  await expect(findCorpusDuplicates(fixtures)).resolves.toStrictEqual([]);
});
