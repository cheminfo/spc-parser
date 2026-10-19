// Strict UTF-8 with a fallback encoding: detecting invalid UTF-8 with a
// thrown exception (fatal decoder) against a non-fatal decode checked for
// U+FFFD. Run with `node benchmark/decodeText.js`.
import { stdout } from 'node:process';

import Benchmark from 'benchmark';

const count = 10000;
const options = { minSamples: 30, maxTime: 30 };

const encoder = new TextEncoder();
const ascii = encoder.encode('Wavelength (nm) 2020/08/18');
// "吸光度" (absorbance) in GBK.
const gbk = Uint8Array.of(0xce, 0xfc, 0xb9, 0xe2, 0xb6, 0xc8, 0x20, 0x41);
const utf8 = encoder.encode('吸光度 Abs');
const inputs = { ascii, gbk, utf8 };

const fatalA = new TextDecoder('utf-8', { fatal: true });
const fallbackA = new TextDecoder('gbk');

/**
 * Previous behaviour: the fatal UTF-8 decoder throws on invalid bytes.
 * @param {Uint8Array} bytes - the bytes to decode.
 * @returns {string} the text.
 */
function decodeWithException(bytes) {
  try {
    return fatalA.decode(bytes);
  } catch {
    return fallbackA.decode(bytes);
  }
}

const lenientB = new TextDecoder('utf-8');
const fatalB = new TextDecoder('utf-8', { fatal: true });
const fallbackB = new TextDecoder('gbk');

/**
 * New behaviour: decode leniently, check U+FFFD, confirm only when the
 * bytes encode U+FFFD themselves.
 * @param {Uint8Array} bytes - the bytes to decode.
 * @returns {string} the text.
 */
function decodeWithoutException(bytes) {
  const text = lenientB.decode(bytes);
  if (!text.includes('�')) return text;
  for (let i = 0; i + 2 < bytes.length; i++) {
    if (bytes[i] === 0xef && bytes[i + 1] === 0xbf && bytes[i + 2] === 0xbd) {
      try {
        return fatalB.decode(bytes);
      } catch {
        break;
      }
    }
  }
  return fallbackB.decode(bytes);
}

/**
 * Decodes the same bytes `count` times.
 * @param {(bytes: Uint8Array) => string} decode - the decoder under test.
 * @param {Uint8Array} bytes - the bytes to decode.
 * @returns {number} total decoded length.
 */
function run(decode, bytes) {
  let length = 0;
  for (let i = 0; i < count; i++) length += decode(bytes).length;
  return length;
}

for (const [name, bytes] of Object.entries(inputs)) {
  stdout.write(
    `${name}: ${decodeWithException(bytes)} / ${decodeWithoutException(bytes)}\n`,
  );
  new Benchmark.Suite()
    .add(`${name} exception`, () => run(decodeWithException, bytes), options)
    .add(
      `${name} no exception`,
      () => run(decodeWithoutException, bytes),
      options,
    )
    .on('cycle', (event) => {
      const { target } = event;
      const nsPerString = (target.stats.mean * 1e9) / count;
      stdout.write(
        `${String(target)} | ${nsPerString.toFixed(1)} ns/string ±${target.stats.rme.toFixed(1)}%\n`,
      );
    })
    .run();
}
