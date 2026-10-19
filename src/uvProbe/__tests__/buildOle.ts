import * as CFB from 'cfb';

/**
 * Prefix of the storages of the first UVProbe dataset.
 */
const dataSetPrefix = 'Root Entry/DataStorage1/DataSetGroup/DataSet1/';

/**
 * Builds an OLE2 compound document from a list of streams.
 * @param streams - stream contents keyed by path (e.g. `/Storage/Stream`).
 * @returns The compound document bytes.
 */
export function buildOle(streams: Record<string, Uint8Array>): Uint8Array {
  const container = CFB.utils.cfb_new();
  for (const [path, content] of Object.entries(streams)) {
    CFB.utils.cfb_add(container, path, content);
  }
  return write(container);
}

/**
 * Options of {@link addUvProbeDataSets}.
 */
export interface AddedDataSet {
  /**
   * Name of the new dataset storage, e.g. `DataSet2`.
   */
  name: string;
  /**
   * Value added to every Y of the copied `Y Data.1` stream.
   * @default 0
   */
  yOffset?: number;
}

/**
 * Returns a copy of a UVProbe OLE file where every stream of `DataSet1` is
 * duplicated into new dataset storages, optionally shifting Y.
 * @param source - a UVProbe OLE file with one dataset.
 * @param dataSets - the datasets to add.
 * @returns The multi-dataset compound document bytes.
 */
export function addUvProbeDataSets(
  source: Uint8Array,
  dataSets: AddedDataSet[],
): Uint8Array {
  const container = CFB.read(source, { type: 'buffer' });
  const streams: Array<[relative: string, content: Uint8Array]> = [];
  for (let index = 0; index < container.FullPaths.length; index++) {
    const path = container.FullPaths[index];
    const entry = container.FileIndex[index];
    if (
      !path?.startsWith(dataSetPrefix) ||
      entry?.type !== 2 ||
      !entry.content
    ) {
      continue;
    }
    streams.push([path.slice(dataSetPrefix.length), toBytes(entry.content)]);
  }
  for (const { name, yOffset = 0 } of dataSets) {
    for (const [relative, content] of streams) {
      const copy = relative.endsWith('Y Data.1')
        ? shiftDoubles(content, yOffset)
        : content.slice();
      CFB.utils.cfb_add(
        container,
        `/DataStorage1/DataSetGroup/${name}/${relative}`,
        copy,
      );
    }
  }
  return write(container);
}

/**
 * Copies a stream of little-endian doubles, adding a constant to each value.
 * @param content - the stream bytes.
 * @param offset - value to add.
 * @returns The shifted copy.
 */
function shiftDoubles(content: Uint8Array, offset: number): Uint8Array {
  const copy = content.slice();
  const view = new DataView(copy.buffer);
  for (let position = 0; position + 8 <= copy.length; position += 8) {
    view.setFloat64(position, view.getFloat64(position, true) + offset, true);
  }
  return copy;
}

/**
 * Serializes a container to bytes.
 * @param container - the container.
 * @returns The compound document bytes.
 */
function write(container: CFB.CFB$Container): Uint8Array {
  const output: unknown = CFB.write(container, { type: 'array' });
  if (output instanceof Uint8Array) return output;
  return Uint8Array.from(output as number[]);
}

/**
 * Normalizes cfb stream content to a `Uint8Array`.
 * @param content - cfb stream content.
 * @returns The content as a `Uint8Array`.
 */
function toBytes(content: number[] | Uint8Array): Uint8Array {
  return content instanceof Uint8Array ? content : Uint8Array.from(content);
}
