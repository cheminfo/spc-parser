# Non-Galactic `.spc` formats

Scope: every file with a `.spc` extension that is not a Thermo Galactic/GRAMS SPC
(first byte `ftflgs`, second byte `0x4B`/`0x4C`/`0x4D`). The samples are in
`src/__tests__/data/` and `src/uvProbe/__tests__/data/corpus/`, each listed in that folder's
`PROVENANCE.md` with URL, license, attribution and sha256.

Survey base: 1811 real-world Shimadzu files (906 files that users uploaded to the
narishke.it spc-convert service plus 905 test files, both from github.com/uri-t/shimadzu-spc-converter),
plus samples from the other repositories named below. Every statement marked _observed_ was
checked on those files with python `olefile` / `struct`, or by running the current
`spc-parser` source (`src/index.ts`, read-only) on each file.

## 1. Detecting the format from the first bytes

| First bytes (hex)                                                                   | Format                                                                   | XY spectrum?                           | spc-parser 3                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------- |
| `D0 CF 11 E0 A1 B1 1A E1`                                                           | OLE2 compound file: Shimadzu UVProbe (`.spc` spectrum, `.kin` kinetics…) | yes                                    | parsed, one spectrum per dataset; a `.kin` is named and rejected |
| `xx 00 02 00 m 00 n 00`, file size = `0x78 + 4*u16@0x76`                            | Shimadzu instrument "flat" spectrum (UV-1601/1700/1800 class, see §3)    | yes                                    | parsed (`kind: 'flat'`)                                          |
| `01 E0 'RF-5300'`                                                                   | Shimadzu RF-5300 / RF-530xPC fluorescence                                | yes                                    | named and rejected                                               |
| `33 33 33 3F` (float32 0.70) or `F6 28 1C 3F` (0.61)                                | EDAX/AMETEK Genesis/TEAM EDS/XRF spectrum                                | yes (energy vs counts)                 | named and rejected                                               |
| `01 00` + `01 00`/`05 00`, size a multiple of 128                                   | ORTEC/EG&G gamma spectroscopy                                            | yes (channel vs counts)                | named and rejected                                               |
| ASCII `ASD` or `as2`…`as8`                                                          | ASD FieldSpec binary spectrum                                            | yes                                    | named and rejected                                               |
| `1F 8B`                                                                             | gzip data, e.g. an R RDS object                                          | no (container)                         | named and rejected                                               |
| no magic (raw int32 BE or float32 LE) + sibling `.par`                              | Bruker EPR ESP/ECS/EMX/WinEPR/Simfonia                                   | yes, but needs the `.par` for the axis | **not identifiable**: rejected as an unrecognised file           |
| printable text starting `DOS`/`JSS`/`ANZ`/`GST`/`HCF`/`RES`                         | Bruker EPR `.par` parameter file                                         | no (parameters)                        | named and rejected                                               |
| printable text                                                                      | plain text, e.g. XY data                                                 | sometimes, but not SPC                 | named and rejected                                               |
| first u32 has bit 31 set (`xx xx xx 80`/`98`…), or 48-bit records, + sibling `.set` | Becker & Hickl TCSPC photon stream                                       | **no** (see §7)                        | named and rejected                                               |
| ASCII `FILE spectral_`                                                              | AVIRIS band-calibration table (spectral python sample)                   | no (band table)                        | rejected as plain text                                           |
| `0B F4 2D 4B 0F C3 7F CE`                                                           | unknown vendor, encrypted (§9)                                           | unknown                                | named and rejected                                               |

The type cannot be decided from the extension. The EPR and B&H files have no magic, so a
parser must check them last and structurally (EPR: size is 4 × points and a `.par` exists;
B&H: header record rules). A parser that only gets the bytes cannot identify an EPR file
reliably, so it should say "unrecognised" rather than guess, which is what
`parse` does: `SpcParserError` with code `UNSUPPORTED_FORMAT`, naming the format
when it is one of the rows above.

