<!-- this test is useful for a general health state of the code, if too many changes were written at
once
  it('all', () => {
    const fnames = readdirSync(join(__dirname,"data")).filter(fname=>fname!=="nir.cfl")
    fnames.map(fname=>{console.log(fname);parse(readFileSync(join(__dirname, 'data', fname)))})
  });
-->

> All of Galactic’s software products use the SPC format to store and retrieve spectral and chromatographic data.

> There are actually 2 different forms of the Galactic SPC file format: a simple array oriented
record format used by the DOS-based products Spectra Calc® and Lab Calc®, and a redesigned
version used by the newer Windows-based products such as GRAMS/386®, GRAMS/32® and
other future products. The differences between these formats are documented in the SPC.H
source code. The former format only allows for evenly spaced data arrays, while the latter
allows for non-evenly spaced data, and dynamic data array sizes in multi record files to provide
complete support for all possible different types of analytical data.

>  New features like XY data and audit log information are not supported for the old format...

I think this means that both will store: 
* One Y axis with startX and endX (simplest possible), this can be referred as Y
* Many Y axis with startX and endX: this can be referred to as YY

Then the new one allows for:
*  One Y axis with not even X values. Will be referred to as XY
*  Many Y axis with not even X values. Will be referred to as XYY
*  Many Y axis and a X axis for each of them (not even). Will be referred to as XYXY.

> All conversion routines written by Galactic Industries after July 1996 only create SPC data files in
the latter format. While future Galactic software products will continue to read all the different
formats, they will only write the newer redesigned file format.
> programmers wishing to write routines to translate SPC data
files into other formats must be prepared to read all the different SPC data formats.

### Where to look to distinguish between the files?

> The `ftflgs`, `fversn` and `fexp` parameters in the SPCHDR structure (see SPC.H) determine
both mechanism of the Y data storage (single or multi-record, evenly spaced X axis or data
pairs, enumerated label types or custom strings, constant or dynamic record length, etc.), the
format version type of the file (i.e. old or new) and the binary type of the Y values.

* The `fversn` ie file version branches the code, at least partially, as the formats are quite
  different (but share some as well.)
* The `ftflgs` has most of information for the type of data (one or many Ys, even or spaced Xs etc.)


### Type of experiment isn't normally written
It is useful to know what experiment are we looking at by some code. They created a system but it is
not enforced, and it is normally `null` as they indicate:

> **Fexper: Instrumental Experiment Technique**
> This is the “experiment type” flag. In most Galactic SPC files in circulation today, the fexper
parameter has been left set at null. However, Galactic plans to use this value as an internal flag
to identify the instrumental technique that created the original data. This will allow future
products be “smart” and tailor the interface to perform operations that are typically done on that
type of data, while possibly disallowing other operations that don’t make any sense. All future
file conversion routines should take advantage of these flags when creating SPC files.


