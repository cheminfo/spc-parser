import type { HeaderInfo } from './headerInfo.ts';

/**
 * Metadata extracted from a Shimadzu UVProbe `.spc` file.
 */
export interface UvProbeMeta {
  /**
   * Container/encoding variant of the UVProbe export.
   * `ole` is the compound-document project file; `flat` is the raw single-spectrum dump.
   */
  kind: 'ole' | 'flat';
  /**
   * Number of data points (of the first dataset for `ole` files).
   */
  numberPoints: number;
  /**
   * Sample title, when stored in the file.
   * @default undefined
   */
  title?: string;
  /**
   * Acquisition date as a local ISO string without time zone, when stored in the file.
   * @default undefined
   */
  date?: string;
  /**
   * Property sections (e.g. `Measurement Properties`, `Instrument Properties`),
   * each a map of key/value strings. Only populated for the `ole` variant,
   * from the first dataset.
   * @default {}
   */
  properties: Record<string, Record<string, string>>;
  /**
   * Metadata of every dataset of an `ole` file, in storage and dataset order.
   * @default undefined
   */
  datasets?: UvProbeDatasetMeta[];
  /**
   * Fixed header fields of a `flat` file.
   * @default undefined
   */
  header?: ShimadzuFlatHeader;
}

/**
 * Fixed fields of the 120-byte header of a Shimadzu flat file. The meaning of
 * the codes is not confirmed, so the Y axis stays labelled Absorbance.
 */
export interface ShimadzuFlatHeader {
  /**
   * `u16` at 0x00: 0x0000, 0x0001, 0x0800 or 0x1000 (file family).
   */
  familyFlags: number;
  /**
   * `u16` at 0x04: photometric mode code (1, 2 or 3 observed).
   */
  modeCode: number;
  /**
   * `u16` at 0x06: probably the scan speed code (3, 5 or 7 observed).
   */
  speedCode: number;
  /**
   * `u16` at 0x08: sampling interval code (4 = 0.5 nm, 5 = 1 nm, 6 = 2 nm; 0 in some files).
   */
  samplingCode: number;
  /**
   * `f32` at 0x12: maximum of the display ordinate range.
   */
  displayMax: number;
  /**
   * `f32` at 0x16: minimum of the display ordinate range.
   */
  displayMin: number;
}

/**
 * Metadata of one dataset (one spectrum) of a UVProbe OLE file. It is the
 * `meta` of the corresponding spectrum.
 */
export interface UvProbeDatasetMeta extends Omit<
  HeaderInfo,
  'datasetName' | 'date'
> {
  /**
   * Always `ole`.
   */
  kind: 'ole';
  /**
   * Path of the dataset storage, e.g. `DataStorage1/DataSetGroup/DataSet2`.
   */
  path: string;
  /**
   * Name of the data storage (UVProbe document tab), e.g. `Storage 113434`.
   * @default undefined
   */
  storageName?: string;
  /**
   * Dataset name, e.g. `RawData` or `RawData-003`.
   * @default undefined
   */
  datasetName?: string;
  /**
   * Measuring mode code of `Data Header.1`: 1 transmittance, 2 absorbance,
   * 4 reflectance.
   * @default undefined
   */
  measuringModeCode?: number;
  /**
   * Number of data points.
   */
  numberPoints: number;
  /**
   * Sample title from the dataset history.
   * @default undefined
   */
  title?: string;
  /**
   * Acquisition date as a local ISO string without time zone, from
   * `DataSetHeaderInfo`, else from the first `DataSetHistory` record (about
   * 1 s later, and inherited from the source by a copied dataset).
   * @default undefined
   */
  date?: string;
  /**
   * Property sections of the dataset method.
   */
  properties: Record<string, Record<string, string>>;
}