## 2. Shimadzu UVProbe OLE2 `.spc`

Samples: `urit_01/07/09`, `urit_large_file`, `urittest_739`, `uritweb_302/312/326/336/664/877/879`,
`eleana_wt*`, `parseuv_ShimadzuDemo`, `hyperspec_uv2600_134`, `hyspc_UV-2600_labeled_DNA` (has a CSV reference).

### 2.1 Storage tree (observed, all versions 2.21 → 2.70)

```
Root
├─ \x05SummaryInformation      (comment is always "test comment text")
├─ Contents                    u32 = 1
├─ DataStorageHeaderInfo       u32 = 1
├─ NumberofSaved               u32
├─ Version/CLSID               16 bytes (24EC9629-1CFE-11D0-BFE1-080009A418EF)
├─ Version/File Format Version u32 = 0x120 (bytes 20 01 00 00) in every file
├─ Version/Module Version      8 bytes, see 2.2
└─ DataStorage<K>              K = 1..N   ← one per "data storage" (UVProbe document tab)
   ├─ DataStorageName          .NET string (7-bit length + latin1), e.g. "Storage 113434"
   └─ DataSetGroup
      ├─ DataSetGroupHeaderInfo u32
      └─ DataSet<J>             J = 1..M   ← one per spectrum
         ├─ DataSetHeaderInfo   see 2.4
         ├─ DataSpectrumStorage
         │  ├─ Version          f32 1.0
         │  ├─ Data/Data Header.1   u32 nPoints, u32 measuringMode
         │  ├─ Data/X Data.1        nPoints × f64 LE, wavelength (nm), always DESCENDING
         │  ├─ Data/Y Data.1        nPoints × f64 LE
         │  └─ DataHeader/Header Info  f64 xStart(high), f64 xEnd(low), f64 interval-or-signed, then flags (61/127/131/157 bytes)
         ├─ DataHistoryStorage/{DataSetHistory,HistoryHeader,HistoryVersion}
         ├─ DataPeakPickStorage/PeakPickPAV, DataPointPickStorage/*, DataAreaCalcStorage/AreaCalcRegions
         └─ MethodStorage/{Contents, PageTexts0..4}
```

The stream index suffix is always `.1` (no `X Data.2` was found in 1371 spectra).
In all 1371 spectra `u32 nPoints` in `Data Header.1` equals `len(X Data.1)/8` and `len(Y Data.1)/8`.

### 2.2 Module Version ↔ UVProbe version (read from DataSetHeaderInfo strings)

| Module Version bytes      | UVProbe | instruments seen                         | PageTexts titles           |
| ------------------------- | ------- | ---------------------------------------- | -------------------------- |
| `02 00 02 00 00 00 00 00` | 2.21    | UV-2400PC series (Eleana)                | no brackets                |
| `03 00 02 00 00 00 00 00` | 2.31    | UV-1800                                  | no brackets                |
| `03 00 02 00 00 00 03 00` | 2.33    | UV-1800                                  | no brackets                |
| `03 00 02 00 00 00 04 00` | 2.34    | UV-1800                                  | no brackets                |
| `04 00 02 00 00 00 01 00` | 2.42    | UV-2600                                  | `[Measurement Properties]` |
| `04 00 02 00 00 00 03 00` | 2.43    | UV-1700, UV-1800, UV-2450                | brackets                   |
| `06 00 02 00 00 00 02 00` | 2.62    | UV-2600 (repo fixture `uvprobe-ole.spc`) | brackets                   |
| `07 00 02 00 00 00 00 00` | 2.70    | UV-2600, UV-1900                         | brackets                   |

From 2.42 on, section titles are wrapped in `[...]`, and `parse` strips the brackets.

### 2.3 Measuring mode = second u32 of `Data Header.1` (observed, counts match exactly)

