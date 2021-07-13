/**
 * Gets the parameter in each bit of the flag
 * @param {number} flag First byte of the main header
 * @returns {object} The parameters
 */
export function getFlagParameters(flag) {
  const parameters = {};
  parameters.y16BitPrecision = (flag & 1) !== 0; //Y values are 16 bits instead of 32
  parameters.useExperimentExtension = (flag & 2) !== 0; //Enable experiment mode
  parameters.multiFile = (flag & 4) !== 0; //Multiple subfiles (spectrums)
  parameters.zValuesRandom = (flag & 8) !== 0; //Z values in random order
  parameters.zValuesUneven = (flag & 16) !== 0; //Z values ordered but unevenly spaced
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
 * Generates a list of points on the X axis
 * @param {number} minimum Lower bound
 * @param {number} maximum Upper bound
 * @param {number} numberPoints Number of points
 * @return {array} X axis
 */
export function xPoints(minimum, maximum, numberPoints) {
  const xPoints = [];
  const step = (maximum - minimum) / numberPoints;
  for (let i = minimum; i <= maximum; i += step) {
    xPoints.push(i);
  }
  return xPoints;
}

/**
 * Gets the date encoded in binary in a long number
 * @param {number} long Binary date
 * @return {string} Date formatted to ISO 8601:2019 convention
 */
export function longToDate(long) {
  const date = new Date();
  date.setUTCFullYear(Math.floor(long >> 20));
  date.setUTCMonth(Math.floor((long >> 16) & 0x0f) - 1);
  date.setUTCDate(Math.floor((long >> 11) & 0x1f));
  date.setUTCHours(Math.floor((long >> 6) & 0x1f));
  date.setUTCMinutes(long & 0x3f);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date.toISOString();
}
