import type { CustomLabels } from './headerText.ts';
import { xzwUnitType, yUnitType } from './types.ts';

/**
 * Raw codes of a header.
 */
export interface HeaderCodes {
  /**
   * `fexper` (0 in old-format files).
   */
  experiment: number;
  /**
   * `fxtype`.
   */
  x: number;
  /**
   * `fytype`.
   */
  y: number;
  /**
   * `fztype`, or the high 4 bits of `oyear` in old-format files.
   */
  z: number;
  /**
   * `fwtype` (0 in old-format files).
   */
  w: number;
  /**
   * `fpost` (0 in old-format files).
   */
  post: number;
  /**
   * `fprocs` (0 in old-format files).
   */
  processing: number;
}

/**
 * Resolved label and units of one axis.
 */
export interface Axis {
  label: string;
  units: string;
  /**
   * The unit code of the axis.
   */
  code: number;
  /**
   * Whether the label comes from the custom labels of the file.
   */
  custom: boolean;
}

/**
 * Resolved labels and units of the four axes.
 */
export interface Axes {
  x: Axis;
  y: Axis;
  z: Axis;
  w: Axis;
}

/**
 * The code that tells that the axis labels are text (ZTEXTL).
 */
const textLabelsCode = 15;

/**
 * Resolves the label and units of every axis from the unit codes and the
 * custom labels. The custom labels are used for every axis when TALABS is set
 * or the Z code is ZTEXTL (15), and for an axis whose code is 0 (arbitrary)
 * when its label is clean text. An empty custom label falls back to the label
 * of the code (`Arbitrary Z` for Z under ZTEXTL). A custom label that is only
 * units, such as `(cps)`, keeps the label of the code.
 * @param codes - raw header codes.
 * @param customLabels - the custom labels of the file.
 * @param hasCustomLabels - whether TALABS is set.
 * @returns The four axes.
 */
export function resolveAxes(
  codes: HeaderCodes,
  customLabels: CustomLabels,
  hasCustomLabels: boolean,
): Axes {
  const isTextLabels = codes.z === textLabelsCode;
  const isEnabled = hasCustomLabels || isTextLabels;
  const zDefault = isTextLabels
    ? { label: 'Arbitrary Z', units: '' }
    : xzwUnitType(codes.z);
  const w = xzwUnitType(codes.w);
  return {
    x: resolveAxis(codes.x, xzwUnitType(codes.x), customLabels.x, isEnabled),
    y: resolveAxis(codes.y, yUnitType(codes.y), customLabels.y, isEnabled),
    z: resolveAxis(codes.z, zDefault, customLabels.z, isEnabled),
    w: { label: w.label, units: w.units, code: codes.w, custom: false },
  };
}

/**
 * Resolves one axis.
 * @param code - unit code of the axis.
 * @param enumerated - label and units given by the code.
 * @param enumerated.label - label of the code.
 * @param enumerated.units - units of the code.
 * @param customLabel - custom label of the axis, `''` when absent.
 * @param isEnabled - whether the file enables its custom labels.
 * @returns The axis.
 */
function resolveAxis(
  code: number,
  enumerated: { label: string; units: string },
  customLabel: string,
  isEnabled: boolean,
): Axis {
  const isUsed =
    customLabel !== '' &&
    (isEnabled || (code === 0 && isCleanLabel(customLabel)));
  if (!isUsed) {
    return { ...pick(enumerated), code, custom: false };
  }
  if (code !== 0 && customLabel === enumerated.units) {
    return { label: enumerated.label, units: customLabel, code, custom: true };
  }
  const unitsOnly = unitsOnlyLabel.exec(customLabel)?.groups?.units;
  if (unitsOnly) {
    return { label: enumerated.label, units: unitsOnly, code, custom: true };
  }
  return { ...splitLabel(customLabel), code, custom: true };
}

const unitsOnlyLabel = /^[([](?<units>[^)\]]+)[)\]]$/;

const labelWithUnits = /^(?<label>.*\S)\s*[([](?<units>[^)\]]+)[)\]]$/;

/**
 * Splits a custom label such as `Wavenumber (cm-1)` into label and units.
 * @param text - the custom label.
 * @returns The label and units; the whole text is the label when it has no
 * trailing units.
 */
export function splitLabel(text: string): { label: string; units: string } {
  const groups = labelWithUnits.exec(text)?.groups;
  if (!groups?.label || !groups.units) return { label: text, units: '' };
  return { label: groups.label, units: groups.units };
}

/**
 * Checks that a label that the file does not enable is real text and not
 * leftover binary data: at most 20 printable characters (the SPC limit),
 * including two consecutive ASCII letters.
 * @param text - the label.
 * @returns True for a clean label.
 */
function isCleanLabel(text: string): boolean {
  return (
    text.length <= 20 &&
    /[A-Za-z]{2}/.test(text) &&
    !/[\p{Cc}\u{FFFD}]/u.test(text)
  );
}

/**
 * Keeps only the label and units of a unit type.
 * @param type - the unit type.
 * @param type.label - its label.
 * @param type.units - its units.
 * @returns The label and units.
 */
function pick(type: { label: string; units: string }) {
  return { label: type.label, units: type.units };
}