| code | PageTexts "Measuring Mode" | spectra | Y storage                                            |
| ---- | -------------------------- | ------- | ---------------------------------------------------- |
| 2    | Absorbance                 | 1211    | f64 whose value is float32-exact (acquired as float) |
| 4    | Reflectance (%R)           | 138     | full f64                                             |
| 1    | Transmittance (%T)         | 22      | full f64                                             |

`parse` reads this code and labels Y accordingly (Absorbance, Transmittance or Reflectance); an unknown code keeps Absorbance and adds a warning.

### 2.4 `DataSetHeaderInfo`

`.NET string name` ("RawData", "RawData-001", user names such as "a1", "Peak26"), `u32 0`,
`f64 OLE automation date` (days since 1899-12-30), 8 bytes, then .NET strings:
user, organisation, "UVProbe", version ("2.43"), instrument name ("Instrument 1", "UV-2600"),
series ("UV-2400PC Series"), serial number. So the version, instrument model and serial number
can be read from these strings without parsing PageTexts. The date is the same kind of value the
parser already reads from `DataSetHistory`.

### 2.5 Multi-spectrum files

Two nesting levels are used, and real files combine them:

- several `DataSetJ` in one `DataStorage1`: repeated scans / time series in UVProbe
  "Spectrum" mode (e.g. `uritweb_312.spc`: **60 spectra**, names RawData-001…060, UV-1900;
  `uritweb_877.spc`: 3 spectra; `eleana_wt_asc1.spc`: "RawData" + "a1").
- several `DataStorageK`: several documents saved in one file (`urittest_739.spc`: 12 storages /
  18 spectra; `urit_large_file.spc`: 10 storages / 37 spectra, some of 40001–50001 points).

**Interrupted scans** also occur: a dataset whose X array stops early (e.g. 31965 of 40001
points, 800→480.36 nm, or 48 points 700→606 nm). So the length must come from `Data Header`,
never from the method's wavelength range.

Version 2 used `CFB.find(container, 'X Data.1')`, which returns whichever match comes first in the
FileIndex: for `urittest_739.spc` that was `DataStorage12/DataSet1` (10282 points) and for
`urit_large_file.spc` the **interrupted** `DataStorage10/DataSet6`, so the other 17 or 36 spectra were
dropped without any error. `parse` now enumerates `DataStorage\d+/DataSetGroup/DataSet\d+` and sorts
**numerically** (DataSet10 after DataSet9), reading the X/Y/Data Header/DataSetHeaderInfo/MethodStorage
of each dataset, and returns one spectrum per dataset.
Each DataSet has its own `MethodStorage`, so PageTexts must be read per dataset, not from the
whole file.

### 2.6 PageTexts quirks

- Layout as in `pageTexts.ts`: u32 1, u32 page index (the order is 0,1,3,4,2: page index ≠ stream number), title, u32 count, key/value pairs.
- Values keep the Windows locale: `Wavelength Range (nm.): 250,00 to 450,00`, `Sampling Interval: 1,0`
  (Turkish UV-1700 and others). Numbers therefore need locale-tolerant parsing if used.
- Keys end in `:`, and the number of decimals varies (`300.0 to 800.0` vs `300.00 to 800.00`).
- Scan speeds seen: Fast, Medium, Slow, Very Slow, "High Abs.(Medium)".
- No non-latin1 bytes were found in 1371 files. Japanese or Chinese installations were not in the sample.

### 2.7 UVProbe Kinetics `.kin` (same OLE family, different tree) — `eleana_kin01.kin`

The root has `DataStg1/…/DataSet1` (not `DataStorage1`), `DataStgHdrInfo`, `UVProbe SW Version/Version` (f32 0.1),
`Version/CLSID` = 973277E0-C7CB-11D0-A3FD-0800099F5878, Module Version `0200…` (2.21 era).
The data is in `DataArrayStm`: `i32 nArrays (=2)`, `i32 n`, then `n` f64 time values (s, 0,0.1,…,180) followed by
`n` f64 absorbance values. Metadata is in `MethodOcxStg/PageTexts0..5` (same PageTexts encoding, titles without brackets,
plus "Acquisition Parameters"), `ActivityInfoStm`, `TmcSpecificParamStm`, and
`HistoryStorage/HistoryStm` (the history stream has another name). The extension is `.kin` and the file sniffs as OLE, so `parse`
recognises it and rejects it by name rather than failing on a missing stream. Supporting it would be cheap: time-course XY data.

