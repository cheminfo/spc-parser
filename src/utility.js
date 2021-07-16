/**
 * Gets the parameter in each bit of the flag
 * @param {number} flag First byte of the main header
 * @returns {object} The parameters
 */
export function getFlagParameters(flag) {
  const parameters = {}; //Z is time
  parameters.y16BitPrecision = (flag & 1) !== 0; //Y values are 16 bits instead of 32
  parameters.useExperimentExtension = (flag & 2) !== 0; //Enable experiment mode
  parameters.multiFile = (flag & 4) !== 0; //Multiple spectra
  parameters.zValuesRandom = (flag & 8) !== 0; //Z values in random order if multiFile
  parameters.zValuesUneven = (flag & 16) !== 0; //Z values ordered but unevenly spaced if multi
  parameters.customAxisLabels = (flag & 32) !== 0; //Custom labels
  parameters.xyxy = (flag & 64) !== 0; //One X array per subfile, for discontinuous curves
  parameters.xy = (flag & 128) !== 0; // Non-evenly spaced X, X before Y
  return parameters;
}

/**
 *
 * Gets the Subfile flags
 * @param {number} flag First byte of the subheader
 * @return {object} The parameters
 */
export function getSubFlagParameters(flag) {
  const parameters = {};
  parameters.changed = (flag & 1) !== 0;
  parameters.noPeakTable = (flag & 8) !== 0;
  parameters.modifiedArithmetic = (flag & 128) !== 0;
  return parameters;
}

/**
 * Generates an array of evenly spaced numbers
 * @param {number} minimum Lower bound
 * @param {number} maximum Upper bound
 * @param {number} numberPoints Number of points
 * @return {array} Evenly spaced numbers
 */
export function equidistantArray(minimum, maximum, numberPoints) {
  const equidistantArray = new Float64Array(numberPoints);
  const step = (maximum - minimum) / (numberPoints - 1);
  for (let i = 0; i < numberPoints; i++) {
    equidistantArray[i] = minimum + i * step;
  }
  return equidistantArray;
}

/**
 * Gets the date encoded in binary in a long number
 * @param {number} long Binary date
 * @return {string} Date formatted to ISO 8601:2019 convention
 */
export function longToDate(long) {
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
