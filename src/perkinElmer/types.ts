/**
 * File-level metadata of a PerkinElmer `.sp` file.
 */
export interface PerkinElmerMeta {
  /**
   * Variant of the file: `pepe` is the binary block file (signature `PEPE`),
   * `peds` the ASCII export (first line `PE … ASCII PEDS <version>`).
   */
  kind: 'pepe' | 'peds';
  /**
   * The binary file description (e.g. `2D constant interval DataSet file`),
   * or the first line of an ASCII file with its padding collapsed
   * (e.g. `PE UV SPECTRUM ASCII PEDS 1.60`).
   */
  description: string;
  /**
   * Units of the X axis of the first spectrum, as written in the file
   * (e.g. `nm`, `cm-1`).
   */
  xUnits: string;
  /**
   * Never set: ASCII files write their dates in the locale of the instrument
   * computer, so the order of day and month is unknown. The text is kept in
   * the spectrum `creationDate` and `modificationDate`.
   * @default undefined
   */
  date?: string;
}

/**
 * Metadata of a spectrum of a binary (`pepe`) PerkinElmer file.
 */
export interface PerkinElmerSpectrumMeta {
  /**
   * Dataset name or file path.
   */
  name: string;
  /**
   * File type (e.g., "SPECTRUM").
   */
  fileType: string;
  /**
   * Alias name.
   */
  alias: string;
  /**
   * Sampling method.
   */
  samplingMethod: string;
  /**
   * Data type code.
   */
  dataType: number;
  /**
   * Unit type code of the X axis (e.g. 11 for nm, 10 for cm-1).
   */
  xUnitType: number;
  /**
   * Unit type code of the Y axis.
   */
  yUnitType: number;
  /**
   * History records of the dataset.
   */
  history: PerkinElmerHistoryRecord[];
}

/**
 * Metadata of the spectrum of an ASCII (`peds`) PerkinElmer file.
 */
export interface PerkinElmerAsciiSpectrumMeta {
  /**
   * Name stored in the header, usually the original file name.
   */
  name: string;
  /**
   * Creation date and time as written in the file (e.g. `25/12/05 16:36:30.00`).
   */
  creationDate: string;
  /**
   * Modification date and time as written in the file.
   */
  modificationDate: string;
  /**
   * Operator who recorded the spectrum.
   */
  analyst: string;
}

/**
 * A history record entry from a dataset block.
 */
export interface PerkinElmerHistoryRecord {
  /**
   * Raw text entries parsed from the history record.
   */
  entries: Array<string | number>;
}
