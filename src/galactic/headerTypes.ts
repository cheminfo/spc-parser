import type { Axes, HeaderCodes } from './axes.ts';
import type { XDirection } from './dataBlock/xOrder.ts';
import type { HeaderHints } from './headerHints.ts';
import type { CustomLabels } from './headerText.ts';
import type { DateLayout } from './utility/headerDates.ts';
import type { FlagParameters } from './utility/headerUtilities.ts';

/**
 * Fields shared by the old and the new file headers.
 */
interface CommonHeader extends HeaderHints {
  fileVersion: number;
  parameters: FlagParameters;
  exponentY: number;
  numberPoints: number;
  startingX: number;
  endingX: number;
  xUnitsType: string;
  yUnitsType: string;
  /**
   * Acquisition date as an ISO string. Local-time layouts have no `Z` suffix;
   * undefined when the file has no date or an invalid one.
   * @default undefined
   */
  date?: string;
  /**
   * Layout the date was decoded with, undefined when no date was decoded.
   * @default undefined
   */
  dateLayout?: DateLayout;
  resolutionDescription: string;
  peakPointNumber: number;
  spare: number[];
  /**
   * Memo, decoded and cut at its first NUL.
   */
  memo: string;
  /**
   * Readable text left after the first NUL of the memo by the writer.
   */
  memoFragments: string[];
  /**
   * The custom-label area with its NUL separators removed.
   */
  xyzLabels: string;
  /**
   * The custom X, Y and Z labels, whether or not the file enables them.
   */
  customLabels: CustomLabels;
  /**
   * Whether at least one axis label comes from the custom labels.
   */
  customLabelsApplied: boolean;
  /**
   * The raw codes of the header.
   */
  codes: HeaderCodes;
  /**
   * Label and units of each axis, from the codes and the custom labels.
   */
  axes: Axes;
  /**
   * Order of the X values in the file, set when the data are read.
   * @default undefined
   */
  xDirection?: XDirection;
  /**
   * Spacing of the Z values of a multifile (set by the data block reader).
   * @default undefined
   */
  zSpacing?: 'even' | 'ordered' | 'random';
}

/**
 * Old-format (LabCalc) file header.
 */
export interface TheOldHeader extends CommonHeader {
  kind: 'old';
  /**
   * The raw date fields: `oyear` (with the Z unit code in its high 4 bits),
   * `omonth`, `oday`, `ohour` and `ominute`.
   */
  rawDate: number[];
  /**
   * Z unit, from the high 4 bits of `oyear`.
   */
  zUnitsType: string;
  scans: number;
  /**
   * Number of subfiles, computed from the file size (the old format does not
   * store it). Set by the data block reader.
   * @default undefined
   */
  spectra?: number;
  /**
   * Readable strings found after the last complete subfile, if any.
   * @default undefined
   */
  trailingText?: string[];
}

/**
 * New-format file header.
 */
export interface TheNewHeader extends CommonHeader {
  kind: 'new';
  /**
   * The raw `fdate` DWORD.
   */
  rawDate: number;
  experimentType: string;
  spectra: number;
  zUnitsType: string;
  postingDisposition: number;
  sourceInstrumentDescription: string;
  logOffset: number;
  modifiedFlag: number;
  processingCode: number;
  calibrationLevel: number;
  subMethodSampleInjectionNumber: number;
  concentrationFactor: number;
  methodFile: string;
  zSubIncrement: number;
  wPlanes: number;
  wPlaneIncrement: number;
  wAxisUnits: string;
  reserved: string;
  /**
   * Number of consecutive subfiles in one W plane (set by the data block
   * reader for 4D files).
   * @default undefined
   */
  planeSize?: number;
  /**
   * Offset of the XYXY subfile directory (`fnpts`), when it is valid.
   * @default undefined
   */
  directoryOffset?: number;
  /**
   * The XYXY subfile directory, when it is valid.
   * @default undefined
   */
  directory?: Array<{ position: number; size: number; time: number }>;
}

/**
 * Header of a Galactic SPC file.
 */
export type Header = TheOldHeader | TheNewHeader;
