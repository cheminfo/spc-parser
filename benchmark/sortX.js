// Ordering the X of a common-X map: per spectrum (xySortX on each subfile)
// against once per file (direction or permutation computed once).
// Each variant is its own function closing over its own X, so the four cases
// never share a call site and cannot pollute each other's inline caches.
// Run with `node benchmark/sortX.js`.
import { stdout } from 'node:process';

import Benchmark from 'benchmark';
import { xGetSortOrder, xIsMonotonic, xySortX } from 'ml-spectra-processing';

import { parse } from '../src/index.ts';

const spectraCount = 1681;
const pointsCount = 1024;
const points = spectraCount * pointsCount;
const options = { minSamples: 30, maxTime: 30 };

const descendingX = new Float64Array(pointsCount);
for (let i = 0; i < pointsCount; i++) descendingX[i] = 4000 - i * 3.5;
const unorderedX = new Float64Array(pointsCount);
for (let i = 0; i < pointsCount; i++) unorderedX[i] = (i * 7919) % pointsCount;
const ys = [];
for (let i = 0; i < spectraCount; i++) {
  const y = new Float64Array(pointsCount);
  for (let j = 0; j < pointsCount; j++) y[j] = Math.sin(i + j / 50);
  ys.push(y);
}

/**
 * Previous behaviour: every spectrum is checked and sorted on its own.
 * @returns {number} a checksum.
 */
function perSpectrumDescending() {
  const x = descendingX;
  let checksum = 0;
  for (const y of ys) {
    const sorted = xySortX({ x, y });
    checksum += sorted.x[0] + sorted.y[0];
  }
  return checksum;
}

/**
 * Previous behaviour, own copy for the unordered case.
 * @returns {number} a checksum.
 */
function perSpectrumUnordered() {
  const x = unorderedX;
  let checksum = 0;
  for (const y of ys) {
    const sorted = xySortX({ x, y });
    checksum += sorted.x[0] + sorted.y[0];
  }
  return checksum;
}

/**
 * New behaviour: the direction is computed once, each spectrum is a copy
 * (reversed when X decreases).
 * @returns {number} a checksum.
 */
function oncePerFileDescending() {
  const x = descendingX;
  const direction = xIsMonotonic(x);
  let checksum = 0;
  for (const source of ys) {
    const ownX = x.slice();
    const y = source.slice();
    if (direction === -1) {
      ownX.reverse();
      y.reverse();
    }
    checksum += ownX[0] + y[0];
  }
  return checksum;
}

/**
 * New behaviour: the permutation is computed once and applied to each Y.
 * @returns {number} a checksum.
 */
function oncePerFileUnordered() {
  const x = unorderedX;
  const order = xGetSortOrder(x);
  let checksum = 0;
  for (const source of ys) {
    const ownX = new Float64Array(order.length);
    const y = new Float64Array(order.length);
    for (let i = 0; i < order.length; i++) {
      const at = order[i];
      ownX[i] = x[at];
      y[i] = source[at];
    }
    checksum += ownX[0] + y[0];
  }
  return checksum;
}

/**
 * Builds a new-format float32 multifile with a descending even X.
 * @returns {Uint8Array} the file bytes.
 */
function buildMap() {
  const subfileSize = 32 + 4 * pointsCount;
  const bytes = new Uint8Array(512 + spectraCount * subfileSize);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, 0x04); // TMULTI
  view.setUint8(1, 0x4b);
  view.setInt8(3, -128); // float32 Y
  view.setUint32(4, pointsCount, true);
  view.setFloat64(8, 4000, true);
  view.setFloat64(16, 400, true);
  view.setUint32(24, spectraCount, true);
  for (let i = 0; i < spectraCount; i++) {
    const start = 512 + i * subfileSize;
    view.setInt8(start + 1, -128);
    view.setUint32(start + 16, pointsCount, true);
    for (let j = 0; j < pointsCount; j++) {
      view.setFloat32(start + 32 + 4 * j, Math.sin(i + j / 50), true);
    }
  }
  return bytes;
}
const map = buildMap();

new Benchmark.Suite()
  .add(
    'descending X, xySortX per spectrum',
    () => perSpectrumDescending(),
    options,
  )
  .add(
    'descending X, direction once per file',
    () => oncePerFileDescending(),
    options,
  )
  .add(
    'unordered X, xySortX per spectrum',
    () => perSpectrumUnordered(),
    options,
  )
  .add(
    'unordered X, permutation once per file',
    () => oncePerFileUnordered(),
    options,
  )
  .add('parse 1681 x 1024 map (src)', () => parse(map), options)
  .on('cycle', (event) => {
    const { name, stats } = event.target;
    const nsPerPoint = (stats.mean * 1e9) / points;
    stdout.write(
      `${name}: ${nsPerPoint.toFixed(2)} ns/point ±${stats.rme.toFixed(1)}% (${stats.sample.length} samples)\n`,
    );
  })
  .run();

const checksums = [
  perSpectrumDescending(),
  oncePerFileDescending(),
  perSpectrumUnordered(),
  oncePerFileUnordered(),
  parse(map).spectra[5].variables.y.data[0],
];
stdout.write(`checksums ${checksums.join(' ')}\n`);
