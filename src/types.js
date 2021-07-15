/**
 * Gives meaning to type codes
 * @param {number} xzwType x, z or w type code
 * @return {string} String corresponding to the code
 */
export function xzwTypes(xzwType) {
  switch (xzwType) {
    case 1:
      return 'Wavenumber (cm-1)';
    case 2:
      return 'Micrometers (um)';
    case 3:
      return 'Nanometers (nm)';
    case 4:
      return 'Seconds';
    case 5:
      return 'Minutes';
    case 6:
      return 'Hertz (Hz)';
    case 7:
      return 'Kilohertz (KHz)';
    case 8:
      return 'Megahertz (MHz)';
    case 9:
      return 'Mass (M/z)';
    case 10:
      return 'Parts per million (PPM)';
    case 11:
      return 'Days';
    case 12:
      return 'Years';
    case 13:
      return 'Raman Shift (cm-1)';
    case 14:
      return 'eV';
    case 15:
      return 'XYZ text labels in fcatxt (old 0x4D version only)';
    case 16:
      return 'Diode Number';
    case 17:
      return 'Channel ';
    case 18:
      return 'Degrees';
    case 19:
      return 'Temperature (F)';
    case 20:
      return 'Temperature (C)';
    case 21:
      return 'Temperature (K)';
    case 22:
      return 'Data Points';
    case 23:
      return 'Milliseconds (mSec)';
    case 24:
      return 'Microseconds (uSec)';
    case 25:
      return 'Nanoseconds (nSec)';
    case 26:
      return 'Gigahertz (GHz)';
    case 27:
      return 'Centimeters (cm)';
    case 28:
      return 'Meters (m)';
    case 29:
      return 'Millimeters (mm)';
    case 30:
      return 'Hours';
    case 255:
      return 'Double interferogram (no display labels)';
    default:
      return 'Arbitrary';
  }
}
/**
 * Gives meaning to y type codes
 * @param {*} yType y type code
 * @return {string} String corresponding to the code
 */
export function yTypes(yType) {
  switch (yType) {
    case 1:
      return 'Interferogram';
    case 2:
      return 'Absorbance';
    case 3:
      return 'Kubelka-Monk';
    case 4:
      return 'Counts';
    case 5:
      return 'Volts';
    case 6:
      return 'Degrees';
    case 7:
      return 'Milliamps';
    case 8:
      return 'Millimeters';
    case 9:
      return 'Millivolts';
    case 10:
      return 'Log(1/R)';
    case 11:
      return 'Percent';
    case 12:
      return 'Intensity';
    case 13:
      return 'Relative Intensity';
    case 14:
      return 'Energy';
    case 16:
      return 'Decibel';
    case 19:
      return 'Temperature (F)';
    case 20:
      return 'Temperature (C)';
    case 21:
      return 'Temperature (K)';
    case 22:
      return 'Index of Refraction [N]';
    case 23:
      return 'Extinction Coeff. [K]';
    case 24:
      return 'Real';
    case 25:
      return 'Imaginary';
    case 26:
      return 'Complex';
    case 128:
      return 'Transmission (ALL HIGHER MUST HAVE VALLEYS!)';
    case 129:
      return 'Reflectance';
    case 130:
      return 'Arbitrary or Single Beam with Valley Peaks';
    case 131:
      return 'Emission';
    default:
      return 'Arbitrary Intensity';
  }
}
