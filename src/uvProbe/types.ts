/**
 * Metadata extracted from a Shimadzu UVProbe `.spc` file.
 */
export interface UvProbeMeta {
  /**
   * Container/encoding variant of the UVProbe export.
   * `ole` is the compound-document project file; `flat` is the raw single-spectrum dump.
   */
  kind: 'ole' | 'flat';
  /** Number of data points. */
  numberPoints: number;
  /**
   * Sample title, when stored in the file.
   * @default undefined
   */
  title?: string;
  /**
   * Acquisition date as an ISO string, when stored in the file.
   * @default undefined
   */
  date?: string;
  /**
   * Property sections (e.g. `Measurement Properties`, `Instrument Properties`),
   * each a map of key/value strings. Only populated for the `ole` variant.
   * @default {}
   */
  properties: Record<string, Record<string, string>>;
}
