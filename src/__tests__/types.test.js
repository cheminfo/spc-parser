import { xzwTypes, yTypes, experimentSettings } from '../types';

test('xzyTypes', () => {
  expect(xzwTypes(1)).toStrictEqual('Wavenumber (cm-1)');
  expect(xzwTypes(2)).toStrictEqual('Micrometers (um)');
  expect(xzwTypes(3)).toStrictEqual('Nanometers (nm)');
  expect(xzwTypes(4)).toStrictEqual('Seconds');
  expect(xzwTypes(5)).toStrictEqual('Minutes');
  expect(xzwTypes(6)).toStrictEqual('Hertz (Hz)');
  expect(xzwTypes(7)).toStrictEqual('Kilohertz (KHz)');
  expect(xzwTypes(8)).toStrictEqual('Megahertz (MHz)');
  expect(xzwTypes(9)).toStrictEqual('Mass (M/z)');
  expect(xzwTypes(10)).toStrictEqual('Parts per million (PPM)');
  expect(xzwTypes(11)).toStrictEqual('Days');
  expect(xzwTypes(12)).toStrictEqual('Years');
  expect(xzwTypes(13)).toStrictEqual('Raman Shift (cm-1)');
  expect(xzwTypes(14)).toStrictEqual('eV');
  expect(xzwTypes(15)).toStrictEqual(0);
  expect(xzwTypes(16)).toStrictEqual('Diode Number');
  expect(xzwTypes(17)).toStrictEqual('Channel ');
  expect(xzwTypes(18)).toStrictEqual('Degrees');
  expect(xzwTypes(19)).toStrictEqual('Temperature (F)');
  expect(xzwTypes(20)).toStrictEqual('Temperature (C)');
  expect(xzwTypes(21)).toStrictEqual('Temperature (K)');
  expect(xzwTypes(22)).toStrictEqual('Data Points');
  expect(xzwTypes(23)).toStrictEqual('Milliseconds (mSec)');
  expect(xzwTypes(24)).toStrictEqual('Microseconds (uSec)');
  expect(xzwTypes(25)).toStrictEqual('Nanoseconds (nSec)');
  expect(xzwTypes(26)).toStrictEqual('Gigahertz (GHz)');
  expect(xzwTypes(27)).toStrictEqual('Centimeters (cm)');
  expect(xzwTypes(28)).toStrictEqual('Meters (m)');
  expect(xzwTypes(29)).toStrictEqual('Millimeters (mm)');
  expect(xzwTypes(30)).toStrictEqual('Hours');
  expect(xzwTypes(255)).toStrictEqual('Double interferogram');
  expect(xzwTypes(5248)).toStrictEqual('Arbitrary');
});

test('yTypes', () => {
  expect(yTypes(0)).toStrictEqual('Arbitrary Intensity');
  expect(yTypes(1)).toStrictEqual('Interferogram');
  expect(yTypes(2)).toStrictEqual('Absorbance');
  expect(yTypes(3)).toStrictEqual('Kubelka-Monk');
  expect(yTypes(4)).toStrictEqual('Counts');
  expect(yTypes(5)).toStrictEqual('Volts');
  expect(yTypes(6)).toStrictEqual('Degrees');
  expect(yTypes(7)).toStrictEqual('Milliamps');
  expect(yTypes(8)).toStrictEqual('Millimeters');
  expect(yTypes(9)).toStrictEqual('Millivolts');
  expect(yTypes(10)).toStrictEqual('Log(1/R)');
  expect(yTypes(11)).toStrictEqual('Percent');
  expect(yTypes(12)).toStrictEqual('Intensity');
  expect(yTypes(13)).toStrictEqual('Relative Intensity');
  expect(yTypes(14)).toStrictEqual('Energy');
  expect(yTypes(16)).toStrictEqual('Decibel');
  expect(yTypes(19)).toStrictEqual('Temperature (F)');
  expect(yTypes(20)).toStrictEqual('Temperature (C)');
  expect(yTypes(21)).toStrictEqual('Temperature (K)');
  expect(yTypes(22)).toStrictEqual('Index of Refraction [N]');
  expect(yTypes(23)).toStrictEqual('Extinction Coeff. [K]');
  expect(yTypes(24)).toStrictEqual('Real');
  expect(yTypes(25)).toStrictEqual('Imaginary');
  expect(yTypes(26)).toStrictEqual('Complex');
  expect(yTypes(128)).toStrictEqual('Transmission');
  expect(yTypes(129)).toStrictEqual('Reflectance');
  expect(yTypes(130)).toStrictEqual(
    'Arbitrary or Single Beam with Valley Peaks',
  );
  expect(yTypes(131)).toStrictEqual('Emission');
  expect(yTypes(177718)).toStrictEqual('Reference Arbitrary Energy');
});

test('experimentSettings', () => {
  expect(experimentSettings(1)).toStrictEqual('Gas Chromatogram');
  expect(experimentSettings(2)).toStrictEqual(
    'General Chromatogram (same as SPCGEN with TCGRAM)',
  );
  expect(experimentSettings(3)).toStrictEqual('HPLC Chromatogram');
  expect(experimentSettings(4)).toStrictEqual(
    'FT-IR, FT-NIR, FT-Raman Spectrum or Igram (Can also be used for scanning IR.)',
  );
  expect(experimentSettings(5)).toStrictEqual(
    'NIR Spectrum (Usually multi-spectral data sets for calibration.)',
  );
  expect(experimentSettings(7)).toStrictEqual(
    'UV-VIS Spectrum (Can be used for single scanning UV-VIS-NIR.)',
  );
  expect(experimentSettings(8)).toStrictEqual('X-ray Diffraction Spectrum');
  expect(experimentSettings(9)).toStrictEqual(
    'Mass Spectrum  (Can be single, GC-MS, Continuum, Centroid or TOF.)',
  );
  expect(experimentSettings(10)).toStrictEqual('NMR Spectrum or FID');
  expect(experimentSettings(11)).toStrictEqual(
    'Raman Spectrum (Usually Diode Array, CCD, etc. use SPCFTIR for FT-Raman.)',
  );
  expect(experimentSettings(12)).toStrictEqual('Fluorescence Spectrum');
  expect(experimentSettings(13)).toStrictEqual('Atomic Spectrum');
  expect(experimentSettings(14)).toStrictEqual(
    'Chromatography Diode Array Spectra',
  );
  expect(experimentSettings(1428)).toStrictEqual(
    'General SPC (could be anything)',
  );
});