## 3. Shimadzu instrument "flat" `.spc` (not written by UVProbe)

Samples: `uritweb_009/017/023/083/113/301/317/325/476/762`, `hyspc_F80A20-1.SPC`, and the repo
fixture `uvprobe-flat.spc`. Seen in 367 real files. Spectragryph lists this as "Shimadzu UV-1600,
UV-1800 spectrometers (*.spc)" and Essential FTIR lists "Shimadzu UV 1800, 2500, 3600, 3600i (.spc .vspd)".
The files have no software strings and some have a 2001 default clock date, which matches files
saved by the stand-alone instrument (memory card / USB), not by PC software. The fixture name
"uvprobe-flat" is therefore probably misleading (**inferred**).

### 3.1 Layout (little-endian, header exactly 0x78 = 120 bytes; checked on all 367 files)

| offset | type    | meaning                                                                                                                            |
| ------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 0x00   | u16     | family flags: 0x0000, 0x0001, 0x0800, 0x1000                                                                                       |
| 0x02   | u16     | always 2                                                                                                                           |
| 0x04   | u16     | photometric/mode code: 1 (298 files, absorbance-like), 2 (18), 3 (51; data contains −4.0 floor values)                             |
| 0x06   | u16     | 3, 5 or 7 (probably scan speed code; unverified)                                                                                   |
| 0x08   | u16     | sampling-interval code when non-zero: 4 ⇔ 0.5 nm, 5 ⇔ 1 nm, 6 ⇔ 2 nm (3 seen once); 0 in nul-family files with 0.2 or 0.5 nm steps |
| 0x0A   | f32     | **x high** (end, nm), unaligned                                                                                                    |
| 0x0E   | f32     | **x low** (start, nm)                                                                                                              |
| 0x12   | f32     | display ordinate max                                                                                                               |
| 0x16   | f32     | display ordinate min (e.g. −0.005, −0.4)                                                                                           |
| 0x1C   | u16     | 2 (nul-time family) or 0 (colon family)                                                                                            |
| 0x24   | u16     | 0x0500 (nul family) or 0                                                                                                           |
| 0x28   | u16     | 0 (nul family) or 1/2 (colon family)                                                                                               |
| 0x64   | char[9] | time: `HH:MM:SS\0` **or** `HH:MM\0SS\0` (304 of 367 files)                                                                         |
| 0x6D   | char[9] | date `MM/DD/YY\0` (years 01 = instrument default, 15, 19, 20, 26…)                                                                 |
| 0x76   | u16     | nPoints                                                                                                                            |
| 0x78   | f32[n]  | ordinate values; x runs from x low to x high with step (high−low)/(n−1) ∈ {0.2, 0.5, 1, 2}                                         |

`file size == 0x78 + 4*n` in all 367 files. Detection could use this exact test on the fixed
offset instead of the current scan over offsets 2…300. The scan is what causes the RF-5300 false
positive (§4). The repo fixture is the only file with non-zero junk bytes in 0x1E–0x62 (`"%d"`,
`",1"`, `"01639.5"`), which looks like uninitialised memory, so bytes in that area must not be relied on.

Two sub-families can be distinguished (observed): the _nul-time_ family (u16@0 ∈ {0,1}, u16@0x1C=2, u16@0x24=0x500,
time `HH:MM\0SS`) and the _colon_ family (u16@0 ∈ {0,0x800,0x1000}, u16@0x28 ∈ {1,2}, time `HH:MM:SS`).
`readDate` accepts both `HH:MM:SS` and the nul-time `HH:MM\0SS`, so the time of either family is read.
The two-digit year remains ambiguous (`01` is a factory default date).

