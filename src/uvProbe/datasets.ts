import type { MeasurementXYVariables } from 'cheminfo-types';
import { IOBuffer } from 'iobuffer';

import type { ParseContext } from '../utility/ParseContext.ts';

import type { YAxis } from './buildVariables.ts';
import { absorbanceAxis, buildVariables } from './buildVariables.ts';
import { readDescription, readProperties } from './datasetMeta.ts';
import type { UvProbeDatasetMeta } from './types.ts';

/**
 * Location of one dataset storage inside the OLE document.
 */
export interface DatasetLocation {
  /**
   * Dataset path with a trailing slash, e.g. `DataStorage1/DataSetGroup/DataSet2/`.
   */
  path: string;
  /**
   * Data storage path with a trailing slash, e.g. `DataStorage1/`.
   */
  storagePath: string;
  /**
   * Storage number K of `DataStorageK`.
   */
  storage: number;
  /**
   * Dataset number J of `DataSetJ`.
   */
  dataset: number;
}

/**
 * Lists the dataset storages of a UVProbe OLE document, sorted numerically by
 * storage then dataset number (`DataSet10` comes after `DataSet9`).
 * @param paths - stream paths relative to the root storage.
 * @returns The dataset locations.
 */
export function listDatasets(paths: Iterable<string>): DatasetLocation[] {
  const seen = new Set<string>();
  const found: DatasetLocation[] = [];
  for (const path of paths) {
    const match =
      /^(?<storagePath>DataStorage(?<storage>\d+)\/)DataSetGroup\/DataSet(?<dataset>\d+)\//.exec(
        path,
      );
    if (!match?.groups) continue;
    const { storagePath = '', storage = '', dataset = '' } = match.groups;
    const prefix = match[0];
    if (seen.has(prefix)) continue;
    seen.add(prefix);
    found.push({
      path: prefix,
      storagePath,
      storage: Number(storage),
      dataset: Number(dataset),
    });
  }
  return found.toSorted(
    (a, b) => a.storage - b.storage || a.dataset - b.dataset,
  );
}

/**
 * Y axis of each measuring mode code of `Data Header.1`.
 */
const yAxes = new Map<number, YAxis>([
  [1, { label: 'Transmittance', units: '%' }],
  [2, absorbanceAxis],
  [4, { label: 'Reflectance', units: '%' }],
]);

/**
 * Reads the spectrum and metadata of one dataset.
 * @param streams - every stream of the document, keyed by relative path.
 * @param location - the dataset to read.
 * @param context - shared parse state (encoding and warnings).
 * @returns The dataset, or undefined when its X or Y stream is missing.
 */
export function readDataset(
  streams: Map<string, Uint8Array>,
  location: DatasetLocation,
  context: ParseContext,
): { meta: UvProbeDatasetMeta; variables: MeasurementXYVariables } | undefined {
  const { path } = location;
  const name = path.slice(0, -1);
  const dataPath = `${path}DataSpectrumStorage/Data/`;
  const xStream = streams.get(`${dataPath}X Data.1`);
  const yStream = streams.get(`${dataPath}Y Data.1`);
  if (!xStream || !yStream) {
    context.warn(`UVProbe dataset ${name} has no X/Y data; skipped`);
    return undefined;
  }
  const header = readDataHeader(streams.get(`${dataPath}Data Header.1`));
  const count = Math.min(
    xStream.length >> 3,
    yStream.length >> 3,
    header?.numberPoints ?? Infinity,
  );
  if (
    xStream.length !== yStream.length ||
    (header && header.numberPoints * 8 !== xStream.length)
  ) {
    context.warn(
      `UVProbe dataset ${name}: X, Y and header lengths differ; ${count} points kept`,
    );
  }
  const x = readDoubles(xStream, count);
  const y = readDoubles(yStream, count);

  const mode = header?.measuringModeCode;
  let yAxis = mode === undefined ? undefined : yAxes.get(mode);
  if (!yAxis) {
    context.warn(
      mode === undefined
        ? `UVProbe dataset ${name}: no measuring mode (Data Header.1 missing or short); Y labelled Absorbance`
        : `UVProbe dataset ${name}: unknown measuring mode ${mode}; Y labelled Absorbance`,
    );
    yAxis = absorbanceAxis;
  }

  const meta = withoutUndefined({
    kind: 'ole',
    path: name,
    ...readDescription(streams, location, context),
    measuringModeCode: mode,
    numberPoints: count,
    properties: readProperties(streams, path, context),
  } satisfies UvProbeDatasetMeta);
  return { meta, variables: buildVariables(x, y, yAxis, context.sortX) };
}

/**
 * Reads `Data Header.1`: `u32` point count and `u32` measuring mode.
 * @param content - the stream, if present.
 * @returns The two codes, or undefined.
 */
function readDataHeader(
  content: Uint8Array | undefined,
): { numberPoints: number; measuringModeCode: number } | undefined {
  if (!content || content.length < 8) return undefined;
  const reader = new IOBuffer(content);
  return {
    numberPoints: reader.readUint32(),
    measuringModeCode: reader.readUint32(),
  };
}

/**
 * Reads little-endian doubles.
 * @param content - raw stream bytes.
 * @param count - number of values.
 * @returns The decoded values.
 */
function readDoubles(content: Uint8Array, count: number): Float64Array {
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
 * Drops the keys whose value is undefined, so that absent fields are absent.
 * @param object - the object to clean.
 * @returns A copy without undefined values.
 */
function withoutUndefined<T extends object>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  ) as T;
}
