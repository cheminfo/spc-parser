import { IOBuffer } from 'iobuffer';

import { BLOCK_HEADER_SIZE, MEMBER_ID } from './constants.ts';
import {
  decodeFloat64,
  decodeFloat64Array,
  decodeHistoryRecord,
  decodeInteger,
  decodeRange,
  decodeString,
} from './decodeMembers.ts';
import type { PerkinElmerHistoryRecord } from './types.ts';

/**
 * A raw block of a PerkinElmer file.
 */
export interface PerkinElmerBlock {
  /**
   * Block identifier.
   */
  id: number;
  /**
   * Block data, a view over the file bytes.
   */
  data: IOBuffer;
}

/**
 * Reads the next `size` bytes of a buffer as a view, without copying them.
 * @param buffer - IOBuffer positioned at the start of the block data.
 * @param size - number of bytes of the block data.
 * @returns An IOBuffer over the block data.
 */
export function readBlockData(buffer: IOBuffer, size: number): IOBuffer {
  const data = new IOBuffer(
    new Uint8Array(buffer.buffer, buffer.byteOffset + buffer.offset, size),
  );
  buffer.skip(size);
  return data;
}

/**
 * Read all blocks within a given IOBuffer.
 * @param buffer - IOBuffer containing nested block data.
 * @returns Array of parsed blocks.
 */
export function readNestedBlocks(buffer: IOBuffer): PerkinElmerBlock[] {
  const blocks: PerkinElmerBlock[] = [];
  while (buffer.available(BLOCK_HEADER_SIZE)) {
    const id = buffer.readUint16();
    const size = buffer.readInt32();
    if (!buffer.available(size)) break;
    blocks.push({ id, data: readBlockData(buffer, size) });
  }
  return blocks;
}

/**
 * Parse all member blocks in a dataset and extract spectral information.
 * @param blocks - Array of member blocks from a dataset.
 * @returns Extracted dataset fields.
 */
export function parseDatasetMembers(blocks: PerkinElmerBlock[]): DatasetFields {
  const fields: DatasetFields = {
    name: '',
    fileType: '',
    alias: '',
    samplingMethod: '',
    dataType: 0,
    xAxisLabel: '',
    yAxisLabel: '',
    xAxisUnitType: 0,
    yAxisUnitType: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    interval: 0,
    numberOfPoints: 0,
    yData: new Float64Array(0),
    history: [],
  };

  for (const block of blocks) {
    switch (block.id) {
      case MEMBER_ID.NAME:
        fields.name = decodeString(block.data);
        break;
      case MEMBER_ID.FILE_TYPE:
        fields.fileType = decodeString(block.data);
        break;
      case MEMBER_ID.ALIAS:
        fields.alias = decodeString(block.data);
        break;
      case MEMBER_ID.SAMPLING_METHOD:
        fields.samplingMethod = decodeString(block.data);
        break;
      case MEMBER_ID.DATA_TYPE:
        fields.dataType = decodeInteger(block.data);
        break;
      case MEMBER_ID.X_AXIS_LABEL:
        fields.xAxisLabel = decodeString(block.data);
        break;
      case MEMBER_ID.Y_AXIS_LABEL:
        fields.yAxisLabel = decodeString(block.data);
        break;
      case MEMBER_ID.X_AXIS_UNIT_TYPE:
        fields.xAxisUnitType = decodeInteger(block.data);
        break;
      case MEMBER_ID.Y_AXIS_UNIT_TYPE:
        fields.yAxisUnitType = decodeInteger(block.data);
        break;
      case MEMBER_ID.ABSCISSA_RANGE: {
        const [min, max] = decodeRange(block.data);
        fields.minX = min;
        fields.maxX = max;
        break;
      }
      case MEMBER_ID.ORDINATE_RANGE: {
        const [min, max] = decodeRange(block.data);
        fields.minY = min;
        fields.maxY = max;
        break;
      }
      case MEMBER_ID.INTERVAL:
        fields.interval = decodeFloat64(block.data);
        break;
      case MEMBER_ID.NUM_POINTS:
        fields.numberOfPoints = decodeInteger(block.data);
        break;
      case MEMBER_ID.DATA:
        fields.yData = decodeFloat64Array(block.data);
        break;
      case MEMBER_ID.HISTORY_RECORD:
        fields.history.push(decodeHistoryRecord(block.data));
        break;
      default:
        // Skip unknown member blocks
        break;
    }
  }

  return fields;
}

export interface DatasetFields {
  name: string;
  fileType: string;
  alias: string;
  samplingMethod: string;
  dataType: number;
  xAxisLabel: string;
  yAxisLabel: string;
  xAxisUnitType: number;
  yAxisUnitType: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  interval: number;
  numberOfPoints: number;
  yData: Float64Array;
  history: PerkinElmerHistoryRecord[];
}