## 4. Shimadzu RF-5300 spectrofluorophotometer `.spc` (`uritweb_754.spc`, 1439 bytes)

Packed (unaligned) little-endian structure. Observed:

| offset | content                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| 0x00   | `01 E0` magic/version                                                                                                   |
| 0x02   | "RF-5300" (NUL padded)                                                                                                  |
| 0x12   | "1.1" (software/format version)                                                                                         |
| 0x1D   | "EM" (scan mode: emission; EX/SYNC presumably)                                                                          |
| 0x20   | u16 245 (unknown; possibly the fixed wavelength)                                                                        |
| 0x28   | "Super" (scan speed)                                                                                                    |
| 0x33   | f32 5.0 EX slit, 0x37 f32 5.0 EM slit, 0x3B f32 1.0 sampling interval                                                   |
| 0x3F   | f32 532, 0x43 f32 **220 (x start)**, 0x47 f32 **520 (x end)**, 0x4B 400, 0x4F 300, 0x53 600, 0x57 1000 (display ranges) |
| 0x5F.. | "High" (sensitivity), "Regular" (response), "Auto", "Auto", "Closed" (shutter)                                          |
| 0xD7   | time `17:39\004\0` (same `HH:MM\0SS` quirk as §3), 0xE0 date `09/06/19`                                                 |
| 0xE9   | u16 nPoints = 301                                                                                                       |
| 0xEB   | f32[301] intensities (528 … 389)                                                                                        |

220→520 at 1 nm gives exactly 301 points, which confirms the x range. The meaning of 532 is uncertain (EX wavelength?).
**Bug**: `isUVProbeFlat` accepts this file because u16 301 at 0xE9 fills the file exactly. The parser
then reads x from 0x0A/0x0E (zeros) and returns an x axis of all 0. The RF-5301PC software (same
family, default extension `.SPC` per the RF-5301PC manual) probably writes `01 E0 "RF-5301"`, but no sample was found.

## 5. EDAX / AMETEK EDS & XRF `.spc`

Samples: `rsciio_single_spect.spc` (v0.70, app 6.1), `rsciio_spd_map.spc`, `rsciio_line_scan.spc`
(v0.70, app 4.4), `rsciio_spc0_61-ipr333_xrf.spc` (v0.61 XRF, 4000 channels, 20740 bytes),
`uritweb_406.spc` (EDS spot "calcite"), `nexuslims_647_leo_edax_test.spc`. Specs:
`refdocs/edax_SPECTRUM-V70.pdf` (from rosettasciio) and the v0.58 table in `refdocs/archie_xrf_spectrum_format.pdf`.

Little-endian, fixed offsets: `f32 fVersion @0` (0.58/0.61/0.70), `f32 aVersion @4`, `i32 fileSize @24`,
`i32 dataStart @28` (3840 in all samples), `i16 numPts @32` (4000/4096), `i32 evPerChan @384` (5 or 10),
`f32 startEnergy @448`, `f32 endEnergy @452` (keV), then `numPts × u32` counts at `dataStart`.
Also: kV, tilt, live time, detector resolution, element list (`numElem`, `at[]`). The label
is at 0x68 in v0.70 files. The spec's "spectrumLabel @64" applies to older versions.
Files from an `.spd` map or `.lsd` line scan ship a sidecar `.spc` holding the sum spectrum, with the same format.
This is XY data (energy keV vs counts) and it is easy to support: x = startEnergy + i·evPerChan/1000.

## 6. Bruker EPR `.spc` + `.par` (ESP300/ECS106/EMX, WinEPR, Simfonia)

Samples: 12 EasySpin + 3 cwepr + 4 Eleana, each with its `.par`/`.PAR` companion (uppercase
`.SPC/.PAR` pairs exist). The `.spc` has **no header**. Everything comes from the ASCII `.par`
(`KEY value` lines, CR, LF or CRLF, `*` comments). The rules below are those of EasySpin `eprload_BrukerESP.m` (`refcode/`):

