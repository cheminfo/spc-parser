# spc-parser

[![NPM version][npm-image]][npm-url]
[![build status][ci-image]][ci-url]
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]

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
// result is ...
```

## [API Documentation](https://cheminfo.github.io/spc-parser/)

## Credits and useful information

[Thermo Scientific SPC File Developer's Kit ](https://web.archive.org/web/20150131073636/http://ftirsearch.com/features/converters/spcfileformat.HTM)

[A Brief Guide to SPC File Format and Using GSPCIO](https://docuri.com/download/spc-file-format_59c1d322f581710b28653306_pdf)

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
