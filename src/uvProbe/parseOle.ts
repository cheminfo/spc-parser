import * as CFB from 'cfb';
import type { MeasurementXY, NumberArray } from 'cheminfo-types';

import type { ParseContext } from '../utility/ParseContext.ts';
import { SpcParserError } from '../utility/SpcParserError.ts';

import { listDatasets, readDataset } from './datasets.ts';
import type { UvProbeResult } from './parseFlat.ts';
import type { UvProbeDatasetMeta, UvProbeMeta } from './types.ts';

/**
 * Parses the OLE2 compound-document Shimadzu UVProbe `.spc` variant.
 *
 * Every `DataStorageK/DataSetGroup/DataSetJ` storage is one spectrum, returned
 * in numeric storage then dataset order. Wavelength and ordinate are `float64`
 * arrays in the `X Data.1` and `Y Data.1` streams, the measuring mode is in
 * `Data Header.1`, and metadata lives in `DataSetHeaderInfo`,
 * `DataSetHistory` and the dataset's `MethodStorage/PageTextsN` streams.
 * The file-level `meta` describes the first dataset.
 * @param bytes - the whole file as bytes.
 * @param context - shared parse state (encoding and warnings).
 * @returns The spectra and their metadata.
 */
export function parseUVProbeOle(
  bytes: Uint8Array,
  context: ParseContext,
): UvProbeResult {
  const container = readContainer(bytes);
  const streams = collectStreams(container);
  const locations = listDatasets(streams.keys());
  if (locations.length === 0) {
    throw new SpcParserError('UNSUPPORTED_FORMAT', describeOle(container));
  }

  const spectra: MeasurementXY[] = [];
  const datasets: UvProbeDatasetMeta[] = [];
  const references = new Map<number, ScanSpan>();
  for (const location of locations) {
    const dataset = readDataset(streams, location, context);
    if (!dataset) continue;
    datasets.push(dataset.meta);
    spectra.push({ meta: dataset.meta, variables: dataset.variables });
    const span = getScanSpan(dataset.meta, dataset.variables.x.data);
    const reference = references.get(location.storage);
    if (!reference) references.set(location.storage, span);
    else checkInterrupted(span, reference, context);
  }
  const first = datasets[0];
  if (!first) {
    throw new SpcParserError(
      'UNSUPPORTED_FORMAT',
      'Unsupported SPC file: UVProbe OLE document without any readable dataset',
    );
  }

  const meta: UvProbeMeta = {
    kind: 'ole',
    numberPoints: first.numberPoints,
    ...(first.title !== undefined && { title: first.title }),
    ...(first.date !== undefined && { date: first.date }),
    properties: first.properties,
    datasets,
  };
  return { meta, spectra };
}

/**
 * Maps every stream of the container by its path below the root storage.
 * @param container - the parsed OLE container.
 * @returns Stream contents keyed by relative path, in directory order.
 */
function collectStreams(container: CFB.CFB$Container): Map<string, Uint8Array> {
  const streams = new Map<string, Uint8Array>();
  for (let i = 0; i < container.FullPaths.length; i++) {
    const entry = container.FileIndex[i];
    const path = container.FullPaths[i];
    if (entry?.type !== 2 || !entry.content || !path) continue;
    const relative = path.slice(path.indexOf('/') + 1);
    const { content } = entry;
    streams.set(
      relative,
      content instanceof Uint8Array ? content : Uint8Array.from(content),
    );
  }
  return streams;
}

/**
 * Reads the OLE2 container, reporting unreadable documents as unsupported.
 * @param bytes - the whole file as bytes.
 * @returns The parsed container.
 */
function readContainer(bytes: Uint8Array): CFB.CFB$Container {
  try {
    return CFB.read(bytes, { type: 'buffer' });
  } catch (error) {
    throw new SpcParserError(
      'UNSUPPORTED_FORMAT',
      `Unsupported SPC file: unreadable OLE2 compound document (${(error as Error).message})`,
    );
  }
}

/**
 * Describes an OLE2 document that holds no UVProbe spectrum.
 * @param container - the parsed OLE container.
 * @returns The error message.
 */
function describeOle(container: CFB.CFB$Container): string {
  const isKinetics = container.FullPaths.some(
    (path) => path.includes('/DataStg') || path.endsWith('/DataArrayStm'),
  );
  return isKinetics
    ? 'Unsupported SPC file: detected a Shimadzu UVProbe Kinetics (.kin) document'
    : 'Unsupported SPC file: OLE2 compound document without UVProbe spectrum streams';
}

/**
 * Wavelength span of a dataset and the sampling interval it was measured with.
 */
interface ScanSpan {
  path: string;
  low: number;
  high: number;
  interval: string | undefined;
}

/**
 * Reads the wavelength span of a dataset.
 * @param meta - the dataset metadata.
 * @param x - the wavelengths, in any order.
 * @returns The span.
 */
function getScanSpan(meta: UvProbeDatasetMeta, x: NumberArray): ScanSpan {
  const first = x[0] ?? NaN;
  const last = x.at(-1) ?? NaN;
  return {
    path: meta.path,
    low: Math.min(first, last),
    high: Math.max(first, last),
    interval: meta.properties['Measurement Properties']?.['Sampling Interval'],
  };
}

/**
 * Warns when a dataset looks like an interrupted scan: UVProbe scans from
 * the high wavelength down and rewrites the method range of a stopped scan,
 * so the sign is a span that ends above the first dataset of the same
 * storage, measured with the same sampling interval from the same start.
 * @param span - the dataset to check.
 * @param reference - the first dataset of the same storage.
 * @param context - receives the warning.
 */
function checkInterrupted(
  span: ScanSpan,
  reference: ScanSpan,
  context: ParseContext,
): void {
  if (
    span.interval !== undefined &&
    span.interval === reference.interval &&
    span.high === reference.high &&
    span.low > reference.low
  ) {
    context.warn(
      `UVProbe dataset ${span.path} looks like an interrupted scan: it spans ${span.low} to ${span.high} nm, ${reference.path} spans ${reference.low} to ${reference.high} nm`,
    );
  }
}