- If the `.par` has a line starting `DOS` ("DOS Format") → WinEPR/Simfonia, **float32 little-endian**.
  Otherwise → ESP/ECS (OS-9 / Aspect), **int32 big-endian**.
- `JSS` is a bit flag field: bit 5 (value 16) = complex, bit 13 (4096) = 2D. `ANZ` = total points,
  `SSX`/`SSY` = 2D sizes, `RES`/`REY`/`XPLS` override nx/ny.
- x axis: ENDOR → `GST + GSI·[0..1]`; EMX 2D → `XXLB/XXWI`, `XYLB/XYWI`; else GST/GSI if all four of
  HCF/HSW/GST/GSI are present, else `HCF ± HSW/2`; time sweep → `RCT`·i/1000 s. Units in `JUN` (G, MHz).
- Seen: 1D field sweeps (1024–8192 points), ENDOR (MHz), 2D power sweep (`EMX_2Dpowersweep`, 512×13),
  2D temperature sweep (`200-slice2d-winepr`), pulse ESE 2D (`eth_sband_qese_2d`, 600×20, 48000 bytes).
  `strong1esp` is a BES3T→ESP conversion ("converted from BEST file").

Supporting this needs both files. `parse(buffer)` only gets one buffer, so this format
fits spc-parser badly. At most, recognise it when the caller passes the `.par` as an option. A
standalone `.spc` cannot be told apart from random numbers.

## 7. Becker & Hickl TCSPC `.spc`: not a spectrum

Samples: `phconvert_test_noise.spc` (SPC-150, `.set` included), `tttrlib_bh_spc132.spc` (SPC-132,
32-bit), `tttrlib_bh_spc630_256.spc` (SPC-630 256-channel, 48-bit records); sha256 of both
tttrlib files match `tttrlib/test/settings.json`.

**Decision: not spectroscopic XY data.** The file is a FIFO list of single-photon events for
time-correlated single photon counting / FLIM / FCS. The first record is a header: SPC-1XX/8XX
u32 with bit 31 = 1, bits 0–23 = macrotime unit in 0.1 ns, bit 25 markers, bit 26 raw, and for
SPC-QC also routing bits 27–30. Then each record is 32 bits: bit31 invalid, 30 macrotime overflow, 29 gap, 28 marker,
27–16 ADC (nanotime = 4095 − ADC), 15–12 routing, 11–0 macrotime. SPC-6XX cards use 48-bit or
32-bit records with other bit layouts. The card model is in the `.set` file (first u16 revision → model code
0x20 SPC-130 … 0x28 SPC-150 …), and the `.set` also holds the ASCII `*IDENTIFICATION`/`*SETUP` blocks. A decay
histogram could be computed from the photons, but that is analysis, not file reading. The
Becker & Hickl imaging `.sdt` format holds decay curves and is not a `.spc`.
Recommendation: do not support. If detection is cheap, reject with a clear message
("Becker & Hickl TCSPC photon stream, not a spectrum").

## 8. AVIRIS 92AV3C `.spc` (spectral python sample data)

`nirs4all_92AV3C.spc`: plain ASCII, `FILE spectral_920530-930111.ascii`, a dashed line, then 224 rows
`centre_nm  fwhm  centre_std  fwhm_std  band#`. This is a sensor band-calibration table, not a
spectrum. Out of scope; it is useful only as a negative test ("not SPC").

## 9. Unidentified encrypted `.spc` (`0B F4 2D 4B 0F C3 7F CE`)

33 of the 906 uploads to the converter site (312 B to 289 KB), samples `uritweb_490/333/775.spc`.
Entropy is 7.2–8.0 bits/byte and no 8- or 16-byte block repeats, so this is not an ECB block cipher. XOR-ing any two files
gives a sparse, structured result: the files differ only at a few positions, and from offset 50 only at
**even** offsets. So this is a **fixed-keystream stream cipher** (for example RC4 with a constant key)
over a mostly constant plaintext that contains UTF-16LE strings from offset ~50 and later 8-byte records.
Vendor unknown. Because it was uploaded to a Shimadzu converter it may be Shimadzu software (a
LabSolutions-era product?), but this is **unverified**. Enough known plaintext would recover the
keystream. Not attempted here.

