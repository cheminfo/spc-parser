import type { HeaderCodes } from './axes.ts';
import type { FlagParameters } from './utility/headerUtilities.ts';

/**
 * One modification recorded in `fmods`.
 */
export interface Modification {
  /**
   * Letter of the modification (bit n of `fmods` is the letter 'A' + n).
   */
  letter: string;
  /**
   * What the letter means, `''` when it is not documented.
   */
  description: string;
}

/**
 * Interpretation of the header codes and flags.
 */
export interface HeaderHints {
  /**
   * Modifications applied to the data, in letter order.
   */
  modifications: Modification[];
  /**
   * Meaning of the DDE posting disposition (`fpost`).
   */
  postingLabel: string;
  /**
   * Processing steps recorded in `fprocs`, empty when unspecified.
   */
  processingLabels: string[];
  /**
   * Y types from 128 on have inverted (downward) peaks.
   */
  invertedPeaks: boolean;
  /**
   * TXYXYS data (e.g. mass spectrum centroids) are drawn as sticks.
   */
  drawAsSticks: boolean;
  /**
   * The experiment is a chromatogram (TCGRAM with the general experiment
   * code, or a chromatography experiment code).
   */
  isChromatogram: boolean;
  /**
   * Index of the zero path difference point of an interferogram (Y type 1).
   * Absent when `fpeakpt` is 0 (unknown) or the file is not an interferogram.
   * @default undefined
   */
  zpdIndex?: number;
}

const modificationDescriptions: Record<string, string> = {
  A: 'Averaging',
  B: 'Baseline correction',
  C: 'Interferogram to spectrum computation',
  D: 'Derivative or integration',
  E: 'Resolution enhancement',
  I: 'Interpolation',
  N: 'Noise reduction smoothing',
  O: 'Other function (add, subtract, multiply ...)',
  S: 'Spectral subtraction',
  T: 'Truncation',
  W: 'Collection date or time modified',
  X: 'X units conversion or shift',
  Y: 'Y units conversion',
  Z: 'Zap',
};

const postingLabels = [
  'Default',
  'Save',
  'Append',
  'Merge',
  'Background',
  'None',
  'Keep',
  'Save and keep',
  'Ask',
];

const processingSteps: Array<[bit: number, label: string]> = [
  [1, 'Computed'],
  [2, 'Computed by a DLL'],
  [32, 'Peak picking'],
  [64, 'Library search'],
  [128, 'User program'],
];

/**
 * Interprets the codes and flags of a header.
 * @param codes - raw header codes.
 * @param parameters - flag parameters.
 * @param modifiedFlag - `fmods` (0 in old-format files).
 * @param peakPointNumber - `fpeakpt`.
 * @returns The hints.
 */
export function headerHints(
  codes: HeaderCodes,
  parameters: FlagParameters,
  modifiedFlag: number,
  peakPointNumber: number,
): HeaderHints {
  const { experiment } = codes;
  return {
    modifications: decodeModifications(modifiedFlag),
    postingLabel: postingLabels[codes.post] ?? `Unknown (code ${codes.post})`,
    processingLabels: decodeProcessing(codes.processing),
    invertedPeaks: codes.y >= 128,
    drawAsSticks: parameters.xyxy,
    isChromatogram:
      (experiment === 0 && parameters.useExperimentExtension) ||
      (experiment >= 1 && experiment <= 3),
    ...(codes.y === 1 &&
      peakPointNumber !== 0 && { zpdIndex: peakPointNumber }),
  };
}

/**
 * Decodes the modification letters of `fmods`.
 * @param flags - `fmods`.
 * @returns The modifications, in letter order.
 */
export function decodeModifications(flags: number): Modification[] {
  const modifications: Modification[] = [];
  for (let bit = 0; bit < 26; bit++) {
    if (((flags >>> bit) & 1) === 0) continue;
    const letter = String.fromCodePoint(65 + bit);
    modifications.push({
      letter,
      description: modificationDescriptions[letter] ?? '',
    });
  }
  return modifications;
}

/**
 * Decodes the processing code `fprocs`: 0 is unspecified, otherwise the code
 * is 1 plus the sum of the processing flags (GRAMSDDE.H).
 * @param code - `fprocs`.
 * @returns The processing steps.
 */
export function decodeProcessing(code: number): string[] {
  if (code === 0) return [];
  const flags = code - 1;
  const labels: string[] = [];
  for (const [bit, label] of processingSteps) {
    if (flags & bit) labels.push(label);
  }
  const conversion = flags & 12;
  if (conversion === 4) labels.push('Transmission');
  else if (conversion === 8) labels.push('Absorbance');
  else if (conversion === 12) labels.push('Kubelka-Munk');
  return labels;
}
