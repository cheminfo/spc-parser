import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as CFB from 'cfb';
import { assert, expect, test } from 'vitest';

import { parse } from '../../parse.ts';
import { NAIVE_DATE_WARNING } from '../../utility/naiveDate.ts';
import type { UvProbeDatasetMeta, UvProbeMeta } from '../types.ts';

import { addUvProbeDataSets, buildOle } from './buildOle.ts';

const dataDirectory = join(import.meta.dirname, 'data');
const dataSet1 = '/DataStorage1/DataSetGroup/DataSet1/';

function read(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(dataDirectory, name)));
}

/**
 * Rewrites streams of `uvprobe-ole.spc` (paths relative to the root storage).
 * @param changes - new content of each stream.
 * @returns The modified document.
 */
function withStreams(changes: Record<string, Uint8Array>): Uint8Array {
  const container = CFB.read(read('uvprobe-ole.spc'), { type: 'buffer' });
  for (const [path, content] of Object.entries(changes)) {
    const entry = CFB.find(container, path);
    assert(entry);
    entry.content = content;
    entry.size = content.length;
  }
  const output: unknown = CFB.write(container, { type: 'array' });
  return output instanceof Uint8Array
    ? output
    : Uint8Array.from(output as number[]);
}

function dataHeader(numberPoints: number, mode: number): Uint8Array {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, numberPoints, true);
  view.setUint32(4, mode, true);
  return bytes;
}

/**
 * Streams of a two-point dataset (X 500, 400 nm; Y 4, 3), without its
 * `Y Data.1` stream when `hasY` is false.
 * @param name - dataset storage name.
 * @param hasY - whether to include the Y stream.
 * @returns Stream contents keyed by path.
 */
function minimalDataSet(
  name: string,
  hasY: boolean,
): Record<string, Uint8Array> {
  const data = `/DataStorage1/DataSetGroup/${name}/DataSpectrumStorage/Data/`;
  return {
    [`${data}Data Header.1`]: dataHeader(2, 2),
    [`${data}X Data.1`]: float64Bytes([500, 400]),
    ...(hasY && { [`${data}Y Data.1`]: float64Bytes([4, 3]) }),
  };
}

function float64Bytes(values: number[]): Uint8Array {
  const array = new Float64Array(values);
  return new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
}

test('every dataset is returned, sorted numerically', () => {
  const bytes = addUvProbeDataSets(read('uvprobe-ole.spc'), [
    { name: 'DataSet10', yOffset: 10 },
    { name: 'DataSet2', yOffset: 1 },
  ]);
  const { spectra, meta } = parse(bytes);
  const first = spectra[0]?.variables.y.data[0] as number;

  expect(spectra.map((spectrum) => spectrum.meta?.path)).toStrictEqual([
    'DataStorage1/DataSetGroup/DataSet1',
    'DataStorage1/DataSetGroup/DataSet2',
    'DataStorage1/DataSetGroup/DataSet10',
  ]);
  expect(spectra[1]?.variables.y.data[0]).toBeCloseTo(first + 1, 12);
  expect(spectra[2]?.variables.y.data[0]).toBeCloseTo(first + 10, 12);
  expect((meta as UvProbeMeta).datasets).toHaveLength(3);
});

test('dataset metadata of uvprobe-ole.spc', () => {
  const { spectra } = parse(read('uvprobe-ole.spc'));
  const { properties, ...meta } = spectra[0]?.meta as UvProbeDatasetMeta;

  expect(meta).toStrictEqual({
    kind: 'ole',
    path: 'DataStorage1/DataSetGroup/DataSet1',
    storageName: 'Storage 113434',
    datasetName: 'RawData',
    date: '2026-04-22T11:36:51.000',
    organization: 'EPFL',
    software: 'UVProbe',
    softwareVersion: '2.62',
    instrumentName: 'LRESE-UV2600',
    series: 'UV-2600 Series',
    model: '01639',
    serialNumber: 'A116955',
    title: '200 uM HCHO DNPH',
    measuringModeCode: 2,
    numberPoints: 1501,
  });
  expect(Object.keys(properties)).toHaveLength(5);
});