## 10. Variants searched for but not found as samples

- **Shimadzu LabSolutions UV-Vis**: native files are `.vspd` (not `.spc`). No public sample found.
- **Shimadzu IRsolution / LabSolutions IR**: `.smf`, `.ispd`, `.itcd` (OLE). IRsolution exports Galactic `.spc`. No non-Galactic IR `.spc` exists.
- **Shimadzu UVPC** (UV-2401PC/2501PC/1601PC era): Spectragryph mentions "Shimadzu UVPC .spc". Probably the pre-UVProbe
  PC format (possibly the same as §3). No sample identified as UVPC.
- **Shimadzu RF-5301PC**, RF-6000 (LabSolutions RF uses `.rf6`-type files): no sample besides the RF-5300.
- **Thermo Noran WinTrace / QuanX XRF `.spc`** (listed by Spectragryph): no sample, no public reader.
- **Hitachi**: UV Solutions `.uds`, FL Solutions `.fd3/.fds`. No Hitachi `.spc` exists as far as we can tell.
- Horiba, Jasco (`.jws`), PerkinElmer (`.sp`): other extensions.

## 11. What other readers do

- **ParseUV** (RJFernandezTeran, BSD-3): olefile; enumerates every `…DataSpectrumStorage/Data/X Data.N`
  under any prefix, so it handles multiple storages and datasets. Reads `DataSetHeaderInfo`/`DataSetHistory`/PageTexts as
  printable-string dumps.
- **uri-t shimadzu-spc-converter / g-damilano spcparser / Eleana ShimadzuSPC**: hand-written CFB
  walkers (512-byte sectors, SAT/SSAT, mini-stream), extracting X/Y Data.1 of a given path.
- **hyperSpec / hySpc.read.spc**: `read_spc_Shimadzu()` = "not yet implemented" stub (detects `D0 CF 11 E0`).
- **nirs4all-formats**: explicitly does not decode Shimadzu `.spc`, and only reads the UVProbe `.txt` export.
- **spectrochempy, specio, rohanisaac/spc, OpenSpecy**: Galactic only.
- **rosettasciio / hyperspy** (GPL-3): the reference EDAX `.spc/.spd/.ipr` reader. NIST NexusLIMS uses it for metadata.
- **EasySpin** (MIT), **cwepr** (BSD-2): Bruker ESP/WinEPR readers.
- **phconvert** (MIT), **tttrlib** (BSD-3): Becker & Hickl readers.

## 12. Actionable findings for spc-parser

1. OLE: enumerate every `DataStorageK/DataSetGroup/DataSetJ` (numeric sort) and return one spectrum
   each. Today 1 of up to 60 spectra is returned, and which one is arbitrary (on `urit_large_file` it is an interrupted scan).
2. OLE: y label/units from `Data Header.1` u32#2 (1 = T, 2 = Abs, 4 = R).
3. OLE: per-dataset metadata from `DataSetHeaderInfo` (name, OLE date, UVProbe version, instrument, serial).
4. OLE `.kin`: support `DataStg1/…/DataArrayStm` (time vs absorbance).
5. Flat: detect with the fixed header (u16@2 = 2, `0x78 + 4*u16@0x76 == size`, x range plausible) instead of
   scanning offsets. This removes the RF-5300 false positive.
6. Flat: accept `HH:MM\0SS` times. Expose the mode code u16@4 and the display y range.
7. RF-5300: dedicated reader (magic `01 E0 'RF-5'`, x from 0x43/0x47, n @0xE9, data @0xEB).
8. EDAX `.spc`: simple reader (§5), with a spec available.
9. Recognise but reject: B&H TCSPC, AVIRIS text, the encrypted family, and Bruker EPR if a `.par` is supplied.
