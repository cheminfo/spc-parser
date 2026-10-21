# spc-parser

Parser for `.spc` spectroscopy files: Thermo Galactic GRAMS SPC and Shimadzu UVProbe (OLE2 and flat), and for PerkinElmer `.sp` files (binary and ASCII). The format is auto-detected.

<h3 align="center">

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]
[![DOI](https://www.zenodo.org/badge/379600570.svg)](https://www.zenodo.org/badge/latestdoi/379600570)

</h3>

## Installation

`$ npm i spc-parser`

This package is ESM-only. It requires Node.js ≥ 20.19, ≥ 22.12, or any 24.x or later, or a bundler. CommonJS consumers must `import` it (no `require`).

## Usage

```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'spc-parser';

const arrayBuffer = readFileSync(join(import.meta.dirname, 'spectrum.spc'));

const result = parse(arrayBuffer);
// result is a JSON object containing everything that was parsed
```

### Migrating from 2.x

Version 3 changes the output where 2.x was wrong or incomplete. **Y values and the number of spectra can both change, so re-read anything derived from a 2.x result.**

- `logs.data` is removed. Despite the name it was never the log's data: it held the **binary** area only, decoded as a string, and dropped the **disk** area — `wplanes.spc`, whose log is 5884 disk bytes and nothing else, came back empty. The two areas are now `logs.binary` and `logs.disk`, both `Uint8Array` (see [The log block](#the-log-block)). Old-format files have `logs: null`.
- Dates stored without a time zone (spec packed date, LabSpec, old format, Shimadzu flat, UVProbe OLE) no longer claim UTC: they are offset-less ISO strings, and pass `timeZone` to turn them into real instants (see [Dates](#dates)). Only Renishaw WiRE MS-DOS and Unix dates keep `Z`. `date`, `dateLayout` and `zpdIndex` are omitted when absent.
- **Y values change where 2.x misread a subfile exponent.** In a multifile a subfile exponent of 0 is a real exponent, not an absent one, and a float file exponent wins over the 16-bit flag. Measured on the fixtures: `m_evenz.spc` and `DEMO_3D.SPC` were 2x too small, and subfile 39 of `LC_DIODE_ARRAY.SPC` 64x too small. `meta.exponent` is the exponent used, `meta.exponentY` the raw `subexp`.
- UVProbe OLE files return one spectrum per dataset, in storage then dataset order. 2.x returned whichever dataset the container listed first and silently dropped the rest, so both `spectra[0]` and its Y values can differ; the Y label follows the measuring mode (Absorbance, Transmittance or Reflectance).
- Axis labels come from the code tables and, when they apply, the custom labels; unknown codes read `Unknown (code N)`.
- Header text (memo, resolution, source, …) is cut at its first NUL and decoded as UTF-8, else with the `encoding` option.
- With the default `sortX: true`, `logs.imaginary` is reversed together with a decreasing X.
- `parse` throws `SpcParserError` (not a bare `Error` or `RangeError`) and returns `warnings`, which is always an array.
- Files that crashed with a `RangeError` in 2.x now parse: a log area past the end of the file, a log after an XYXY directory, and a gap before `flogoff`.
- Without `timeZone`, a file whose date is a wall-clock reading adds one warning saying so and how to resolve it. Passing `timeZone` silences it.

### Options

| Option     | Default          | Description                                                                                                                                                                      |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `encoding` | `'windows-1252'` | Encoding of text that is not valid UTF-8 (header memo and labels, log text, UVProbe text), e.g. `'gbk'` or `'shift_jis'`. Valid UTF-8 is always decoded as such.                 |
| `strict`   | `false`          | Throw a `SpcParserError` with code `'STRICT'` on the first anomaly instead of adding it to `warnings`.                                                                           |
| `sortX`    | `true`           | Return every spectrum sorted by increasing X. With `false`, the file order is kept (for Galactic files, `meta.xDirection` tells which it is).                                    |
| `timeZone` | _(none)_         | Zone the instrument's clock was set to, as an IANA name (`'Europe/Zurich'`), a fixed offset (`'+01:00'`) or `'UTC'`. Makes wall-clock dates real instants — see [Dates](#dates). |
| `logger`   | _(none)_         | A `cheminfo-types` `LightLogger` (`console`, a `FifoLogger`, …) that receives every anomaly as it is found, in addition to `warnings`.                                           |

### Exports

| Export                   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse(buffer, options)` | Parses an `.spc` file, auto-detecting the format. Accepts an `ArrayBuffer`, a typed array / `DataView`, a Node.js `Buffer`, or an `IOBuffer`. Returns a `ParseResult`.                                                                                                                                                                                                                                                                                                                                              |
| `SpcParserError`         | Error class thrown by `parse`, with a `code` of `'UNSUPPORTED_FORMAT'`, `'TRUNCATED'` or `'STRICT'`.                                                                                                                                                                                                                                                                                                                                                                                                                |
| `getLogValue(logs, key)` | Value of a Galactic log key (case-insensitive, first match), or `undefined`.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `guessSpectraType(meta)` | Classifies `result.meta` as `'ir' \| 'uv' \| 'raman' \| 'mass' \| 'other'` from the raw Galactic codes; UVProbe results are `'uv'`; PerkinElmer results follow their X units (`nm` is `'uv'`, `cm-1` is `'ir'`).                                                                                                                                                                                                                                                                                                    |
| types                    | `ParseOptions` (`encoding`, `strict`, `sortX`, `timeZone`, `logger`), `ParseResult`, `Header`, `TheNewHeader`, `TheOldHeader`, `GalacticSpectrumMeta`, `UvProbeMeta`, `UvProbeDatasetMeta`, `ShimadzuFlatHeader`, `PerkinElmerMeta`, `PerkinElmerSpectrumMeta`, `PerkinElmerAsciiSpectrumMeta`, `PerkinElmerHistoryRecord`, `Axes`, `Axis`, `HeaderCodes`, `CustomLabels`, `DateLayout`, `XDirection`, `ZSpacing`, `SpectraType`, `LogBlock`, `LogMetadata`, `LogEntry`, `LogHistoryEntry`, `SpcParserErrorCode`, … |

### `ParseResult`

| Property   | Description                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta`     | The Galactic `Header` (`kind` `'new'` or `'old'`), the Shimadzu `UvProbeMeta` (`kind` `'ole'` or `'flat'`) or the `PerkinElmerMeta` (`kind` `'pepe'` or `'peds'`).                                                                                                                                                                                                                    |
| `spectra`  | Array of `MeasurementXY` (`cheminfo-types`). Each spectrum owns its `x` and `y` `Float64Array`s, and `spectrum.meta` holds its own metadata: cast it to `GalacticSpectrumMeta` for Galactic files to `UvProbeDatasetMeta` (OLE) or `UvProbeMeta` (flat) for UVProbe files, and to `PerkinElmerSpectrumMeta` (binary) or `PerkinElmerAsciiSpectrumMeta` (ASCII) for PerkinElmer files. |
| `logs`     | Galactic log block, or `null` when the file has none (always `null` for the old format; absent for UVProbe and PerkinElmer).                                                                                                                                                                                                                                                          |
| `warnings` | Non-fatal anomalies found while parsing, always an array. Each message is written for a human; the data that could be read is still returned.                                                                                                                                                                                                                                         |

### Errors

`parse` throws a `SpcParserError` for files it cannot read, never a raw `RangeError`. An unsupported `encoding` or `timeZone` option throws a `TypeError` before the file is read.

| `code`               | When                                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNSUPPORTED_FORMAT` | The buffer is not a Galactic SPC, a UVProbe OLE2 document or a Shimadzu flat file. The message starts with `Unsupported SPC file` and names the detected format when it is known (see [Rejected formats](#rejected-formats)). |
| `TRUNCATED`          | A Galactic file shorter than its header (512 bytes, 256 for the old format) or without one complete subfile. A buffer under 32 bytes is too short to be recognised and gets `UNSUPPORTED_FORMAT`.                             |
| `STRICT`             | Any warning, when `strict: true`.                                                                                                                                                                                             |

### Warnings

Warnings cover, among others:

- truncation: `Subfile k of n is truncated; m complete subfiles returned`, trailing bytes after the last old-format subfile;
- inconsistent headers: `fnsub` without the multifile flag or `fnsub` 0 in a multifile, TXYXYS without TXVALS, `fwplanes` not dividing the number of subfiles, an XYXY directory pointing outside the file, a Wasatch `subnpts` twice too large;
- Y encoding: float32 subfiles in an integer file, TSPREC ignored for float data;
- dates: `fdate 0x… is not a valid date; date ignored`, `fdate 0x… decoded as a Unix timestamp`;
- the log block: offset beyond the end of the file, block or text clamped to the file, a log recovered although `flogoff` is 0;
- UVProbe: datasets without data, X/Y length mismatches, an unknown measuring mode, truncated streams, an interrupted scan (a dataset that stops above the first dataset of its storage, with the same start and sampling interval), an invalid Shimadzu flat date.
- time zones: a date that is a wall-clock reading while no `timeZone` was given (once per file, see [Dates](#dates)).

### Dates

**An SPC file records the wall clock the operator saw, and never its offset.** The instrument writes `08:54` because that is what the lab machine's clock read; nothing in the file says which zone that was. So a decoded date cannot name an instant on its own, and by default `meta.date` carries no offset:

```js
parse(buffer).meta.date; // '1995-10-28T08:54:00.000'
```

That string is **not** an instant. `new Date()` reads it as the _reader's_ local time, so a lab PC in Zurich and a UTC server disagree about what it means — and a Tokyo CI runner lands on the previous day. Never pass it to `new Date()`.

Because that is easy to miss, such a file adds one warning naming the fix, and `strict: true` turns it into a `SpcParserError`:

```
A date of this file is a wall-clock reading with no time zone, so it names no instant: reading it
with `new Date()` applies the reader's own zone, which differs between a lab machine and a UTC
server. Pass the `timeZone` option set to the zone the instrument clock was on, such as
{ timeZone: 'Europe/Zurich' }, or { timeZone: 'UTC' } to keep the strings version 2 produced.
`meta.dateLayout` says which layout the date came from.
```

It is reported once per file, never for a date that already names an instant, and not at all once `timeZone` is set.

Give `timeZone` the zone the instrument's clock was set to and every date becomes an instant that is the same everywhere:

```js
parse(buffer, { timeZone: 'Europe/Zurich' }).meta.date;
// '1995-10-28T08:54:00.000+01:00'  ->  1995-10-28T07:54:00.000Z
```

The wall-clock digits never change; only the offset is added. Daylight saving is resolved for the date in question, so a summer and a winter file in the same zone get different offsets. `timeZone: 'UTC'` reproduces the strings 2.x emitted.

Two layouts are already real instants and are **never** shifted by `timeZone`:

| `meta.dateLayout`        | Meaning                                | Ends with `Z`        |
| ------------------------ | -------------------------------------- | -------------------- |
| `spec`, `labspec`, `old` | wall clock, offset unknown             | only with `timeZone` |
| `msdos`                  | Renishaw WiRE writes this field in UTC | always               |
| `unix`                   | a `time_t`, which is UTC               | always               |

`meta.dateLayout` is the way to tell the two apart. The same applies to the per-spectrum dates from the `SUBFILEx` log keys, the Shimadzu flat date and the UVProbe OLE dates, which are all wall-clock readings.

### Galactic metadata

`meta` keeps every raw header field (`exponentY`, `numberPoints`, `startingX`, `memo`, `logOffset`, …) and adds:

- `codes {experiment, x, y, z, w, post, processing}`: the raw enumerated codes;
- `axes {x, y, z, w}: {label, units, code, custom}`: the label and units of each axis, from the code tables and, when the file enables them (TALABS/ZTEXTL) or the code is 0, the custom labels. `xUnitsType`, `yUnitsType`, `zUnitsType` and `wAxisUnits` are the code-table texts; unknown codes give `Unknown (code N)`;
- `customLabels {x, y, z}` and `customLabelsApplied`; `memoFragments` (readable text found after the memo's NUL);
- `date`, `dateLayout` (`'spec'`, `'labspec'`, `'msdos'`, `'unix'` or `'old'`) and `rawDate`. Dates without a time zone are local ISO strings (`2016-02-19T16:46:00.000`); only MS-DOS (Renishaw WiRE) and Unix dates end with `Z`. `date` is `undefined` when absent or invalid;
- `modifications [{letter, description}]`, `postingLabel`, `processingLabels`, `invertedPeaks`, `drawAsSticks`, `isChromatogram`, `zpdIndex`;
- `xDirection` (`'increasing'`, `'decreasing'` or `'unordered'`, as stored in the file), `zSpacing` (`'even'`, `'ordered'` or `'random'`, multifiles), `planeSize` (4D files), `directoryOffset` and `directory` (XYXY files with a valid subfile directory);
- old format only: `spectra` (computed from the file size) and `trailingText`.

Each `spectrum.meta` keeps the raw subheader (`exponentY` is the raw `subexp`, `startingZ`, `wAxisValue`, …) and adds `exponent` (the exponent actually used), `isFloat`, `index`, `flags`, and when defined `z`, `zEnd`, `w`, `plane`, `noise`, plus `date` and `title` from the `SUBFILEx` log keys.

#### The log block

A log block is four consecutive regions, each sized by a field of its 64-byte `LOGSTC` header. The two byte areas are separate fields of the format, not two views of the same bytes: GRAMS loaded one into memory and left the other on disk, which is where their names come from.

| Region | Size field   | What it holds                                         |
| ------ | ------------ | ----------------------------------------------------- |
| header | —            | the `LOGSTC` fields, as `logs.meta`                   |
| binary | `logbins`    | `logs.binary`. For NMR, the imaginary part as float32 |
| disk   | `logdsks`    | `logs.disk`. Never loaded by GRAMS                    |
| text   | at `logtxto` | `logs.text`, and the entries parsed from it           |

A file normally uses one area or the other: `NMR_FID.SPC` has 65536 binary bytes (16384 float32 values, one per Y point) and no disk area, while `wplanes.spc` has no binary area and 5884 disk bytes.

So `logs` holds `meta` (the `LOGSTC` fields), `text` (decoded and cut at its first NUL), `lines`, `entries [{key, value, section?}]`, `history [{date, letter?, description, program?, user?}]`, `binary` and `disk` (`Uint8Array` copies clamped to the file) and, for NMR files, `imaginary` (a `Float64Array` decoded from `binary`, in the order of `y`, reversed with it when a decreasing X is sorted).

### UVProbe metadata

- OLE2 files return one spectrum per dataset. `meta` describes the first dataset (`numberPoints`, `title`, `date`, `properties`) and lists all of them in `datasets`. Each `spectrum.meta` holds its dataset's `storageName`, `datasetName`, `measuringModeCode`, `operator`, `organization`, `software`, `softwareVersion`, `instrumentName`, `series`, `model`, `serialNumber`, `date`, `title` and `properties`. The Y label follows the measuring mode (Absorbance, Transmittance or Reflectance).
- Flat files return one spectrum; `meta.header` holds the raw codes `familyFlags`, `modeCode`, `speedCode`, `samplingCode`, `displayMax` and `displayMin`. The Y label stays Absorbance.

### PerkinElmer metadata

- Binary files (signature `PEPE`, `kind` `'pepe'`) return one spectrum per dataset block. `meta.description` is the file description (e.g. `2D constant interval DataSet file`). Each `spectrum.meta` holds the dataset `name`, `fileType`, `alias`, `samplingMethod`, `dataType`, the unit type codes `xUnitType` and `yUnitType`, and the raw `history` records.
- ASCII exports (first line `PE … ASCII PEDS <version>`, `kind` `'peds'`, saved as `.sp` or `.asc`) return one spectrum. `meta.description` is that first line; `spectrum.meta` holds `name`, `creationDate`, `modificationDate` and `analyst`. The dates are kept as written: the order of day and month follows the locale of the instrument computer, so `meta.date` is never set.
- `meta.xUnits` is the X axis code of the first spectrum. The axis codes `nm`, `cm-1`, `A`, `%T` and `%R` become Wavelength, Wavenumber, Absorbance, Transmittance and Reflectance; any other code is used as label and units.

### Supported variants

| Variant                                                    | Notes                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Galactic new format, little-endian (`0x4B`)                | Y, XY, XYY and XYXY (with or without the subfile directory), 16-bit, 32-bit and float Y |
| Galactic new format, big-endian (`0x4C`)                   | same layouts                                                                            |
| Galactic old format (`0x4D`, Spectra Calc / Lab Calc)      | single and multifile, 16- and 32-bit Y                                                  |
| Multifiles with even, ordered or random Z, and 4D W planes | `z`, `w` and `plane` per spectrum                                                       |
| Galactic log block                                         | text, key/value entries, audit history, binary and disk areas, NMR imaginary data       |
| Shimadzu UVProbe OLE2 documents                            | every dataset, localized (e.g. GBK) text with the `encoding` option                     |
| Shimadzu UVProbe flat `.spc`                               | fixed 120-byte header                                                                   |
| PerkinElmer binary `.sp` (`PEPE`)                          | every dataset block, UV and IR                                                          |
| PerkinElmer ASCII `.sp` / `.asc` (`PEDS`)                  | versions 1.60 and 4.00 seen                                                             |

### Rejected formats

These files also use the `.spc` extension. They are recognized and rejected with `UNSUPPORTED_FORMAT` and a message naming the format: EDAX/AMETEK EDS or XRF spectra, ORTEC/EG&G gamma spectra, ASD FieldSpec spectra, Becker & Hickl TCSPC photon streams, Bruker EPR `.par` parameter files, Shimadzu RF-5300 fluorescence spectra, UVProbe Kinetics (`.kin`) documents, gzip / R RDS objects, an unidentified encrypted family, and plain text (XY data). Headerless Bruker EPR `.spc` data cannot be identified and gets the generic message.

### Test fixtures

Every fixture is listed with its source, license and SHA-256 in the `PROVENANCE.md` files next to it (`src/galactic/__tests__/data/corpus/`, `src/uvProbe/__tests__/data/corpus/` and `src/__tests__/data/`). `src/__tests__/regression.test.ts` parses all of them. Set `SPC_CORPUS_DIR` to also run `src/__tests__/corpus.test.ts` over a local collection of files.

## [API Documentation](https://cheminfo.github.io/spc-parser/)

## Credits and useful information

### SPC file format

[SPC](https://en.wikipedia.org/wiki/SPC_file_format) is a file format used in the GRAMS Software Suite for storing all kinds of spectroscopic data, including infrared spectra, Raman spectra and UV/VIS spectra.
The data is stored in binary with some parts encoded in ASCII. As such, the file must be viewed in either a hex editor or any compatible spectroscopy software.

An SPC file is organized in three blocks:

1. File-Header block
2. Data block
3. Log block

The File Header contains information about the whole file, such as how values are read, the type of format (Old, New LSB, New MSB), the structure of the data block (**XY**, **XYY** or **XYXY**) and the number of spectra.

The Data block contains the spectrum data and is composed of a subheader for each spectrum, the X values _before_ the subheader if **XY** or **XYY**, else _after_ each subheader if **XYXY**. After the subheader and X values come the Y values, which are read according to the method determined in the Main Header.

The Log block contains miscellaneous information that varies for each file, with a part written in ASCII and another one in binary.

The format details this parser implements are written up in [docs/galactic-spec.md](./docs/galactic-spec.md) and [docs/non-galactic-formats.md](./docs/non-galactic-formats.md). Other useful files are in [the docs folder](https://github.com/cheminfo/spc-parser/tree/main/docs).

## License

[MIT](./LICENSE)

The test fixtures are third-party instrument files under their own licences
(MIT, CC-BY-4.0, GPL-3.0, LGPL-3.0, NIST public domain). They are excluded from
the published package; see [NOTICE.md](./NOTICE.md) for the attributions and the
`PROVENANCE.md` of each fixture folder for the per-file URL, licence and
SHA-256.

[npm-image]: https://img.shields.io/npm/v/spc-parser.svg
[npm-url]: https://www.npmjs.com/package/spc-parser
[ci-image]: https://github.com/cheminfo/spc-parser/workflows/Node.js%20CI/badge.svg?branch=main
[ci-url]: https://github.com/cheminfo/spc-parser/actions?query=workflow%3A%22Node.js+CI%22
[codecov-image]: https://img.shields.io/codecov/c/github/cheminfo/spc-parser.svg
[codecov-url]: https://codecov.io/gh/cheminfo/spc-parser
[download-image]: https://img.shields.io/npm/dm/spc-parser.svg
[download-url]: https://www.npmjs.com/package/spc-parser
