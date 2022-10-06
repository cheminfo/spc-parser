# spc-parser

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]
[![DOI](https://www.zenodo.org/badge/379600570.svg)](https://www.zenodo.org/badge/latestdoi/379600570)

Thermo Galactic GRAMS SPC files parser.

## Installation

`$ npm i spc-parser`

## Usage

```js
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'spc-parser';

const arrayBuffer = readFileSync(join(__dirname, 'spectrum.spc'));

const result = parse(arrayBuffer);
// result is a JSON object containing everything that was parsed
```

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

## Docs
See [Docs folder in the repo](https://github.com/cheminfo/spc-parser/tree/main/docs)

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
