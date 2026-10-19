import { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';

import type { DatasetLocation } from './datasets.ts';
import { parseHeaderInfo, parseHistoryStart, readTitle } from './headerInfo.ts';
import { parsePageText, setOwnProperty } from './pageTexts.ts';
import { readDotNetString } from './readDotNetString.ts';
import type { UvProbeDatasetMeta } from './types.ts';

/**
 * Reads the names, date, title and instrument strings of a dataset. The date
 * comes from `DataSetHeaderInfo`, the dataset's own date, else from the first
 * `DataSetHistory` record (which a copied dataset inherits from its source).
 * @param streams - every stream of the document.
 * @param location - the dataset.
 * @param context - shared parse state.
 * @returns The descriptive fields.
 */
export function readDescription(
  streams: Map<string, Uint8Array>,
  location: DatasetLocation,
  context: ParseContext,
): Partial<UvProbeDatasetMeta> {
  const { path, storagePath } = location;
  const { encoding, timeZone } = context;
  const storageName = streams.get(`${storagePath}DataStorageName`);
  const headerInfo = streams.get(`${path}DataSetHeaderInfo`);
  const history = streams.get(`${path}DataHistoryStorage/DataSetHistory`);
  const name = path.slice(0, -1);
  const info = attempt(
    context,
    `${name}/DataSetHeaderInfo`,
    headerInfo,
    (bytes) => parseHeaderInfo(bytes, encoding, timeZone),
  );
  const start = attempt(context, `${name}/DataSetHistory`, history, (bytes) =>
    parseHistoryStart(bytes, encoding, timeZone),
  );
  return {
    storageName: attempt(
      context,
      `${storagePath}DataStorageName`,
      storageName,
      (bytes) => readDotNetString(new IOBuffer(bytes), encoding),
    ),
    ...info,
    title: start && readTitle(start.text),
    date: info?.date ?? start?.date,
  };
}

/**
 * Collects the `PageTextsN` streams of a dataset method.
 * @param streams - every stream of the document.
 * @param path - dataset path with a trailing slash.
 * @param context - shared parse state (encoding, and warnings for streams
 * that cannot be read).
 * @returns Sections of key/value properties.
 */
export function readProperties(
  streams: Map<string, Uint8Array>,
  path: string,
  context: ParseContext,
): Record<string, Record<string, string>> {
  const prefix = `${path}MethodStorage/`;
  const properties: Record<string, Record<string, string>> = {};
  for (const [streamPath, content] of streams) {
    if (
      !streamPath.startsWith(prefix) ||
      !/^PageTexts\d+$/.test(streamPath.slice(prefix.length))
    ) {
      continue;
    }
    const page = attempt(context, streamPath, content, (bytes) =>
      parsePageText(bytes, context.encoding),
    );
    if (page) setOwnProperty(properties, page.title, page.properties);
  }
  return properties;
}

/**
 * Runs a stream parser, turning a failure into a warning.
 * @param context - shared parse state.
 * @param name - stream path, for the warning.
 * @param content - the stream, if present.
 * @param parser - the parser to run.
 * @returns The parsed value, or undefined when absent or unreadable.
 */
function attempt<T>(
  context: ParseContext,
  name: string,
  content: Uint8Array | undefined,
  parser: (content: Uint8Array) => T,
): T | undefined {
  if (!content) return undefined;
  try {
    return parser(content);
  } catch {
    context.warn(`UVProbe stream ${name} is truncated; ignored`);
    return undefined;
  }
}