test('reflectance file written in GBK', () => {
  const bytes = read('corpus/uvprobe-reflectance-gbk.spc');
  const result = parse(bytes, { encoding: 'gbk' });
  const spectrum = result.spectra[0];
  assert(spectrum);
  const { x, y } = spectrum.variables;
  let min = Infinity;
  let max = -Infinity;
  for (const value of y.data) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const meta = spectrum.meta as UvProbeDatasetMeta;

  expect([y.label, y.units]).toStrictEqual(['Reflectance', '%']);
  expect(x.data).toHaveLength(2301);
  expect([x.data[0], x.data.at(-1)]).toStrictEqual([200, 2500]);
  expect(min).toBeCloseTo(5.533367, 6);
  expect(max).toBeCloseTo(55.890839, 6);
  expect(meta.measuringModeCode).toBe(4);
  expect(meta.organization).toBe('晶材新材料科技有限公司');
  expect(meta.series).toBe('UV-3600Plus 系列');
  expect(meta.softwareVersion).toBe('2.71');
  expect(Object.keys(meta.properties)).toStrictEqual([
    '测定属性',
    '样品准备属性',
    '仪器属性',
    '附件属性',
    '数据处理参数',
  ]);
  expect(result.warnings).toStrictEqual([NAIVE_DATE_WARNING]);
});

test('Eleana file: two datasets, a renamed one', () => {
  const { spectra, meta } = parse(read('corpus/uvprobe-eleana-wt_asc1.spc'));
  const datasets = spectra.map((spectrum) => {
    const { datasetName, title, date, numberPoints } =
      spectrum.meta as UvProbeDatasetMeta;
    return { datasetName, title, date, numberPoints };
  });

  expect(datasets).toStrictEqual([
    {
      datasetName: 'RawData',
      title: 'wt_asc1',
      date: '2015-09-29T16:52:51.000',
      numberPoints: 501,
    },
    {
      datasetName: 'a1',
      title: 'wt_asc1',
      date: '2015-09-29T16:55:01.000',
      numberPoints: 501,
    },
  ]);
  expect((meta as UvProbeMeta).title).toBe('wt_asc1');
});

test('measuring mode 1 is transmittance', () => {
  const bytes = withStreams({
    [`${dataSet1}DataSpectrumStorage/Data/Data Header.1`]: dataHeader(1501, 1),
  });
  const { y } = parse(bytes).spectra[0]?.variables ?? {};

  expect([y?.label, y?.units]).toStrictEqual(['Transmittance', '%']);
});

test('an unknown measuring mode keeps Absorbance with a warning', () => {
  const bytes = withStreams({
    [`${dataSet1}DataSpectrumStorage/Data/Data Header.1`]: dataHeader(1501, 9),
  });
  const result = parse(bytes);

  expect(result.spectra[0]?.variables.y.label).toBe('Absorbance');
  expect(result.warnings).toStrictEqual([
    'UVProbe dataset DataStorage1/DataSetGroup/DataSet1: unknown measuring mode 9; Y labelled Absorbance',
    NAIVE_DATE_WARNING,
  ]);
});

test('a header announcing fewer points than stored truncates with a warning', () => {
  const bytes = withStreams({
    [`${dataSet1}DataSpectrumStorage/Data/Data Header.1`]: dataHeader(1000, 2),
  });
  const result = parse(bytes);

  expect(result.spectra[0]?.variables.x.data).toHaveLength(1000);
  expect(result.warnings).toStrictEqual([
    'UVProbe dataset DataStorage1/DataSetGroup/DataSet1: X, Y and header lengths differ; 1000 points kept',
    NAIVE_DATE_WARNING,
  ]);
});

test('a dataset without Y data is skipped', () => {
  const bytes = buildOle({
    ...minimalDataSet('DataSet1', false),
    ...minimalDataSet('DataSet2', true),
  });
  const result = parse(bytes);

  expect(result.spectra).toHaveLength(1);
  expect(result.spectra[0]?.meta?.path).toBe(
    'DataStorage1/DataSetGroup/DataSet2',
  );
  expect(Array.from(result.spectra[0]?.variables.y.data ?? [])).toStrictEqual([
    3, 4,
  ]);
  expect(result.warnings).toStrictEqual([
    'UVProbe dataset DataStorage1/DataSetGroup/DataSet1 has no X/Y data; skipped',
  ]);
});

test('a document whose only dataset has no data is unsupported', () => {
  const bytes = buildOle(minimalDataSet('DataSet1', false));

  expect(() => parse(bytes)).toThrow(
    'Unsupported SPC file: UVProbe OLE document without any readable dataset',
  );
});

test('a truncated history stream is ignored with a warning', () => {
  const bytes = withStreams({
    [`${dataSet1}DataHistoryStorage/DataSetHistory`]: new Uint8Array(4),
  });
  const result = parse(bytes);
  const meta = result.spectra[0]?.meta as UvProbeDatasetMeta;

  expect(meta.title).toBeUndefined();
  expect(meta.date).toBe('2026-04-22T11:36:51.000');
  expect(result.warnings).toStrictEqual([
    'UVProbe stream DataStorage1/DataSetGroup/DataSet1/DataSetHistory is truncated; ignored',
    NAIVE_DATE_WARNING,
  ]);
});
