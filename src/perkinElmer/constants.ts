/**
 * Signature of a binary PerkinElmer file: `PEPE`.
 */
export const PEPE_SIGNATURE = [0x50, 0x45, 0x50, 0x45] as const;

/**
 * Length of the file description that follows the signature, in bytes.
 */
export const DESCRIPTION_LENGTH = 40;

/**
 * Block header size: 2 bytes ID + 4 bytes length.
 */
export const BLOCK_HEADER_SIZE = 6;

/**
 * Top-level block IDs.
 */
export const BLOCK_ID = {
  /**
   * Main dataset block containing spectral data.
   */
  DATASET: 120,
  /**
   * History record.
   */
  HISTORY: 121,
  /**
   * Instrument header history.
   */
  INSTRUMENT_HISTORY: 122,
  /**
   * General instrument header.
   */
  INSTRUMENT: 123,
  /**
   * IR instrument header.
   */
  IR_INSTRUMENT: 124,
  /**
   * UV instrument header.
   */
  UV_INSTRUMENT: 125,
  /**
   * Fluorescence instrument header.
   */
  FL_INSTRUMENT: 126,
} as const;

/**
 * Member block IDs (within dataset blocks).
 * These are stored as uint16 in the file.
 */
export const MEMBER_ID = {
  /**
   * Data type enum.
   */
  DATA_TYPE: 35697,
  /**
   * X-axis range (first, last) as 2x float64.
   */
  ABSCISSA_RANGE: 35698,
  /**
   * Y-axis range (min, max) as 2x float64.
   */
  ORDINATE_RANGE: 35699,
  /**
   * X-axis step size as float64.
   */
  INTERVAL: 35700,
  /**
   * Number of data points as uint32.
   */
  NUM_POINTS: 35701,
  /**
   * Sampling method string.
   */
  SAMPLING_METHOD: 35702,
  /**
   * X-axis label string.
   */
  X_AXIS_LABEL: 35703,
  /**
   * Y-axis label string.
   */
  Y_AXIS_LABEL: 35704,
  /**
   * X-axis unit type enum.
   */
  X_AXIS_UNIT_TYPE: 35705,
  /**
   * Y-axis unit type enum.
   */
  Y_AXIS_UNIT_TYPE: 35706,
  /**
   * File type string (e.g., "SPECTRUM").
   */
  FILE_TYPE: 35707,
  /**
   * Spectral Y data (float64 array).
   */
  DATA: 35708,
  /**
   * Dataset name/path.
   */
  NAME: 35709,
  /**
   * Checksum value.
   */
  CHECKSUM: 35710,
  /**
   * History record entries.
   */
  HISTORY_RECORD: 35711,
  /**
   * Invalid data regions.
   */
  INVALID_REGION: 35712,
  /**
   * Alias name.
   */
  ALIAS: 35713,
  /**
   * Event markers.
   */
  EVENT_MARKERS: 35716,
} as const;

/**
 * Type codes for member block payload encoding.
 */
export const TYPE_CODE = {
  /**
   * Enumeration value.
   */
  ENUM: 29973,
  /**
   * Float64 array: uint32 byte length + float64 values.
   */
  COORD_ARRAY: 29974,
  /**
   * Single float64 coordinate.
   */
  COORD: 29979,
  /**
   * Single float64.
   */
  DOUBLE: 29980,
  /**
   * Range: 2x float64 (min, max).
   */
  COORD_RANGE: 29981,
  /**
   * String: uint16 length + ASCII bytes.
   */
  CHAR: 29987,
  /**
   * Int32.
   */
  LONG: 29995,
  /**
   * Unsigned int32.
   */
  UINT: 29996,
  /**
   * Int32.
   */
  INT: 29997,
  /**
   * Unsigned int16.
   */
  USHORT: 29998,
  /**
   * Unsigned int32.
   */
  ULONG: 29978,
} as const;
