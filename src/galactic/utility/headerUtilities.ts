/**
 * The parameters encoded in each bit of the main header flag.
 */
export interface FlagParameters {
  /**
   * Y values are 16 bits instead of 32.
   */
  y16BitPrecision: boolean;
  /**
   * Enable experiment mode.
   */
  useExperimentExtension: boolean;
  /**
   * Multiple spectra (multifile).
   */
  multiFile: boolean;
  /**
   * Z values in random order if multiFile.
   */
  zValuesRandom: boolean;
  /**
   * Z values ordered but unevenly spaced if multiFile.
   */
  zValuesUneven: boolean;
  /**
   * Custom labels.
   */
  customAxisLabels: boolean;
  /**
   * One X array per subfile, for discontinuous curves.
   */
  xyxy: boolean;
  /**
   * Non-evenly spaced X, X before Y.
   */
  xy: boolean;
}

/**
 * Gets the parameter in each bit of the flag.
 * @param flag - First byte of the main header.
 * @returns The parameters.
 */
export function parseFlagParameters(flag: number): FlagParameters {
  return {
    y16BitPrecision: (flag & 1) !== 0,
    useExperimentExtension: (flag & 2) !== 0,
    multiFile: (flag & 4) !== 0,
    zValuesRandom: (flag & 8) !== 0,
    zValuesUneven: (flag & 16) !== 0,
    customAxisLabels: (flag & 32) !== 0,
    xyxy: (flag & 64) !== 0,
    xy: (flag & 128) !== 0,
  };
}
