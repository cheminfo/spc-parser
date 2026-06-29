import * as CFB from 'cfb';

import { buildVariables } from './buildVariables.ts';
import { parsePageText } from './pageTexts.ts';
import type { UvProbeResult } from './parseFlat.ts';
import type { UvProbeMeta } from './types.ts';

/** Days between the OLE automation epoch (1899-12-30) and the Unix epoch. */
const oleDateEpochOffset = 25569;
const millisecondsPerDay = 86400000;

/**
 * Parses the OLE2 compound-document Shimadzu UVProbe `.spc` variant.
 *
 * Wavelength and absorbance are stored as `float64` arrays in the `X Data.1`
 * and `Y Data.1` streams; metadata lives in the `PageTextsN` and
 * `DataSetHistory` streams.
 * @param bytes - the whole file as bytes.
 * @returns The spectrum and its metadata.
 */
export function parseUVProbeOle(bytes: Uint8Array): UvProbeResult {
  const container = CFB.read(bytes, { type: 'buffer' });

  const x = readDoubles(findStream(container, 'X Data.1'));
  const y = readDoubles(findStream(container, 'Y Data.1'));
  if (x.length !== y.length) {
    throw new Error('UVProbe OLE: X and Y streams have different lengths');
  }

  const history = tryStream(container, 'DataSetHistory');
  const meta: UvProbeMeta = {
    kind: 'ole',
    numberPoints: x.length,
    title: history && readTitle(history),
    date: history && readDate(history),
    properties: readProperties(container),
  };

  return { meta, spectra: [{ meta, variables: buildVariables(x, y) }] };
}

/**
 * Reads a stream as a `Float64Array` of little-endian doubles.
 * @param content - raw stream bytes.
 * @returns The decoded values.
 */
function readDoubles(content: Uint8Array): Float64Array {
  const count = Math.floor(content.length / 8);
  const view = new DataView(
    content.buffer,
    content.byteOffset,
    content.byteLength,
  );
  const values = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    values[i] = view.getFloat64(i * 8, true);
  }
  return values;
}

/**
 * Collects every `PageTextsN` stream into property sections keyed by title.
 * @param container - the parsed OLE container.
 * @returns Sections of key/value properties.
 */
function readProperties(
  container: CFB.CFB$Container,
): Record<string, Record<string, string>> {
  const properties: Record<string, Record<string, string>> = {};
  for (const entry of container.FileIndex) {
    if (/^PageTexts\d+$/.test(entry.name) && entry.content) {
      const { title, properties: sectionProperties } = parsePageText(
        toUint8Array(entry.content),
      );
      properties[title] = sectionProperties;
    }
  }
  return properties;
}

/**
 * Extracts the sample title from the history stream.
 * @param history - raw `DataSetHistory` bytes.
 * @returns The sample title, or undefined.
 */
function readTitle(history: Uint8Array): string | undefined {
  let text = '';
  for (const byte of history) text += String.fromCodePoint(byte);
  const match = /Created new data set:\s*(?<name>.*?)\s*-\s*RawData/.exec(text);
  return match?.groups?.name;
}

/**
 * Reads the acquisition date stored as an OLE automation date in the history stream.
 * @param history - raw `DataSetHistory` bytes.
 * @returns ISO date string, or undefined.
 */
function readDate(history: Uint8Array): string | undefined {
  if (history.length < 16) return undefined;
  const view = new DataView(
    history.buffer,
    history.byteOffset,
    history.byteLength,
  );
  const serial = view.getFloat64(8, true);
  if (!Number.isFinite(serial) || serial <= 0) return undefined;
  const milliseconds = Math.round(
    (serial - oleDateEpochOffset) * millisecondsPerDay,
  );
  return new Date(milliseconds).toISOString();
}

/**
 * Finds a required stream by name.
 * @param container - the parsed OLE container.
 * @param name - stream name.
 * @returns The stream bytes.
 */
function findStream(container: CFB.CFB$Container, name: string): Uint8Array {
  const content = tryStream(container, name);
  if (!content) throw new Error(`UVProbe OLE: missing stream "${name}"`);
  return content;
}

/**
 * Finds an optional stream by name.
 * @param container - the parsed OLE container.
 * @param name - stream name.
 * @returns The stream bytes, or undefined when absent.
 */
function tryStream(
  container: CFB.CFB$Container,
  name: string,
): Uint8Array | undefined {
  const entry = CFB.find(container, name);
  return entry?.content ? toUint8Array(entry.content) : undefined;
}

/**
 * Normalizes cfb stream content to a `Uint8Array`.
 * @param content - cfb stream content.
 * @returns The content as a `Uint8Array`.
 */
function toUint8Array(content: number[] | Uint8Array): Uint8Array {
  return content instanceof Uint8Array ? content : Uint8Array.from(content);
}
