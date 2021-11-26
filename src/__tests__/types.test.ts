import { xzwTypes, yTypes, experimentSettings } from '../types';

test('xzyTypes', () => {
  expect(xzwTypes(1)).toBe('Wavenumber (cm-1)');
  expect(xzwTypes(2)).toBe('Micrometers (um)');
  expect(xzwTypes(3)).toBe('Nanometers (nm)');
  expect(xzwTypes(4)).toBe('Seconds');
  expect(xzwTypes(5)).toBe('Minutes');
  expect(xzwTypes(6)).toBe('Hertz (Hz)');
  expect(xzwTypes(7)).toBe('Kilohertz (KHz)');
  expect(xzwTypes(8)).toBe('Megahertz (MHz)');
  expect(xzwTypes(9)).toBe('Mass (M/z)');
  expect(xzwTypes(10)).toBe('Parts per million (PPM)');
  expect(xzwTypes(11)).toBe('Days');
  expect(xzwTypes(12)).toBe('Years');
  expect(xzwTypes(13)).toBe('Raman Shift (cm-1)');
  expect(xzwTypes(14)).toBe('eV');
  expect(xzwTypes(15)).toBe(0);
  expect(xzwTypes(16)).toBe('Diode Number');
  expect(xzwTypes(17)).toBe('Channel ');
  expect(xzwTypes(18)).toBe('Degrees');
  expect(xzwTypes(19)).toBe('Temperature (F)');
  expect(xzwTypes(20)).toBe('Temperature (C)');
  expect(xzwTypes(21)).toBe('Temperature (K)');
  expect(xzwTypes(22)).toBe('Data Points');
  expect(xzwTypes(23)).toBe('Milliseconds (mSec)');
  expect(xzwTypes(24)).toBe('Microseconds (uSec)');
  expect(xzwTypes(25)).toBe('Nanoseconds (nSec)');
  expect(xzwTypes(26)).toBe('Gigahertz (GHz)');
  expect(xzwTypes(27)).toBe('Centimeters (cm)');
  expect(xzwTypes(28)).toBe('Meters (m)');
  expect(xzwTypes(29)).toBe('Millimeters (mm)');
  expect(xzwTypes(30)).toBe('Hours');
  expect(xzwTypes(255)).toBe('Double interferogram');
  expect(xzwTypes(5248)).toBe('Arbitrary');
});

test('yTypes', () => {
  expect(yTypes(0)).toBe('Arbitrary Intensity');
  expect(yTypes(1)).toBe('Interferogram');
  expect(yTypes(2)).toBe('Absorbance');
  expect(yTypes(3)).toBe('Kubelka-Monk');
  expect(yTypes(4)).toBe('Counts');
  expect(yTypes(5)).toBe('Volts');
  expect(yTypes(6)).toBe('Degrees');
  expect(yTypes(7)).toBe('Milliamps');
  expect(yTypes(8)).toBe('Millimeters');
  expect(yTypes(9)).toBe('Millivolts');
  expect(yTypes(10)).toBe('Log(1/R)');
  expect(yTypes(11)).toBe('Percent');
  expect(yTypes(12)).toBe('Intensity');
  expect(yTypes(13)).toBe('Relative Intensity');
  expect(yTypes(14)).toBe('Energy');
  expect(yTypes(16)).toBe('Decibel');
  expect(yTypes(19)).toBe('Temperature (F)');
  expect(yTypes(20)).toBe('Temperature (C)');
  expect(yTypes(21)).toBe('Temperature (K)');
  expect(yTypes(22)).toBe('Index of Refraction [N]');
  expect(yTypes(23)).toBe('Extinction Coeff. [K]');
  expect(yTypes(24)).toBe('Real');
  expect(yTypes(25)).toBe('Imaginary');
  expect(yTypes(26)).toBe('Complex');
  expect(yTypes(128)).toBe('Transmission');
  expect(yTypes(129)).toBe('Reflectance');
  expect(yTypes(130)).toBe('Arbitrary or Single Beam with Valley Peaks');
  expect(yTypes(131)).toBe('Emission');
  expect(yTypes(177718)).toBe('Reference Arbitrary Energy');
});

test('experimentSettings', () => {
  expect(experimentSettings(1)).toBe('Gas Chromatogram');
  expect(experimentSettings(2)).toBe(
    'General Chromatogram (same as SPCGEN with TCGRAM)',
  );
  expect(experimentSettings(3)).toBe('HPLC Chromatogram');
  expect(experimentSettings(4)).toBe(
    'FT-IR, FT-NIR, FT-Raman Spectrum or Igram (Can also be used for scanning IR.)',
  );
  expect(experimentSettings(5)).toBe(
    'NIR Spectrum (Usually multi-spectral data sets for calibration.)',
  );
  expect(experimentSettings(7)).toBe(
    'UV-VIS Spectrum (Can be used for single scanning UV-VIS-NIR.)',
  );
  expect(experimentSettings(8)).toBe('X-ray Diffraction Spectrum');
  expect(experimentSettings(9)).toBe(
    'Mass Spectrum  (Can be single, GC-MS, Continuum, Centroid or TOF.)',
  );
  expect(experimentSettings(10)).toBe('NMR Spectrum or FID');
  expect(experimentSettings(11)).toBe(
    'Raman Spectrum (Usually Diode Array, CCD, etc. use SPCFTIR for FT-Raman.)',
  );
  expect(experimentSettings(12)).toBe('Fluorescence Spectrum');
  expect(experimentSettings(13)).toBe('Atomic Spectrum');
  expect(experimentSettings(14)).toBe('Chromatography Diode Array Spectra');
  expect(experimentSettings(1428)).toBe('General SPC (could be anything)');
});
