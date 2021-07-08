/**
 * Gets the parameter in each bit of the flag
 * @param {number} flag First byte of the main header
 * @returns {object} The parameters
 */
export function getFlagParameters(flag) {
  const parameters = {};
  parameters.y16BitPrecision = (flag & 1) !== 0;
  parameters.useExperimentExtension = (flag & 2) !== 0;
  parameters.multiFile = (flag & 4) !== 0;
  parameters.zValuesRandom = (flag & 8) !== 0;
  parameters.zValuesUneven = (flag & 16) !== 0;
  parameters.customAxisLabels = (flag & 32) !== 0;
  parameters.xyxy = (flag & 64) !== 0;
  parameters.xy = (flag & 128) !== 0;
  return parameters;
}

export function longToDate(long) {
  const date = {};
  date.minutes = (long >> 26) & 63; //6 MSBs
  date.hour = (long >> 21) & 31; //5 next bits
  date.day = (long >> 16) & 31; //5 next bits
  date.month = (long >> 12) & 15; //4 next bits
  date.year = long & 4095; //12 LSBs
  return date;
}
