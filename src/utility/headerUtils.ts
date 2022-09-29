/**
 * Gets the parameter in each bit of the flag
 *
 * @param  flag First byte of the main header.
 * @returns  The parameters.
 */
export class FlagParameters {
  public y16BitPrecision: boolean;
  public useExperimentExtension: boolean;
  public multiFile: boolean;
  public zValuesRandom: boolean;
  public zValuesUneven: boolean;
  public customAxisLabels: boolean;
  public xyxy: boolean;
  public xy: boolean;
  constructor(flag: number) {
    this.y16BitPrecision = (flag & 1) !== 0; //Y values are 16 bits instead of 32
    this.useExperimentExtension = (flag & 2) !== 0; //Enable experiment mode
    this.multiFile = (flag & 4) !== 0; //Multiple spectra (multifile)
    this.zValuesRandom = (flag & 8) !== 0; //Z values in random order if multiFile
    this.zValuesUneven = (flag & 16) !== 0; //Z values ordered but unevenly spaced if multi
    this.customAxisLabels = (flag & 32) !== 0; //Custom labels
    this.xyxy = (flag & 64) !== 0; //One X array per subfile, for discontinuous curves
    this.xy = (flag & 128) !== 0; // Non-evenly spaced X, X before Y
  }
}

/**
 * Gets the date encoded in binary in a long number.
 * @param  long Binary date.
 * @return  Date formatted to ISO 8601:2019 convention.
 */
export function longToDate(long: number): string {
  if (long === 0) {
    return '0000-00-00T00:00:00.00Z';
  }
  const date = new Date();
  date.setUTCFullYear(long >> 20);
  date.setUTCMonth(((long >> 16) & 0x0f) - 1);
  date.setUTCDate((long >> 11) & 0x1f);
  date.setUTCHours((long >> 6) & 0x1f);
  date.setUTCMinutes(long & 0x3f);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date.toISOString();
}
