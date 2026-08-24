# spc-parser

Parser for `.spc` spectroscopy files: Thermo Galactic GRAMS SPC and Shimadzu UVProbe (OLE2 and flat). The format is auto-detected.

<h3 align="center">

  <a href="https://www.zakodium.com">
    <img src="https://www.zakodium.com/brand/zakodium-logo-white.svg" width="50" alt="Zakodium logo" />
  </a>

  <p>
    Maintained by <a href="https://www.zakodium.com">Zakodium</a>
  </p>

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

### Exports

| Export                   | Description                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse(buffer)`          | Parses an `.spc` file, auto-detecting the format. Accepts an `ArrayBuffer`, a typed array / `DataView`, a Node.js `Buffer`, or an `IOBuffer`. Returns a `ParseResult`. |
| `guessSpectraType(meta)` | Classifies a parsed Galactic `Header` as `'ir' \| 'uv' \| 'raman' \| 'mass' \| 'other'`.                                                                               |

`ParseResult` has three properties: `meta` (the Galactic `Header` or the Shimadzu `UvProbeMeta`), `spectra` (an array of `MeasurementXY` from `cheminfo-types`) and `logs` (the Galactic log block, `null` or absent when the file has none).

`parse` throws when the buffer is neither an OLE2 compound document, a Thermo Galactic SPC, nor a Shimadzu UVProbe flat file.

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

Useful files for the specification for the spc-format can be found at [the docs folder in the Github repo](https://github.com/cheminfo/spc-parser/tree/main/docs)

## License

[MIT](./LICENSE)

[npm-image]: https://img.shields.io/npm/v/spc-parser.svg
[npm-url]: https://www.npmjs.com/package/spc-parser
[ci-image]: https://github.com/cheminfo/spc-parser/workflows/Node.js%20CI/badge.svg?branch=main
[ci-url]: https://github.com/cheminfo/spc-parser/actions?query=workflow%3A%22Node.js+CI%22
[codecov-image]: https://img.shields.io/codecov/c/github/cheminfo/spc-parser.svg
[codecov-url]: https://codecov.io/gh/cheminfo/spc-parser
[download-image]: https://img.shields.io/npm/dm/spc-parser.svg
[download-url]: https://www.npmjs.com/package/spc-parser
