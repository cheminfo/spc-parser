export type { Axes, Axis, HeaderCodes } from './galactic/axes.ts';
export type {
  SpectrumMeta as GalacticSpectrumMeta,
  SubFlagParameters,
  SubHeader,
} from './galactic/dataBlock/shared.ts';
export type { XDirection } from './galactic/dataBlock/xOrder.ts';
export type { ZSpacing } from './galactic/dataBlock/zwAxes.ts';
export type { Modification } from './galactic/headerHints.ts';
export type { CustomLabels } from './galactic/headerText.ts';
export type {
  Header,
  TheNewHeader,
  TheOldHeader,
} from './galactic/headerTypes.ts';
export type { LogBlock, Metadata as LogMetadata } from './galactic/logBlock.ts';
export { getLogValue } from './galactic/logMetadata.ts';
export type { LogEntry, LogHistoryEntry } from './galactic/logText.ts';
export type { DateLayout } from './galactic/utility/headerDates.ts';
export type { FlagParameters } from './galactic/utility/headerUtilities.ts';
export type { SpectraType } from './galactic/utility/guessSpectraType.ts';
export { guessSpectraType } from './galactic/utility/guessSpectraType.ts';
export * from './parse.ts';
export type {
  ShimadzuFlatHeader,
  UvProbeDatasetMeta,
  UvProbeMeta,
} from './uvProbe/types.ts';
