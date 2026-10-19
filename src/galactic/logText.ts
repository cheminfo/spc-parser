/**
 * One `key = value` line of the log text.
 */
export interface LogEntry {
  /**
   * Text before the first `=`, trimmed (case preserved).
   */
  key: string;
  /**
   * Text after the first `=`, trimmed (may be empty).
   */
  value: string;
  /**
   * Name of the enclosing `[NAME]` … `[END NAME]` section, when there is one.
   * @default undefined
   */
  section?: string;
}

/**
 * One audit line: GRAMS `YYYY/MM/DD HH:MM  L = Description (PROGRAM.AB) User=name`,
 * or the Essential FTIR form `YYYY/MM/DD HH:MM User=name`.
 */
export interface LogHistoryEntry {
  /**
   * Local date and time of the change, as `YYYY-MM-DDTHH:MM:00.000`.
   */
  date: string;
  /**
   * The modification letter (the `fmods` bit, `A` = bit 0), when given.
   * @default undefined
   */
  letter?: string;
  /**
   * Description of the change; for a line without a letter, the name of the
   * enclosing section (e.g. `FILE SAVE`), or `''`.
   */
  description: string;
  /**
   * Program that made the change, when given.
   * @default undefined
   */
  program?: string;
  /**
   * User that made the change, when given.
   * @default undefined
   */
  user?: string;
}

/**
 * The structured content of a log text.
 */
export interface ParsedLogText {
  /**
   * The text lines (CR LF, LF CR, CR or LF separated), right-trimmed.
   */
  lines: string[];
  /**
   * The `key = value` lines, in order, duplicates kept.
   */
  entries: LogEntry[];
  /**
   * The audit lines.
   */
  history: LogHistoryEntry[];
}

const historyPattern =
  /^(?<year>\d{2}|\d{4})\/(?<month>\d\d)\/(?<day>\d\d) (?<time>\d\d:\d\d)(?:\s+(?<letter>[A-Z]) = (?<description>.*?)(?: \((?<program>[^)]+)\))?)?(?:\s+User=(?<user>.*))?$/;
const sectionPattern = /^\[(?<end>END )?(?<name>[^\]]+)\]$/i;

/**
 * Splits a log text into lines, `key = value` entries (split at the first
 * `=`, with their `[SECTION]`) and GRAMS audit lines.
 * @param text - the decoded log text.
 * @returns The lines, entries and history.
 */
export function parseLogText(text: string): ParsedLogText {
  const lines = text === '' ? [] : text.split(/\r\n|\n\r|\r|\n/);
  const entries: LogEntry[] = [];
  const history: LogHistoryEntry[] = [];
  let section: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] as string).trimEnd();
    lines[i] = line;
    const trimmed = line.trim();
    const sectionMatch = sectionPattern.exec(trimmed);
    if (sectionMatch?.groups) {
      section = sectionMatch.groups.end ? undefined : sectionMatch.groups.name;
      continue;
    }
    const historyMatch = historyPattern.exec(trimmed);
    if (historyMatch?.groups) {
      history.push(toHistoryEntry(historyMatch.groups, section));
      continue;
    }
    const equal = trimmed.indexOf('=');
    if (equal < 1) continue;
    entries.push({
      key: trimmed.slice(0, equal).trim(),
      value: trimmed.slice(equal + 1).trim(),
      ...(section !== undefined && { section }),
    });
  }
  return { lines, entries, history };
}

/**
 * Builds a history entry from the groups of an audit line.
 * @param groups - named groups of {@link historyPattern}.
 * @param section - the enclosing section, `''` when there is none.
 * @returns The history entry.
 */
function toHistoryEntry(
  groups: Record<string, string | undefined>,
  section = '',
): LogHistoryEntry {
  const { year = '', month, day, time, letter } = groups;
  let fullYear = year;
  if (year.length === 2) {
    fullYear = String((Number(year) < 70 ? 2000 : 1900) + Number(year));
  }
  const { description = '', program, user } = groups;
  return {
    date: `${fullYear}-${month}-${day}T${time}:00.000`,
    ...(letter !== undefined && { letter }),
    description: letter === undefined ? section : description.trim(),
    ...(program !== undefined && { program }),
    ...(user !== undefined && { user: user.trim() }),
  };
}
