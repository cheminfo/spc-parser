# Thermo Galactic / GRAMS SPC — complete format specification and real-world quirk catalogue

Status: compiled 2026-09-18 for `cheminfo/spc-parser` (phase "authoritative spec + gap analysis").
Everything below is either (a) quoted/derived from the vendor documents listed in §1, or
(b) **verified by decoding real files** (§24 lists every fixture used and where it came from).
Statements that are _inferences_ (not written in any vendor document) are marked **[inferred]**,
and always carry the evidence that supports them.

Notation: offsets are byte offsets from the start of the structure, decimal unless `0x`.
`BYTE`=u8, `char`=i8 (signed), `WORD`=u16, `short`=i16, `DWORD`=u32, `long`=i32,
`float`=IEEE-754 binary32, `double`=binary64. Structures are packed (no padding).

---

## 1. Sources

### 1.1 Authoritative (vendor) documents

| id                  | document                                                                                                                                                         | where                                                                                                                                                                                                                                                                     | notes                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **SPC.H**           | `SPC.H`, Galactic Industries, Steven Simonoff 11-25-90, MRU 5-6-97                                                                                               | `github.com/colinbz/spc-sdk/SPC.H` (copy of Galactic `SPC_SDK.ZIP`; repo has no license, SDK README restricts use to writing converters). Identical copy in `github.com/qtplatz/qtplatz/contrib/galactic/spcfile/spc.h`. Local: `sources/galactic-spec/spc-sdk/SPC.H.txt` | "The 'official' description of the SPC file format is contained in the file SPC.H" (GSPCIO guide, title-page note). **Primary authority.** |
| **UDF**             | "Galactic Universal Data Format Specification" 9/4/97 (J. Duckworth), 53 pages, includes SPC.H as Appendix A                                                     | `colinbz/spc-sdk/gspc_udf.pdf` (+ `.doc`); Internet Archive `web.archive.org/web/20040116104459id_/http://www.thermogalactic.com:80/instruments/spcdata/gspc_udf.pdf`. Local text: `spc-sdk/gspc_udf.txt`                                                                 | Prose description of every field, file layouts, log-text keys, NMR/NIR conventions. Contains a few typos (listed in §23).                  |
| **GSPCIO**          | "A Brief Guide to SPC File Format and Using GSPCIO", Thermo Galactic 2001, 13 pages                                                                              | `docs.c6h6.org/docs/assets/files/spc-3bb9ec9e4c158c5418bcfcc970be77f1.pdf`; also yumpu doc 40416248. Local: `gspcio/gspcio-guide.txt`                                                                                                                                     | Settles the **W-plane grouping** and the **reversed CR/LF** log-text issue. Its printed byte offsets are WRONG from `flast` on (see §23).  |
| **GRAMSDDE.H**      | Galactic DDE definitions (fpost, fprocs codes, XFRBEG)                                                                                                           | `colinbz/spc-sdk/GRAMSDDE.H`                                                                                                                                                                                                                                              | Code tables for `fpost`, `fprocs`.                                                                                                         |
| **gdrv_udi**        | "Galactic Universal Driver Interface" 10/18/96                                                                                                                   | `colinbz/spc-sdk/gdrv_udi.pdf`                                                                                                                                                                                                                                            | Older log-key list; confirms `YTYPE -1 = Reference Arbitrary Energy`.                                                                      |
| **SDK data**        | 13 example files shipped with the SDK (`S_EVENX, S_XY, M_EVENZ, M_ORD(Z), M_XYXY, 4D_MAP, FT-IR, RAMAN, NMR_FID, NMR_SPC, NIR(+CFL), MS`)                        | `colinbz/spc-sdk/Data`, identical to our `src/galactic/__tests__/data` fixtures                                                                                                                                                                                           | Reference behaviour of Galactic's own writer.                                                                                              |
| **Thermo demo set** | 12 files published by Thermo Galactic 2003-2004 (`fluor, gamma, gc_gasln.cgm, hplc.cgm, ir-nh4, ms-barb, nir-poly, nmr-unk, raman, uv-holm, vis-mirr, xraydiff`) | Wayback `http://www.thermogalactic.com:80/products/dataviewer/spcfiles/*` (fetched with `web.archive.org/web/<ts>id_/`), found via `jnsturgis/SpectroscoPy/SPC_Format_Notes.md`                                                                                           | No license stated. Written by GRAMS itself.                                                                                                |

### 1.2 Other readers/writers studied (behaviour, bugs and the quirks they handle)

| reader                           | language, license                                 | studied files                                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| rohanisaac/spc                   | Python, GPL-3.0                                   | `spc/spc.py`, `sub.py`, `global_fun.py` (+ forks: Quasars/orange-spectroscopy, icemage001, simonjia, whtowbin, SimoneCnt/spectropy, NickMacro/spc-spectra used by Wasatch ENLIGHTEN)                   |
| spectrochempy `read_spc`         | Python, CeCILL-B                                  | `src/spectrochempy/core/readers/read_spc.py`                                                                                                                                                           |
| hyperSpec / hySpc.read.spc       | R, GPL-3 / MIT                                    | `R/read_spc.R`, `R/read_spc_Kaiser.R`, `R/read_spc_Shimadzu.R`, CRAN `hyperSpec 0.99-20201127` `R/read.spc.R` + `fileio` vignette, issues hySpc.read.spc#2,#3,#15,#29 and cbeleites/hyperSpec#124,#286 |
| h2020charisma/spc-io             | Python, MIT                                       | `low_level/spc_raw.py`, `sub_file.py`, `headers/*.py`                                                                                                                                                  |
| GBeurier/nirs4all-formats        | Rust, CeCILL-2.1 OR AGPL-3.0                      | `crates/nirs4all-formats/src/readers/galactic_spc.rs`, `docs/formats/galactic-spc.md`                                                                                                                  |
| kogens/spcfile                   | Python, LGPL-3.0                                  | `spcfile/spcfile.py`                                                                                                                                                                                   |
| bsenkel/spc-spectra              | Rust, MIT                                         | `src/log.rs`, `src/bytes.rs`, `CHANGELOG.md`, `README.md`                                                                                                                                              |
| jnsturgis/SpectroscoPy           | Python, MPL-2.0                                   | `SPC_Format_Notes.md`, `spectroscopy/io/spc.py`                                                                                                                                                        |
| pquarterman17/quantized          | Python, Apache-2.0                                | `src/quantized/io/spc.py`                                                                                                                                                                              |
| JHeimdal/HalIR                   | C, GPL-3.0                                        | `src/halir_spc.c` (reader + writer)                                                                                                                                                                    |
| Altaxo                           | C#, GPL-3.0                                       | `GalacticSpcReader.cs`                                                                                                                                                                                 |
| sandialabs/SMASHtoolbox          | MATLAB, BSD-3                                     | `@GalacticSPC/GalacticSPC.m`, `read.m` (old format only)                                                                                                                                               |
| stonerlab/Stoner-PythonCode      | Python, GPL-3.0                                   | `Stoner/formats/data/instruments.py`                                                                                                                                                                   |
| waikato-datamining/adams         | Java, GPL-3.0                                     | `SPCSpectrumReader.java`                                                                                                                                                                               |
| WasatchPhotonics/SPyC_Writer     | Python, MIT (a **writer**)                        | `SPCFileWriter.py`, `SPCHeader.py`, `SPCLog.py`, `SPCDate.py`                                                                                                                                          |
| WasatchPhotonics/ENLIGHTEN       | Python, MIT                                       | `enlighten/parser/SPCFileParser.py`                                                                                                                                                                    |
| Ocean Optics OmniDriver GramsSPC | C/Java headers (in shohid-al-morsalin/NewDiesMap) | `GramsSPCHeader.h`, `GramsSPCSubHeader.h`, `GramsSPCConstants.h`                                                                                                                                       |
| MathWorks `tgspcread`            | MATLAB doc                                        | mathworks.com/help/bioinfo/ref/tgspcread.html                                                                                                                                                          |

---

## 2. Identification, variants, extensions, collisions

- Byte 0 = `ftflgs`, **byte 1 = `fversn`** (the "check byte", SPC.H l.17-21):
  - `0x4B` — new format, little-endian ("LSB 1st"). The only format Galactic's own converters write after July 1996 (UDF p.6); third-party software still wrote `0x4D` files in 2013 (`DOERNER.spc`, old header, year field 113).
  - `0x4C` — new format, big-endian ("MSB 1st"). "most Galactic software products do not support it" (UDF p.11). **No public sample exists** (checked: rohanisaac, kogens, nirs4all, spectrochempy all say so).
  - `0x4D` — old format (Spectra Calc / Lab Calc, DOS). Different 256-byte header, see §18.
  - `0x4E` is claimed by one README (nirs4all samples) but appears in no vendor document — ignore.
- GRAMS uses many extensions for SPC-format files (UDF p.21-22): `SPC, CGM, GC, LC, HC, FIR, IR, VIS, UV, XRY, MS, NMR, RMN, EFL, AAS, DAS, OTR`. `.cgm` (chromatogram) files are normal SPC files, typically with `TCGRAM` (Thermo demo `gc_gasln.cgm`, `hplc.cgm`). A reader must sniff bytes, never trust the extension.
- `.spc` collisions (not Galactic): Shimadzu UVProbe OLE2 (`D0 CF 11 E0`), Shimadzu UVProbe "flat" dumps (e.g. `F80A20-1.SPC` starts `00 08`), Bruker EPR `.spc` (headerless raw floats/ints + `.par`; xylib `bruker_spc`), hyperspectral `92AV3C.spc` (`46 49 ..`), and rohanisaac's "0xCF Shimadzu". Bruker EPR data can have _any_ second byte, so a sniffer that only tests byte 1 can misclassify it — validate the header (§22).
- GRAMSDDE XFRBEG: DDE transfer blocks start with `FE 18 06 12` followed by 512 bytes and then an SPC image (GRAMSDDE.H l.11-25). Not a file variant, but a robust reader may strip it.

---

## 3. Byte order and primitive types

- 0x4B and 0x4D: little-endian. 0x4C: every multi-byte numeric field (header, subheaders, X/Y arrays, directory, LOGSTC) is big-endian; byte fields and text are unchanged; the `fdate` bit layout applies to the DWORD _value_.
- Text fields are single-byte strings. The spec says "ASCII", real files contain Windows-1252/ISO-8859-1 (e.g. `µ` = 0xB5 in Renishaw WiRE and Horiba LabSpec logs, `¹` = 0xB9 in LabSpec `RANGE (CM-¹)`), and Python writers (Wasatch SPyC_Writer) emit UTF-8. Decode: try strict UTF-8, fall back to windows-1252 (this is exactly `ensureString()` from `ensure-string`). **Never** decode bytes ≥0x80 as signed char codes (iobuffer `readChars` does `String.fromCharCode(int8)` → U+FF80..U+FFFF garbage, e.g. `65ﾵm`).

---

## 4. New-format main header `SPCHDR` (512 bytes) — SPC.H l.130-163, UDF p.7-18

| off | size | type      | SPC.H name | meaning / rules                                                                                                                                                                    |
| --: | ---: | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   0 |    1 | BYTE      | `ftflgs`   | flag bits, §5                                                                                                                                                                      |
|   1 |    1 | BYTE      | `fversn`   | `0x4B` / `0x4C` (`0x4D` → §18)                                                                                                                                                     |
|   2 |    1 | BYTE      | `fexper`   | instrument technique, §6.1                                                                                                                                                         |
|   3 |    1 | char      | `fexp`     | **signed** Y exponent; `0x80` (−128) ⇒ IEEE float32 Y; **negative exponents are legal and used** (`m_evenz` −1, `XYTRACE` −1, `hplc.cgm` −2, `CONTOUR` −5); `0` is a real exponent |
|   4 |    4 | DWORD     | `fnpts`    | number of points; **if `TXYXYS`: byte offset of the subfile directory, or 0 = no directory**                                                                                       |
|   8 |    8 | double    | `ffirst`   | X of first point (ignored for `TXYXYS`; for `TXVALS` should equal X[0] but "do not necessarily correspond" — GSPCIO p.7)                                                           |
|  16 |    8 | double    | `flast`    | X of last point                                                                                                                                                                    |
|  24 |    4 | DWORD     | `fnsub`    | number of subfiles; "1 if not TMULTI"; UDF: "1 or null" when not TMULTI → **0 must be read as 1**                                                                                  |
|  28 |    1 | BYTE      | `fxtype`   | X unit code, §6.2                                                                                                                                                                  |
|  29 |    1 | BYTE      | `fytype`   | Y unit code, §6.3                                                                                                                                                                  |
|  30 |    1 | BYTE      | `fztype`   | Z unit code, §6.2 (value 15 = ZTEXTL, §16.3)                                                                                                                                       |
|  31 |    1 | BYTE      | `fpost`    | DDE posting disposition, §6.5                                                                                                                                                      |
|  32 |    4 | DWORD     | `fdate`    | packed date, §17                                                                                                                                                                   |
|  36 |    9 | char[9]   | `fres`     | resolution text, NUL-terminated (writers fill all 9 bytes or leave garbage after NUL, §16)                                                                                         |
|  45 |    9 | char[9]   | `fsource`  | source instrument text                                                                                                                                                             |
|  54 |    2 | WORD      | `fpeakpt`  | ZPD index (0-based) for interferograms (`fytype`=1; UDF's "fytype=2" is a typo); 0 = unknown                                                                                       |
|  56 |   32 | float[8]  | `fspare`   | Array Basic storage (8 floats, each byte-swapped in 0x4C; **never reverse the array order**)                                                                                       |
|  88 |  130 | char[130] | `fcmnt`    | memo, NUL-terminated; text after the first NUL is leftover garbage in practice (§16.2); "may extend into fcatxt if TALABS is not set" (SPC.H l.170-173)                            |
| 218 |   30 | char[30]  | `fcatxt`   | custom X, Y, Z axis labels, each NUL-terminated, in X,Y,Z order (§16.3)                                                                                                            |
| 248 |    4 | DWORD     | `flogoff`  | byte offset of LOGSTC or 0 (§14)                                                                                                                                                   |
| 252 |    4 | DWORD     | `fmods`    | modification flags, §6.6                                                                                                                                                           |
| 256 |    1 | BYTE      | `fprocs`   | DDE processing code, §6.5                                                                                                                                                          |
| 257 |    1 | BYTE      | `flevel`   | calibration level + 1 (1 = not calibration data)                                                                                                                                   |
| 258 |    2 | WORD      | `fsampin`  | sub-method sample injection number (1 = first/only)                                                                                                                                |
| 260 |    4 | float     | `ffactor`  | concentration multiplier                                                                                                                                                           |
| 264 |   48 | char[48]  | `fmethod`  | method/program filename comma list (garbage after NUL is common, e.g. `uv-holm`: `\0ollect Running - Channel 1`)                                                                   |
| 312 |    4 | float     | `fzinc`    | even-Z increment (0 ⇒ use `subnext−subtime` of first subfile), §11                                                                                                                 |
| 316 |    4 | DWORD     | `fwplanes` | number of W planes (0 = not 4D), §12                                                                                                                                               |
| 320 |    4 | float     | `fwinc`    | W plane increment (0 ⇒ uneven, use `subwlevel`), §12                                                                                                                               |
| 324 |    1 | BYTE      | `fwtype`   | W unit code (same table as X); no custom W label exists (UDF p.18)                                                                                                                 |
| 325 |  187 | char[187] | `freserv`  | reserved, "must be zero" — contains garbage in some files (Andor `BC408_5mmHorizontal.spc`)                                                                                        |

`struct.calcsize('<cccciddicccci9s9sh32s130s30siicchf48sfifc187s') == 512`.

---

## 5. `ftflgs` — SPC.H l.339-351, UDF p.7-10

| bit | value | name     | meaning                                                   | notes                                                                                                                                                                             |
| --: | ----: | -------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   0 |  0x01 | `TSPREC` | Y fixed-point values are 16-bit (else 32-bit)             | "only if fexp is NOT 0x80h … If fexp is set to 0x80h … DO NOT set TSPREC!" (UDF p.7). **Float wins**: if the governing exponent is −128, values are float32 regardless of TSPREC. |
|   1 |  0x02 | `TCGRAM` | "Enables fexper in older software (CGM if fexper=0)"      | `TCGRAM && fexper==0` ⇒ general chromatogram. In practice `fexper` is honoured without TCGRAM (WiRE writes fexper 11 without it).                                                 |
|   2 |  0x04 | `TMULTI` | multifile                                                 | governs which exponent applies (§9) and whether `fnsub` >1 is meaningful                                                                                                          |
|   3 |  0x08 | `TRANDM` | arbitrary (random) Z values                               | mutually exclusive with TORDRD; UDF: "should not be used"                                                                                                                         |
|   4 |  0x10 | `TORDRD` | ordered but uneven Z (explicit `subtime` per subfile)     | seen without TMULTI in single-subfile files (`ms-barb.spc` 0xF0) — harmless                                                                                                       |
|   5 |  0x20 | `TALABS` | use `fcatxt` labels                                       | GSPCIO calls it "(obsolete)"; still used by OMNIC, SPEX/JY, GRAMS XRD. ZTEXTL (§16.3) is the other trigger.                                                                       |
|   6 |  0x40 | `TXYXYS` | each subfile has its own X array; "must be 0 if TXVALS=0" | set **with or without TMULTI** (single-subfile MS: `ms.spc` 0xE1, `ms-barb.spc` 0xF0). GRAMS draws TXYXYS data as sticks (MS centroids).                                          |
|   7 |  0x80 | `TXVALS` | explicit float X array(s)                                 | "Code depends on TXVALS being the sign bit"                                                                                                                                       |

Data layouts (UDF p.8-10; GSPCIO p.1):

| layout                            | flags                     | X source                                       | per-subfile content                                                          |
| --------------------------------- | ------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `Y` (single, even X)              | none of TMULTI/TXVALS     | `ffirst..flast`, `fnpts` points                | SUBHDR + Y[fnpts]                                                            |
| `XY` (single, uneven X)           | TXVALS                    | float32[fnpts] right after the 512-byte header | SUBHDR + Y[fnpts]                                                            |
| `YY` (multi, even X)              | TMULTI                    | generated                                      | fnsub × (SUBHDR + Y[fnpts])                                                  |
| `XYY` (multi, common uneven X)    | TMULTI\|TXVALS            | one float32[fnpts] after header                | fnsub × (SUBHDR + Y[fnpts])                                                  |
| `XYXY` (multi, own X per subfile) | TMULTI\|TXVALS\|TXYXYS    | per subfile                                    | fnsub × (SUBHDR + X float32[subnpts] + Y[subnpts]); optional directory (§13) |
| single XYXY (MS stick)            | TXVALS\|TXYXYS, no TMULTI | per subfile                                    | 1 × (SUBHDR + X[subnpts] + Y[subnpts]); `fnpts`=0 (no directory)             |

Order in file (SPC.H l.69-89): `SPCHDR · [X array if TXVALS && !TXYXYS] · subfiles · [directory if TXYXYS && fnpts≠0] · [LOGSTC + log data if flogoff≠0]`.
The log/directory are _normally_ at the end but are located **only** through `flogoff`/`fnpts`; gaps between blocks exist in real files (IG_BKGND: 2196 bytes between data end and `flogoff`; TXYXYS files: directory between data and log).

Invalid/odd combinations seen or specified: TXYXYS without TXVALS (spec-invalid; GRAMS-like behaviour = ignore TXYXYS, hyperSpec forces TXVALS, nirs4all treats as XYXY → at least warn); TRANDM+TORDRD (treat as explicit Z); TMULTI with `fnsub`=1 (TriVista, fine); `fnsub`=0 without TMULTI (read 1); `fnsub`>1 without TMULTI (hyperSpec/Altaxo/HalIR read 1 subfile; bsenkel reads fnsub — prefer 1 + warning).

---

## 6. Code tables

### 6.1 `fexper` — SPC.H l.369-386 (authoritative) vs UDF p.11 table

|   code | SPC.H name | label                                                                                                                                                                                                                                                                                           |
| -----: | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|      0 | SPCGEN     | General SPC (could be anything) — with `TCGRAM` ⇒ general chromatogram                                                                                                                                                                                                                          |
|      1 | SPCGC      | Gas Chromatogram                                                                                                                                                                                                                                                                                |
|      2 | SPCCGM     | General Chromatogram (same as SPCGEN with TCGRAM)                                                                                                                                                                                                                                               |
|      3 | SPCHPLC    | HPLC Chromatogram                                                                                                                                                                                                                                                                               |
|      4 | SPCFTIR    | FT-IR, FT-NIR, FT-Raman Spectrum or Igram (can also be used for scanning IR)                                                                                                                                                                                                                    |
|      5 | SPCNIR     | NIR Spectrum (usually multi-spectral data sets for calibration)                                                                                                                                                                                                                                 |
|      6 | —          | **undefined in SPC.H**; the UDF prose table (p.11) says `SPCUV 0x06` and "0x07 Not Defined – Do not use" (contradicting its own Appendix A). GRAMSDDE's experiment-letter order (S,C,G,L,H,F,I,**V**,U,X,M,N,R,E,A,D,O) suggests 6 = "VIS". **Map 6 to "UV-VIS (code 6)"**, never to "General". |
|      7 | SPCUV      | UV-VIS Spectrum (can be used for single scanning UV-VIS-NIR)                                                                                                                                                                                                                                    |
|      8 | SPCXRY     | X-ray Diffraction Spectrum                                                                                                                                                                                                                                                                      |
|      9 | SPCMS      | Mass Spectrum (single, GC-MS, continuum, centroid or TOF)                                                                                                                                                                                                                                       |
|     10 | SPCNMR     | NMR Spectrum or FID                                                                                                                                                                                                                                                                             |
|     11 | SPCRMN     | Raman Spectrum (usually diode array/CCD; FT-Raman uses SPCFTIR)                                                                                                                                                                                                                                 |
|     12 | SPCFLR     | Fluorescence Spectrum                                                                                                                                                                                                                                                                           |
|     13 | SPCATM     | Atomic Spectrum                                                                                                                                                                                                                                                                                 |
|     14 | SPCDAD     | Chromatography Diode Array Spectra                                                                                                                                                                                                                                                              |
| 15-255 | —          | unknown: report as `unknown (code N)` and keep the raw code                                                                                                                                                                                                                                     |

Reality: all 12 Thermo demo files and all 12 new-format SDK files have `fexper=0` ("In most Galactic SPC files in circulation today, the fexper parameter has been left set at null", UDF p.11). Do not infer the technique from fexper alone. Reader bugs: rohanisaac/quantized index a list ⇒ codes ≥7 are shifted by one (9 reported as NMR…, 14 crashes); hyperSpec's list omits FT-IR (4 → "NIR"); kogens invented its own table.

### 6.2 `fxtype`, `fztype`, `fwtype` — SPC.H l.267-303, UDF p.14 & 25

|   code | name    | label                                               | suggested {quantity, units}                                                                  |
| -----: | ------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
|      0 | XARB    | Arbitrary                                           | {"", ""}                                                                                     |
|      1 | XWAVEN  | Wavenumber (cm-1)                                   | {Wavenumber, cm⁻¹}                                                                           |
|      2 | XUMETR  | Micrometers (um)                                    | {Wavelength, µm}                                                                             |
|      3 | XNMETR  | Nanometers (nm)                                     | {Wavelength, nm}                                                                             |
|      4 | XSECS   | Seconds                                             | {Time, s}                                                                                    |
|      5 | XMINUTS | Minutes                                             | {Time, min}                                                                                  |
|      6 | XHERTZ  | Hertz (Hz)                                          | {Frequency, Hz}                                                                              |
|      7 | XKHERTZ | Kilohertz (KHz)                                     | {Frequency, kHz}                                                                             |
|      8 | XMHERTZ | Megahertz (MHz)                                     | {Frequency, MHz}                                                                             |
|      9 | XMUNITS | Mass (M/z)                                          | {m/z, ""}                                                                                    |
|     10 | XPPM    | Parts per million (PPM)                             | {Chemical shift, ppm}                                                                        |
|     11 | XDAYS   | Days                                                | {Time, d}                                                                                    |
|     12 | XYEARS  | Years                                               | {Time, a}                                                                                    |
|     13 | XRAMANS | Raman Shift (cm-1)                                  | {Raman shift, cm⁻¹}                                                                          |
|     14 | XEV     | eV                                                  | {Energy, eV}                                                                                 |
|     15 | ZTEXTL  | "XYZ text labels in fcatxt (old 0x4D version only)" | labels come from fcatxt (§16.3); also found in a **new-format** file (`gamma.spc` fztype=15) |
|     16 | XDIODE  | Diode Number                                        |                                                                                              |
|     17 | XCHANL  | Channel                                             |                                                                                              |
|     18 | XDEGRS  | Degrees                                             | {Angle, °} (XRD 2θ)                                                                          |
|     19 | XDEGRF  | Temperature (F)                                     | °F                                                                                           |
|     20 | XDEGRC  | Temperature (C)                                     | °C (WITec writes fztype=20 for plain spectrum index — do not trust it)                       |
|     21 | XDEGRK  | Temperature (K)                                     | K                                                                                            |
|     22 | XPOINT  | Data Points                                         |                                                                                              |
|     23 | XMSEC   | Milliseconds (mSec)                                 | ms                                                                                           |
|     24 | XUSEC   | Microseconds (uSec)                                 | µs                                                                                           |
|     25 | XNSEC   | Nanoseconds (nSec)                                  | ns                                                                                           |
|     26 | XGHERTZ | Gigahertz (GHz)                                     | GHz                                                                                          |
|     27 | XCM     | Centimeters (cm)                                    | cm                                                                                           |
|     28 | XMETERS | Meters (m)                                          | m                                                                                            |
|     29 | XMMETR  | Millimeters (mm)                                    | mm                                                                                           |
|     30 | XHOURS  | Hours                                               | h                                                                                            |
| 31-254 | —       | unknown (keep code)                                 |                                                                                              |
|    255 | XDBLIGM | Double interferogram (no display labels)            |                                                                                              |

"XEV and XDIODE - XMETERS are new and not supported by all software" (SPC.H l.268).

### 6.3 `fytype` — SPC.H l.305-337, UDF p.15 & 26, gdrv_udi p.11, spc-io `YREFARBE`

|       code | name     | label                                                                 |
| ---------: | -------- | --------------------------------------------------------------------- |
|          0 | YARB     | Arbitrary Intensity                                                   |
|          1 | YIGRAM   | Interferogram                                                         |
|          2 | YABSRB   | Absorbance                                                            |
|          3 | YKMONK   | Kubelka-Munk (SPC.H spells "Kubelka-Monk")                            |
|          4 | YCOUNT   | Counts                                                                |
|          5 | YVOLTS   | Volts                                                                 |
|          6 | YDEGRS   | Degrees                                                               |
|          7 | YAMPS    | Milliamps                                                             |
|          8 | YMETERS  | Millimeters                                                           |
|          9 | YMVOLTS  | Millivolts                                                            |
|         10 | YLOGDR   | Log(1/R)                                                              |
|         11 | YPERCNT  | Percent                                                               |
|         12 | YINTENS  | Intensity                                                             |
|         13 | YRELINT  | Relative Intensity                                                    |
|         14 | YENERGY  | Energy                                                                |
|         15 | —        | NOT USED                                                              |
|         16 | YDECBL   | Decibel                                                               |
|      17-18 | —        | NOT USED                                                              |
|         19 | YDEGRF   | Temperature (F)                                                       |
|         20 | YDEGRC   | Temperature (C)                                                       |
|         21 | YDEGRK   | Temperature (K)                                                       |
|         22 | YINDRF   | Index of Refraction [N]                                               |
|         23 | YEXTCF   | Extinction Coeff. [K]                                                 |
|         24 | YREAL    | Real                                                                  |
|         25 | YIMAG    | Imaginary                                                             |
|         26 | YCMPLX   | Complex                                                               |
|     27-127 | —        | unknown                                                               |
|        128 | YTRANS   | Transmission                                                          |
|        129 | YREFLEC  | Reflectance                                                           |
|        130 | YVALLEY  | Arbitrary or Single Beam with Valley Peaks                            |
|        131 | YEMISN   | Emission                                                              |
|    132-254 | —        | unknown                                                               |
| 255 (= −1) | YREFARBE | Reference Arbitrary Energy (UDF p.26 / gdrv_udi p.11 list it as `-1`) |

"(The first 127 have positive peaks.)" / "ALL TYPES >=128 ARE ASSUMED TO HAVE INVERTED PEAKS" — expose `invertedPeaks = fytype >= 128`.
`[N]` and `[K]` are _symbols_, not units (K is not kelvin!).

### 6.4 Subfile flags `subflgs` — SPC.H l.221-223

`SUBCHGD 0x01` subfile changed · `SUBNOPT 0x08` do not use peak table file · `SUBMODF 0x80` modified by arithmetic. Other bits are undefined; WITec writes uninitialised memory (0x02, 0x20, 0x2C, 0x48, 0x70, 0xD0 observed). Keep the raw byte.

### 6.5 `fpost` / `fprocs` — GRAMSDDE.H l.103-166

`fpost`: 0 PSTDEFT default, 1 PSTSAVE, 2 PSTAPPD, 3 PSTMERG, 4 PSTBACK, 5 PSTNONE, 6 PSTKEEP, 7 PSTBOTH, 8 PSTASK (SPEX/JY files write 7).
`fprocs`: 0 = unspecified (PPDEFLT); otherwise `PPKNOWN (1)` must be added to the sum of `PPCOMP 1`, `PPDLLC 2`, `PPTRANS 4`, `PPABSRB 8`, `PPKMUNK 12 (4+8)`, `PPPEAK 32`, `PPSRCH 64`, `PPUSER 128` (GRAMSDDE's own example: compute+search = 1+64+1 = 66; PPKNOWN and PPCOMP share the value 1, so the table is self-inconsistent; PPTRANS/PPABSRB/PPKMUNK are mutually exclusive). Informational only; `uv-holm.spc`/`HOLMIUM.SPC` have fpost 1, fprocs 1.

### 6.6 `fmods` — SPC.H l.353-367 (corrected)

SPC.H's struct comment says "1=A,2=B,4=C,8=D..", its table says `"A" (2^01)`, `"B" (2^02)`… — the table is **off by one**. Verified mapping: **bit n (0-based) ↔ letter `'A'+n`**. Evidence (bit set ↔ audit-log line in the same file):
`m_evenz` 0x4000 (bit 14 = **O**) ↔ "O = Other Function (FUNCTION.ab)"; `BARBITUATES`/`KKSAM`/`xraydiff` 0x400000 (bit 22 = **W**) ↔ "W = Modified Date/Time (FILEINFO.AB)"; `DRUG_SAMPLE_PEAKS` 0x480100 = W + bit 19 **T** + bit 8 **I** ↔ "I = Interpolated (GCMS.AB)", "T = Truncated (GCMS.AB)"; `XYTRACE` 0x480000 ↔ "T = Truncated (SPLICE.AB)".
Letters: A averaging, B baseline, C interferogram→spectrum computation, D derivative/integration, E resolution enhancement, I interpolation, N noise-reduction smoothing, O other (add/subtract…), S spectral subtraction, T truncation, W collection date/time modified, X X-units conversion/shift, Y Y-units conversion, Z zap. Other letters have no documented meaning.

---

## 7. Reading order (new format)

```
header = SPCHDR @0
pos = 512
if TXVALS && !TXYXYS: xCommon = float32[fnpts] @pos; pos += 4*fnpts
n = TMULTI ? fnsub : 1      (fnsub==0 && !TMULTI ⇒ 1)
if TXYXYS && fnpts != 0 && directory valid (§13): read subfiles at dir[i].ssfposn
else: read n subfiles sequentially from pos
log: if flogoff != 0 → LOGSTC @flogoff (never "at current position")
```

---

## 8. Subfile header `SUBHDR` (32 bytes) — SPC.H l.209-239, UDF p.18-20

| off | size | type    | name        | meaning                                                                                                                                                                                                                      |
| --: | ---: | ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   0 |    1 | BYTE    | `subflgs`   | §6.4                                                                                                                                                                                                                         |
|   1 |    1 | char    | `subexp`    | subfile exponent; `0x80` float; **ignored unless TMULTI** (SPC.H l.217); `0` is legal                                                                                                                                        |
|   2 |    2 | WORD    | `subindx`   | 0-based index; "must be correct for all subfiles", but it is a WORD → wraps above 65535 subfiles (LabSpec maps with 140 000 spectra exist, hySpc #3) ⇒ use the sequential position for computations                          |
|   4 |    4 | float   | `subtime`   | Z of subfile (start)                                                                                                                                                                                                         |
|   8 |    4 | float   | `subnext`   | Z end (collection end) — may equal subtime; LabSpec writes the _next_ subfile's subtime (wrapping to the first for the last one); WITec writes NaN/denormals                                                                 |
|  12 |    4 | float   | `subnois`   | peak-pick noise level, valid only if its high byte is non-zero (`FSNOIS`, SPC.H l.239)                                                                                                                                       |
|  16 |    4 | DWORD   | `subnpts`   | points of this subfile, **only meaningful for TXYXYS** ("For all other file types, it must be set to null", UDF p.19 — but WiRE/WITec/LabSpec write `fnpts`, and `s_xy.spc` has 4 while fnpts=512) ⇒ ignore it unless TXYXYS |
|  20 |    4 | DWORD   | `subscan`   | co-added scans or 0                                                                                                                                                                                                          |
|  24 |    4 | float   | `subwlevel` | W value (meaningful only if `fwplanes`≠0)                                                                                                                                                                                    |
|  28 |    4 | char[4] | `subresv`   | reserved (spaces in `wplanes.spc`, garbage in WITec)                                                                                                                                                                         |

"This header must always be present even if there is only one subfile" (SPC.H l.216). In the old format the first SUBHDR is embedded in the 256-byte main header (§18).

---

## 9. Y values — SPC.H l.52-67, UDF p.11-12, p.18-19

### 9.1 Encodings

- fixed 32-bit: `y = int32 · 2^(exp−32)`; fixed 16-bit (TSPREC): `y = int16 · 2^(exp−16)` (`0x40000000` = 0.25; with exp 2 → 1.0).
- float: `exp == −128 (0x80)` ⇒ IEEE float32 (4 bytes/point, TSPREC ignored).
- Old format 32-bit fixed values have their two 16-bit words swapped (§18.3).

### 9.2 Which exponent governs (verified)

```
exp = TMULTI ? subexp : fexp                         // SPC.H l.217 "if TMULTI is not set, then the subexp is ignored in favor of fexp"
if TMULTI && fexp == -128 && subexp != -128: exp = -128   // hyperSpec/spc-io quirk rule, see below
isFloat = exp == -128 ; bytesPerY = isFloat ? 4 : (TSPREC ? 2 : 4)
```

- `subexp == 0` is **a real exponent** under TMULTI, never "not filled in" — verified: `m_evenz.spc` subfile 1 (subexp 0, fexp −1): with exp 0 the maxima of subfiles 0,1,2,3 are 0.1295, **0.4758**, 1.619, 3.392 (smooth kinetic growth); substituting fexp gives 0.2379 (breaks the series). `DEMO_3D.SPC` (the old-format original of m_evenz) has the same subexp 0 on subfile 1. bsenkel/spc-spectra documents the same rule.
- Mixed subfiles exist: `nir.spc` (SDK) has fexp=4 but some subfiles subexp=−128 (float) — the per-subfile rule handles it.
- `fexp == −128` with integer `subexp` under TMULTI: hyperSpec and spc-io read float; bsenkel refuses as ambiguous. No sample in the corpus; recommended: float + warning.
- Not TMULTI with `subexp ≠ fexp`: follow fexp (`NDR0002.SPC` fexp 2/subexp 0; `test_input.spc` fexp −128/subexp 0 — both need fexp).
- The UDF recommends homogeneous storage ("either all float or all block scaled integers", p.19) — not always respected.

---

## 10. X values

- Even: `X[i] = ffirst + i·(flast−ffirst)/(fnpts−1)` (UDF p.8 prints the formula without `ffirst +` — typo; GSPCIO p.6 has it right). `fnpts == 1` ⇒ `[ffirst]`.
- `TXVALS`: float32. Must be monotonic (increasing or decreasing), "not random order" (UDF p.9). Direction is information (descending wavenumbers are the norm for IR) — keep it or record it.
- `TXYXYS`: per-subfile X arrays are **float32** (SPC.H l.82, UDF p.10, GSPCIO p.4). rohanisaac, its forks, nirs4all and quantized read them as `int32·2^(exp−32)` — a bug (Wasatch ENLIGHTEN contains explicit code to undo it). With float32 `m_xyxy` X = 43.9, 42.9 … m/z.
- XYXY subfiles "must always be in the same orientation" (GSPCIO p.10).

---

## 11. Z axis (multifiles) — SPC.H l.209-219, UDF p.8, 17, 19; GSPCIO p.7, 9

Let `n` = 0-based sequential position of the subfile, `S0` = first subfile header.

- **Even Z** (TMULTI, neither TORDRD nor TRANDM): `inc = fzinc != 0 ? fzinc : S0.subnext − S0.subtime`; `Z(n) = S0.subtime + inc·n`. "subtime and subnext are optional (and ignored) for all but the first subfile" (SPC.H l.211-213). Old format has no `fzinc` ⇒ always the first-subfile difference.
  - Verified: `m_evenz.spc` (fzinc 0.5) stored subtimes 0, **1.0**, 1.5, 2.0… but the computed 0, 0.5, 1.0… match the subtimes of its source `DEMO_3D.SPC` exactly.
  - `CONTOUR.SPC` (old): S0 = (0, 2.0), later subtimes 1.0 → Z = 0, 2, 4, …
  - `IG_MULTI.SPC` (Bio-Rad): fzinc 1.18395 but stored subtimes step 1.0985 → spec value = fzinc; expose raw subtime/subnext too.
  - degenerate `inc == 0` (WiRE `raman-sion.spc`: fzinc 0, all subtime 0) or non-finite (`subnext` NaN in WITec, hySpc#2 crash) ⇒ fall back to explicit subtime if they differ, else the index.
- **Ordered / random Z** (TORDRD or TRANDM): `Z(n) = subtime(n)`; `subnext(n)` is the end of collection (LabSpec: next subtime). TRANDM: no ordering guarantee.
- 4D files (§12): the Z value resets for every W plane (verified on LabSpec 6 map: subtimes 277.34, 282.34, 287.33, 292.32 repeated per plane). For even-Z 4D files use `n mod planeSize` **[inferred]** (only physically sensible reading of `4d_map.spc`: 11×11 map, fzinc 10 µm, fwinc 10 µm).
- Directory `ssftime` duplicates `subtime` but can be garbage (`m_xyxy.spc` entry 0 = 6.0e-41) — prefer subtime.
- Z units: `fztype` (new) / high nibble of `oyear` (old). Z label from fcatxt when TALABS/ZTEXTL (§16.3).

---

## 12. W axis / 4D data — SPC.H l.114-127, UDF p.18, **GSPCIO p.4**

- `fwplanes` = **number of planes** (SPC.H struct comment "Number of planes for 4D"). Subfiles are bundled consecutively: `planeSize = fnsub / fwplanes` (must divide evenly). "if there are 5 W planes and 20 subfiles, each block of 4 subfiles will belong to a W plane and will each have the same W value" (GSPCIO p.4). SPC.H's phrase "incremented by fwinc after each group of fwplanes subfiles" is ambiguous and is resolved by GSPCIO and by the LabSpec 6 file below.
- `plane(n) = floor(n / planeSize)`.
- `fwinc != 0`: `W(n) = S0.subwlevel + fwinc · plane(n)` (UDF p.18 prints `fzinc` in this formula — typo).
- `fwinc == 0`: uneven W, `W(n) = subwlevel` of the first subfile of the plane (all subfiles of a plane "should have the same subwlevel"; planes must be monotonic). "some software may not handle fwinc=0".
- Evidence:
  - `4d_map.spc` (SDK): fnsub 121, fwplanes 11, fwinc 10, fzinc 10, subwlevel(0)=0, fztype=fwtype=2 (µm) → 11×11 map, W = 0,10,…,100.
  - **Horiba LabSpec 6** map (`labspec6-sample.spc`, hyperSpec#124 attachment): fnsub 12, **fwplanes 3**, fwinc 0, subwlevel = −4021.37 ×4, −4016.37 ×4, −4011.38 ×4 ⇒ planeSize 4 — proves `planeSize = fnsub/fwplanes` (h2020charisma/spc-io uses `subindx // fwplanes`, correct only for square maps).
  - `wplanes.spc` (hySpc.read.spc): fnsub 30, fwplanes 9 (not a divisor), subwlevel/subnois hold ±1/±2 grid-like values ⇒ writer misuse; fall back to raw `subwlevel` + warning.
- W units = `fwtype`; no custom W label (UDF p.18) — hyperSpec nevertheless reads a 4th fcatxt string as W label.

---

## 13. Subfile directory `SSFSTC` (TXYXYS) — SPC.H l.32-50 & 241-249, UDF p.12, p.20

| off | size | type  | name      | meaning                                             |
| --: | ---: | ----- | --------- | --------------------------------------------------- |
|   0 |    4 | DWORD | `ssfposn` | file offset of the subfile's SUBHDR                 |
|   4 |    4 | DWORD | `ssfsize` | bytes of SUBHDR + X + Y (may be larger than needed) |
|   8 |    4 | float | `ssftime` | copy of subtime                                     |

- Present iff `TXYXYS && fnpts != 0`; `fnsub` entries at offset `fnpts`, "normally … at the end of the file after the last subfile" and before the log.
- **Subfiles may not be sequential**: "when the directory is present, the subfiles may not be sequentially stored … GRAMS/32 add[s] points to subfiles by moving them to the end of the file". Verified in `m_xyxy.spc` (SDK): dir[0] → offset 42960, size 96 (relocated copy after the last subfile; the stale copy at 512 is 80 bytes); ssftime of dir[0] is garbage. BARBITUATES/DRUG_SAMPLE/DRUG_SAMPLE_PEAKS directories match the sequential layout.
- Validation (hyperSpec-derived): `fnpts ≥ 512`, `fnpts + 12·fnsub ≤ fileSize`, `flogoff == 0 || fnpts + 12·fnsub ≤ flogoff`, every `ssfposn ≥ 512`, `ssfposn + 32 ≤ fileSize`. Invalid ⇒ sequential walk + warning.
- Do not derive the point count from `ssfsize` (spectrochempy does `(ssfsize−32)/8`, wrong for TSPREC and padded slots); use `subnpts`.
- No directory (fnpts = 0): GRAMS builds one by scanning; readers walk sequentially (`ms.spc`, `ms-barb.spc`, HalIR writer output).

---

## 14. Log block `LOGSTC` — SPC.H l.105-112 & 251-265, UDF p.20-21, p.35, GSPCIO p.4-5

| off | size | type     | name      | meaning                                                                                                               |
| --: | ---: | -------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
|   0 |    4 | DWORD    | `logsizd` | bytes of the whole block on disk (LOGSTC + binary + disk + text incl. its terminating NUL)                            |
|   4 |    4 | DWORD    | `logsizm` | memory size, "next larger multiple of 4096" — **unreliable** (Wasatch writes `4096·round(size/4096)`, possibly 0)     |
|   8 |    4 | DWORD    | `logtxto` | offset of the text **from the start of LOGSTC**                                                                       |
|  12 |    4 | DWORD    | `logbins` | size of the binary area right after LOGSTC (loaded into memory; NMR imaginary data)                                   |
|  16 |    4 | DWORD    | `logdsks` | size of the "disk" binary area after the binary area (not loaded by GRAMS). UDF p.21 mislabels its heading "Logsizd". |
|  20 |   44 | char[44] | `logspar` | reserved (`wplanes.spc` contains `****`)                                                                              |

Rules:

- Seek to `flogoff`; never assume the log follows the data (gaps: IG_BKGND; TXYXYS directory in between).
- `binary = bytes[flogoff+64 .. +logbins]`, `disk = bytes[flogoff+64+logbins .. +logdsks]`, `text = bytes[flogoff+logtxto .. flogoff+logsizd]` — **clamp to file size** (`test_input.spc` claims 172 bytes beyond EOF). `logtxto` may be > 64+logbins+logdsks (Stoner-PythonCode claims Renishaw puts a 16-byte timestamp there; unverified — our WiRE files have logtxto 64) — always honour `logtxto`, never read sequentially. `logtxto == logsizd` ⇒ no text (`wplanes.spc`, `LabRam-1.spc` with `logsizd` 64).
- Text terminates at the first NUL ("After the final line's CR and LF must come a zero character", SPC.H l.109-111); bytes after it inside `logsizd` are garbage in SPEX/JY files (`KRY3.SPC`: `…\r\n\0` + `92`; `TS01.SPC`: `\0\0\xf0`). bsenkel reports writers that separate entries with NULs — only keep post-NUL segments if they look like `key=value` text.
- Some files carry one extra byte after `logsizd` (WiRE: the NUL), others have trailing bytes after the log (`wplanes.spc`: 246).
- Wasatch SPyC_Writer: writes the log after the data but always sets `flogoff = 0`, packs LOGSTC with native `long` (8 bytes on Linux/macOS) and no terminating NUL — a heuristic "LOGSTC right after the data/directory" probe is needed to recover it.
- NMR (UDF p.35-36): imaginary part stored in the binary area as float32, **same number of points as the Y data** (NMR_FID: logbins 65536 = 16384 × 4; FID.SPC 32768 = 8192 × 4). Absent when log key `SPC_REAL=TRUE`.

---

## 15. Log text conventions (UDF p.23-44; real files)

### 15.1 Syntax

- Lines "`KeyName = value`", each ending with CR LF (UDF p.23). "routines that read … must be written such that the key names are not case sensitive". Numbers may be followed by units after at least one space ("`BEGX = 4000 cm-1`").
- Line endings seen: CRLF (GRAMS, Kaiser, WiRE, OMNIC…), **LF CR** (Horiba LabSpec: `LabRam-2`, `cell01`, `CAthickyellow`, `labspec6-sample`) — GSPCIO p.7 warns "it is possible for them to be in reversed order in the file", lone LF. Split on any run of CR/LF.
- Split each line at the **first** `=` only (values contain `=`, e.g. "`…(FILEINFO.AB) User=brigitte`"; rohanisaac/spc-io split on every `=` and truncate). Trim both sides. Keep empty values (`ACQ. TIME (S) = `).
- Duplicate keys occur (Kaiser `Comment` twice) — keep all entries in order.
- Locale decimal commas (Kaiser `Temperature=-85,50`, `Laser_Wavelength=785,21`).
- INI-like sections `[FILEINFO] … [END FILEINFO]`, `[SCAN PARAM]`, `[WiRE2 ZeroLevelAndDarkCurrent]`, `[FAST FOURIER TRANSFORM]`; blank lines " ".
- GRAMS audit/history lines: `YYYY/MM/DD HH:MM  L = Description (PROGRAM.AB) User=name` or `YY/MM/DD HH:MM  L = …` where `L` is the fmods letter (§6.6). They contain `=` but are not key/values.
- Free text lines and tables (DRUG_SAMPLE_PEAKS peak table; WiRE date line "17/08/2026 15:24:20").

### 15.2 Galactic standard keys (UDF)

General (p.24): BEGX, ENDX, NPTS, BEGZ, ENDZ, NSUBS, XTYPE, YTYPE, ZTYPE, RES, NAME, MEMO, COMMENT, USER, MODEL (by convention first line). gdrv_udi adds IVER, DVER, GVER and allows suffix digits 1-9.
FT-IR (p.27-28): SCANS, SCANSBG, NAMEBG, GAIN, SPEED, VELOCITY, LWN, RAMANFREQ, RAMANPWR, JSTOP, BSTOP, DET, SRC, BSPLITTER, PURGE, ZFF, IRMODE, APOD, PHASE, PHASEPTS, IGRAMSIDE, IGRAMDIR, POLARIZER, LOWPASS, HIGHPASS, FILTER, SMOOTH, BEAM, AVGTIME, BDELAY, SDELAY, CHANNEL.
NIR (p.29-32): NODE, PPROCxx, CHANNEL, SENSORCNT, SENSORNAMEx, **SUBFILEx** (`MM/DD/YY(YY), HH:MM:SS, "memo"` — per-subfile date/label, 1-based x), **SENSORVALx**. Concentrations live in a companion `.CFL` file (old and new CFL formats, p.30-32).
UV/VIS (p.33-34): NAMESTD, NAMEZR, NAMEBG, GAIN, SLIT1, SLIT2, DET, SRC, BEAM, BDELAY, SDELAY, PMT, DETCHG, DETCOR, SRCCHG, GRTCHG, INDEPENDENT, SCANMODE, SIGNOISE, SNLEVEL, SNTIMEOUT, NIR_*, CORRECTION, CORR_TYPE, SCANTYPE.
NMR (p.35-43): must be first; ends with `NMREND=NMREND`; INSTRUM, SOLVENT, NUCLEUS, DETMODE, NUCFREQ, SW_HZ, DWELL, DELAY, ACQTIME, SCANS, REQSCAN, FLTFREQ, PULSWD, SW_PPM, AB_APPS, FIDFILE, FID, SPC_REAL, DCOFF, ZFF, APOD, APODP(0..), PHMOD, PH0, PH1, PV0, PV1, AUTOTYP, SPC_REV, DELTA_PPM, INTBAS, INTOFF, BASE, NORM, MASK_ON, IREGNx, MREGNx, PEAK_TBL, PEAK_MODE, THRESH, SENS, SMOOTH, PICK_TYPE, WINDOW, PK_MARK, PK_LABEL, LBL_FORM, TR_OBJ, PEAK_MASK, PREGNx. FID X axis in seconds; spectra in Hz or ppm.
AIA (p.44): block between `AIA_info_begin` and `AIA_info_end`.

### 15.3 Vendor examples (verified)

Kaiser HoloGRAMS: `Stage_X/Y/Z_Position` (hyperSpec `read_spc_Kaiser_map`), `Acquisition_Date_Time=22.09.2009 03:41:30`, decimal commas. Kaiser iC Raman (`time.spc`): `Audit_Log_Version=1.4`, `SubFile_Number`, `Acquisition_Date_and_Time=1/30/2016 08:49:58`. Horiba LabSpec: `KEY (UNIT) = value`, `DATE = 02/19/16 16:43:05` or `DATE = 23.02.2015 13:17`, `X (µM) = `. Renishaw WiRE: `Key=Value`, `Slit_opening=65µm`, WiRE2 sections. Ocean Optics SpectraSuite: `MEMO = …`, `USER = …`, `COMMENT = …` (the memo is in the log, fcmnt empty). Bio-Rad: `Key= value`. Essential FTIR: sections + `First X = 400.000000 cm-1`. SPEX/JY: `[SCAN PARAM]`, Fortran numbers `.15590E5`.

---

## 16. Text fields

### 16.1 Decoding rule

Take the bytes up to the first NUL (or the whole field if none), decode UTF-8-else-windows-1252, trim. Keep the raw bytes available (round-trip, forensic use).

### 16.2 Garbage after the NUL (very common)

`Ft-ir.spc` fcmnt `FT-IR Spectrum Example\0torials: polystyrene`; `NMR_SPC.SPC`, `ir-nh4.spc` (`Ammonia Gas at 1 cm-1\0 Gas at 1 cm-1\0um for exercise #3`), `KRY*/HENE*/MERC/RUBY18/TS01`, `TOLUENE.SPC` (`…\0RY CELL: NEAT \r\nBP= 110.6C …`), `uv-holm` fmethod `\0ollect Running - Channel 1`, `nmr-unk` fsource binary, `resolutionPro` fres 9 non-NUL garbage bytes + fsource `Agilent\0\xee`, Andor `BC408` fcmnt/fcatxt/freserv full of float data. GRAMS displays only up to the NUL. bsenkel/hyperSpec keep the other NUL-separated fragments; expose them separately at most.

### 16.3 Custom axis labels (`fcatxt`) — SPC.H l.91-98, UDF p.16, GSPCIO p.7

- Split the 30 bytes at NUL into up to three strings X, Y, Z (keep empty positions: `NDR0002` = `\0Raman Intensity` ⇒ X empty, Y "Raman Intensity"). "If a label is only the terminating zero byte then the fxtype, fytype, or fztype (or Arbitrary Z) type label is used instead. The labels may not exceed 20 characters each and all three must fit in 30 bytes."
- Use them when **`TALABS`** is set, or when the Z type is **`ZTEXTL` (15)** — old format: high nibble of `oyear`; seen in a new-format file too (`gamma.spc` fztype 15: X `KeV`, Y `Counts`).
- Examples: `RAMAN.SPC` Y `Rmn Intensity`; `m_xyxy/s_xy/ms.spc/BARBITUATES` Y `Abundance`; SPEX/JY X `Wavenumber (cm-1)` or `Wavelength (nm)`, Y `(arb)` (fxtype 0!); `xraydiff.spc` `deg (2theta)` / `a.u.` / `Arbitrary Z`; `ms-barb` `Mass (m/z)` / `Arbitrary `.
- Labels present **without** TALABS: `DRUG_SAMPLE.SPC` (`Mass (M/z)\0Abundance\0Minutes`), garbage in Andor files ⇒ do not override, but expose.
- A label is free text such as "Wavenumber (cm-1)" — split into quantity/unit only heuristically.

---

## 17. Dates

### 17.1 New format `fdate` (SPC.H l.144, UDF p.16)

`minute = v & 0x3F; hour = (v>>6) & 0x1F; day = (v>>11) & 0x1F; month = (v>>16) & 0x0F (1-12); year = v>>20` (12 bits). `v == 0` ⇒ no date. No seconds, no time zone (local time of the acquiring PC).

### 17.2 Vendor variants (verified)

| writer                                                       | layout                                                                                           | evidence                                                                                                                                                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Galactic/GRAMS, OMNIC, Kaiser, Ocean Optics, Andor, Bio-Rad… | spec                                                                                             | SDK files, Thermo demo set                                                                                                                                                                                                    |
| **Horiba LabSpec (5 & 6)**                                   | spec bit layout but `year` = **years since 1900** and `month` **0-based** (C `struct tm`)        | `CAthickyellow_try4_18` fields 116/1/19 16:46 ↔ log `DATE = 02/19/16 16:46:45`; `DERt3_1` 116/1/19 17:36 ↔ `02/19/16 17:36:11`; `labspec6-sample` 120/4/18 (May 2020 hyperSpec issue); `LabRam-2` 115/1/25, `cell01` 117/3/27 |
| **Renishaw WiRE**                                            | MS-DOS date/time (`year−1980`<<25, month<<21 **0-based**, day<<16, hour<<11, min<<5, sec/2), UTC | `raman-caco3.spc` 0x5CF16B0A = 2026-08-17 13:24:20 (log shows 15:24:20 local); `raman-sion.spc`                                                                                                                               |
| Essential FTIR                                               | spec layout encoding 1969-12-31 18:00 (= Unix epoch in UTC−6: "no date")                         | `test_input.spc` 0x7B1CFC80                                                                                                                                                                                                   |
| GRAMS arithmetic output                                      | invalid value 0x00005000 (year 0, month 0, day 10)                                               | `m_evenz.spc` → must yield "no date"                                                                                                                                                                                          |

Recommended decoding: 0 → none; spec fields valid with year ∈ [1900, 2200] → spec; year ∈ [70, 299] and month ∈ 0..11 → LabSpec (year+1900, month+1); DOS layout valid (year 1980-2107, month field 0-11) → WiRE; else → none + keep raw value. (DOS dates ≥ 2040 collide with the spec range; acceptable.)

### 17.3 Old format (`oyear`, `omonth`, `oday`, `ohour`, `ominute`)

`year = oyear & 0x0FFF` ("MSB 4 bits are Z type"), `oyear == 0` ⇒ no date/time, month 1-based. Years are stored as 4 digits (`CONTOUR` 1997), 2 digits (`m_ordz` 92) or years-since-1900 (`DOERNER` 113 = 2013): `year < 1900 ⇒ year + 1900` (pquarterman17/quantized uses `year < 200`).

---

## 18. Old format `0x4D` (Spectra Calc / Lab Calc) — SPC.H l.167-207, UDF p.11

### 18.1 `OSPCHDR` (256 bytes, **including the first subfile header**)

| off | size | type      | name      | meaning                                                                                                                    |
| --: | ---: | --------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
|   0 |    1 | BYTE      | `oftflgs` | same bits as ftflgs (TSPREC, TMULTI, TORDRD… are used; TXVALS/TXYXYS/logs are "not supported for the old format")          |
|   1 |    1 | BYTE      | `oversn`  | 0x4D                                                                                                                       |
|   2 |    2 | short     | `oexp`    | exponent as a signed WORD                                                                                                  |
|   4 |    4 | float     | `onpts`   | number of points **as a float** (round it)                                                                                 |
|   8 |    4 | float     | `ofirst`  | first X (single precision)                                                                                                 |
|  12 |    4 | float     | `olast`   | last X                                                                                                                     |
|  16 |    1 | BYTE      | `oxtype`  | X type                                                                                                                     |
|  17 |    1 | BYTE      | `oytype`  | Y type                                                                                                                     |
|  18 |    2 | WORD      | `oyear`   | bits 0-11 year (0 = no date), **bits 12-15 Z type** (`DEMO_3D` 0x57CD → year 1997, Z=5 minutes; `m_ordz` 0x505C → 92, Z=5) |
|  20 |    1 | BYTE      | `omonth`  | 1 = Jan                                                                                                                    |
|  21 |    1 | BYTE      | `oday`    |                                                                                                                            |
|  22 |    1 | BYTE      | `ohour`   |                                                                                                                            |
|  23 |    1 | BYTE      | `ominute` |                                                                                                                            |
|  24 |    8 | char[8]   | `ores`    | resolution text (NUL-terminated unless all 8 used)                                                                         |
|  32 |    2 | WORD      | `opeakpt` |                                                                                                                            |
|  34 |    2 | WORD      | `onscans` | number of scans                                                                                                            |
|  36 |   28 | float[7]  | `ospare`  | Array Basic values (`LC_DIODE_ARRAY` 2089, 2, 2)                                                                           |
|  64 |  130 | char[130] | `ocmnt`   | memo                                                                                                                       |
| 194 |   30 | char[30]  | `ocatxt`  | labels (used when Z type nibble = 15 ZTEXTL, or TALABS)                                                                    |
| 224 |   32 | SUBHDR    | `osubh1`  | header of the first subfile; its Y data start at 256                                                                       |

"in memory all headers use 288 bytes"; "224 or 256 in old" (SPC.H l.70). No `fnsub`, `fzinc`, `fmethod`, W planes, log block or directory.

### 18.2 Subfiles and their count

Layout: `[224..256) SUBHDR0, Y0, SUBHDR1, Y1, …` (each subfile = 32 + bytesPerY·npts). Nothing stores the count: `count = TMULTI ? floor((fileSize − 224) / (32 + bytesPerY·npts)) : 1`; warn if a remainder exists; never read a partial subfile. All corpus files divide exactly (`m_ordz` 10 × 3460, `LC_DIODE_ARRAY` 350 × 394 (16-bit), `CONTOUR` 19 × 748, `DEMO_3D` 32 × 716, `DOERNER` 1 × 6440). GSPCIO (title-page note) claims the old format "does not support multifiles" — contradicted by these Lab Calc multifiles.
Exponent: TMULTI ? `subexp` : `oexp` (per-subfile exponents vary: `LC_DIODE_ARRAY` −6/−5/−3/−1, `m_ordz` 3…6; `DEMO_3D` subfile 1 has subexp 0 and must use 0). Z: even Z from `osubh1.subnext − osubh1.subtime` (no fzinc); TORDRD from subtime.

### 18.3 Old 32-bit word order (SPC.H l.56-57, 180-182)

"the old format 32-bit Y values have the two words reversed from the Intel least-significant-word-first order. Within each word, the least significant byte comes first, but the most significant word is first."
Bytes `b0 b1 b2 b3` ⇒ `int32 = (int16LE(b0,b1) << 16) | uint16LE(b2,b3)` = `b1<<24 | b0<<16 | b3<<8 | b2`. 16-bit (TSPREC) values are plain little-endian int16 (`LC_DIODE_ARRAY`, smooth data). Float old-format Y is undocumented (rohanisaac/nirs4all accept subexp 0x80 as float LE) — accept for robustness.

---

## 19. Big-endian `0x4C`

All numeric fields big-endian; no sample file exists publicly. Verified that swapping every multi-byte field of 9 real 0x4B files (tool `sources/galactic-spec/tools/to_big_endian.py`, outputs `fixtures/synthetic/be_*.spc`) gives identical results through spc-parser's `setBigEndian()` path, except `fspare` (spc-parser reverses the array). Known reader bugs: spectrochempy computes its struct prefix before switching to big-endian (reads LE); rohanisaac/hyperSpec/HalIR/spc-io/Altaxo/nirs4all/bsenkel refuse 0x4C.

---

## 20. Vendor quirk catalogue

| writer                           | quirk                                                                                                                                                                                                                                 | evidence file(s)                                                       | handling                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| Galactic GRAMS / SDK             | relocated XYXY subfile + garbage ssftime                                                                                                                                                                                              | `m_xyxy.spc`                                                           | follow directory, prefer subtime |
| Galactic GRAMS                   | even-Z subtimes after the first are stale                                                                                                                                                                                             | `m_evenz.spc`                                                          | compute Z                        |
| Galactic GRAMS                   | TMULTI subexp 0 legitimately                                                                                                                                                                                                          | `m_evenz.spc`, `DEMO_3D.SPC`                                           | never substitute fexp            |
| Galactic GRAMS                   | mixed float/int subfiles                                                                                                                                                                                                              | `nir.spc`                                                              | per-subfile exponent             |
| Galactic converters              | fcatxt labels without TALABS; ZTEXTL in new format                                                                                                                                                                                    | `DRUG_SAMPLE.SPC`, `gamma.spc`                                         | §16.3                            |
| Galactic                         | garbage after NUL in text fields                                                                                                                                                                                                      | SDK + demo files                                                       | NUL-truncate                     |
| Horiba LabSpec                   | date year−1900 & 0-based month; LF CR log lines; latin-1 `µ ¹`; `KEY (UNIT) = v`; `subnext` = next subtime; W planes via subwlevel (fwinc 0); up to 140 000 subfiles                                                                  | `LabRam-*`, `cell01_*`, `CAthickyellow*`, `DERt3_1`, `labspec6-sample` | §11, §12, §15, §17               |
| Renishaw WiRE                    | MS-DOS UTC date with 0-based month; `µ` in log; maps written as plain TMULTI with Z=0 (spatial info lost, hyperSpec vignette); `subnpts`=fnpts; 1 byte after logsizd                                                                  | `raman-caco3`, `raman-sion`                                            | §17, §11                         |
| WITec Project                    | subheader fields other than subexp/subindx/subtime/subnpts are uninitialised (subflgs, subnext NaN/denormal, subnois, subscan, subwlevel, subresv); fztype 20; fdate 0; Z = index; hyperSpec crashes on NaN (#2) and on subscan > 2³¹ | `Witec-*`, `P_A32_*`, `witec-LAS.spc`                                  | validate/ignore those fields     |
| Kaiser HoloGRAMS / iC Raman      | one spectrum per file for maps (stage position in log), decimal commas, pixel X axis (1..1340) split low/high files; TORDRD time series with Z in s                                                                                   | `ebroAV*.spc`, `time.spc`                                              | log parsing                      |
| Andor Solis                      | uninitialised memory in fres/fcmnt/fcatxt/fmethod/freserv                                                                                                                                                                             | `BC408_5mmHorizontal.spc`                                              | NUL-truncate, ignore freserv     |
| Agilent Resolutions Pro          | fres with 9 non-NUL garbage bytes, fsource garbage after NUL                                                                                                                                                                          | `resolutionPro.spc`                                                    | NUL/length truncate, decode      |
| SPEX / Jobin-Yvon (SynerJY-like) | TALABS with X label but fxtype 0, fpost 7, log `\0` + garbage                                                                                                                                                                         | `KRY*`, `HENE*`, `MERC`, `RUBY18`, `TS01`                              | §14, §16.3                       |
| Essential FTIR                   | log block claims 172 bytes past EOF; epoch-like date                                                                                                                                                                                  | `test_input.spc`                                                       | clamp, date heuristics           |
| Thermo OMNIC                     | TALABS Y label, single file with subexp 0 ≠ fexp                                                                                                                                                                                      | `NDR0002.SPC`                                                          | fexp governs                     |
| Ocean Optics SpectraSuite        | TXVALS float; memo in log (MEMO/USER/COMMENT keys)                                                                                                                                                                                    | `OceanOptics.spc`                                                      | map log keys                     |
| Bio-Rad                          | even-Z file whose subtimes contradict fzinc                                                                                                                                                                                           | `IG_MULTI.SPC`                                                         | spec value + raw                 |
| TriVista                         | TMULTI with fnsub 1                                                                                                                                                                                                                   | `TriVista-*.spc`                                                       | fine                             |
| Wasatch ENLIGHTEN (SPyC_Writer)  | flogoff always 0 although log written; LOGSTC with native 8-byte longs on Linux/macOS; `subnpts = 2·n` for XYXY; fpeakpt packed as float16; UTF-8 text                                                                                | source code only                                                       | heuristics §14, §22              |
| NIRSystems (via GRAMS)           | per-subfile metadata in `SUBFILEx` log keys + `.CFL` companion                                                                                                                                                                        | `nir.spc`, `nir.cfl`                                                   | §15.2                            |
| Varian/Bruker NMR via GRAMS      | imaginary data in log binary                                                                                                                                                                                                          | `NMR_FID`, `NMR_SPC`, `FID.SPC`                                        | §14                              |

---

## 21. Behaviour of other readers (summary of quirks they handle and bugs they have)

| topic     | rohanisaac                                                                                      | spectrochempy                                          | hyperSpec                                     | spc-io                        | nirs4all                      | others                                            |
| --------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------- | ----------------------------- | ----------------------------- | ------------------------------------------------- |
| exponent  | TMULTI?subexp:fexp but reads bytes unsigned: negative exponents → 0 (m_evenz subfile 0 doubled) | subexp only for XYXY, else fexp (wrong for multifiles) | !TMULTI→fexp; fexp −128 wins                  | float if either is −128       | negative → treated as 0 (bug) | Stoner/adams: any negative exponent ⇒ float (bug) |
| XYXY X    | int32 scaled (bug)                                                                              | float                                                  | float                                         | float                         | int32 scaled (bug)            | quantized int (bug); ENLIGHTEN undoes             |
| directory | used (slices by ssfsize)                                                                        | npts from ssfsize/8                                    | required for TMULTI XYXY (fails without)      | read sequentially after data  | used with bounds checks       | HalIR follows ssfposn                             |
| log       | flogoff+logtxto, logsizd bytes, split `=` (value truncated)                                     | text to EOF, UTF-8                                     | latin1→UTF-8, NUL→CRLF, split CRLF, first `=` | sequential ("assume packed")  | key/value                     | kogens: first NUL, latin-1                        |
| Z         | none                                                                                            | ignores fzinc                                          | fzinc/subnext fallback (NaN crash)            | even/ordered                  | —                             |                                                   |
| W         | none                                                                                            | none                                                   | partial                                       | `subindx // fwplanes` (wrong) | —                             | kogens raw subwlevel                              |
| old 0x4D  | loop until exception                                                                            | word swap, iterate to EOF                              | refused                                       | refused                       | word swap, stop at partial    | quantized ignores TSPREC                          |
| 0x4C      | no                                                                                              | header parsed LE (bug)                                 | refused                                       | refused                       | refused                       | kogens: yes                                       |
| dates     | spec                                                                                            | spec + old (Z nibble decoded)                          | spec (divides by 1048560)                     | spec                          | raw                           | kogens validates 1900-2100                        |

---

## 22. Robustness rules

1. Header: new format needs 512 bytes, old 256 — otherwise throw a clear "truncated header" error.
2. Validate before allocating: `fnpts·4` (X) and each subfile size against the remaining bytes; cap `fnsub` by `(fileSize − dataStart)/32`.
3. Subfiles: stop at the first subfile that does not fit; return the complete ones with a warning (or throw in strict mode) — never a raw `RangeError` from DataView.
4. Log: `flogoff` beyond EOF ⇒ no log + warning; clamp every area; ignore an unreadable log rather than failing the spectra (bsenkel does the same).
5. Directory: validate (§13), else sequential.
6. Treat non-finite subheader floats as absent.
7. Keep raw codes and raw bytes alongside decoded values; collect warnings.
8. Sniffing: accept 0x4B/0x4C/0x4D only if the header is plausible (e.g. new: `fnsub ≤ 10⁷`, `512 + dataSize ≤ fileSize` or TXYXYS; old: `onpts` finite > 0).

---

## 23. Known errors in the vendor documents

- GSPCIO main-header table offsets are wrong from `flast` on (prints 15, 23, 27… instead of 16, 24, 28…; last row ends at 511) and the subheader table is 1-based.
- GSPCIO: "old format … does not support multifiles" — false (Lab Calc multifiles exist).
- UDF p.8 X formula lacks `ffirst +`; UDF p.11 fexper table says SPCUV = 6 (SPC.H: 7); UDF p.17 fpeakpt "fytype=2" (YIGRAM = 1); UDF p.18 W formula uses `fzinc` (must be `fwinc`); UDF p.21 second "Logsizd" heading is `logdsks`; UDF p.35 "next larger power of 4096" (multiple).
- SPC.H fmods table exponents are 1-based (§6.6); "Kubelka-Monk" spelling; W grouping sentence ambiguous (§12).

---

## 24. Fixture index (all under `sources/galactic-spec/` unless noted)

| file(s)                                                                                                                                                                   | origin / license                                             | exercises                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/Users/lpatiny/git/cheminfo/spc-parser/src/galactic/__tests__/data/*` (4d_map, Ft-ir, NMR_FID, NMR_SPC, RAMAN, m_evenz, m_ordz, m_xyxy, ms, nir.spc/.cfl, s_evenx, s_xy) | Galactic SDK (also rohanisaac/spc, GPL-3.0 repo)             | 4D, log, NMR imaginary, even Z + subexp 0, old ordered Z, relocated XYXY directory, single XYXY, mixed float/int, TXVALS                                                                               |
| same dir: NDR0002 (OMNIC), raman-caco3 & raman-sion (WiRE), resolutionPro (Agilent)                                                                                       | owner-provided                                               | TALABS, DOS date, µ, garbage fres                                                                                                                                                                      |
| `rohanisaac-spc/test_data/*`                                                                                                                                              | rohanisaac/spc (GPL-3.0)                                     | Andor garbage, LabSpec date + LF CR + Z scan, old DOERNER (year 113), SPEX/JY TALABS + log garbage, Essential FTIR truncated log                                                                       |
| `fixtures/hySpc.read.spc/inst/extdata/**`                                                                                                                                 | r-hyperspec/hySpc.read.spc (MIT)                             | Galactic demo (BARBITUATES/DRUG_SAMPLE directories, CONTOUR/DEMO_3D/LC_DIODE_ARRAY old incl. 16-bit, FID, IG_* Bio-Rad, XYTRACE, KKSAM…), Kaiser, LabRam, WITec, TriVista, time.spc, wplanes.spc(+txt) |
| `nirs4all-formats/samples/**`                                                                                                                                             | GBeurier/nirs4all-formats (CeCILL-2.1/AGPL-3.0)              | LabSpec cell01, Ocean Optics, non-Galactic 92AV3C                                                                                                                                                      |
| `fixtures/thermogalactic-archive/*`                                                                                                                                       | Thermo Galactic via Internet Archive (no license)            | gamma (ZTEXTL new format), xraydiff (3 labels), ms-barb, .cgm TCGRAM, fexp −2                                                                                                                          |
| `fixtures/github-issues/labspec6-sample.spc`, `witec-LAS.spc`                                                                                                             | attachments of cbeleites/hyperSpec#124 and #286 (no license) | LabSpec 6 4D map (fwplanes 3), WITec NaN subnext                                                                                                                                                       |
| `fixtures/synthetic/*`                                                                                                                                                    | generated here                                               | 0x4C, fspare, TSPREC+float, fnsub 0, truncation, old trailing bytes, stale XYXY, flogoff 0, old no-date, old ZTEXTL                                                                                    |

Tools: `tools/dump_header.py`, `tools/dump_subs.py`, `tools/to_big_endian.py`, `tools/run-ours.ts` (runs spc-parser on files).

---

## 25. Reference decoding algorithm (pseudocode)

```
parse(bytes):
  if bytes[1]==0x4D: return parseOld(bytes)
  le = bytes[1]==0x4B ; require bytes[1] in {0x4B,0x4C} and length>=512
  H = readSPCHDR(le)
  flags = bits(H.ftflgs); xyxy = TXYXYS && TXVALS (warn if TXYXYS && !TXVALS)
  nsub = TMULTI ? H.fnsub : 1 ; if nsub==0: nsub=1 (warn if TMULTI)
  labels = enumLabels(H.fxtype,H.fytype,H.fztype,H.fwtype); custom = splitNul(H.fcatxt)
  if TALABS || H.fztype==15: override non-empty custom labels (Z empty & ztype 15 ⇒ "Arbitrary Z")
  pos = 512 ; if TXVALS && !xyxy: X = f32[H.fnpts]@pos (check bounds); pos += 4*fnpts
  else if !xyxy: X = linspace(ffirst, flast, fnpts)
  offsets = xyxy && H.fnpts!=0 && dirValid ? dir[i].ssfposn : sequential
  for i in 0..nsub-1:
     S = SUBHDR@offset ; exp = TMULTI ? S.subexp : H.fexp ; if TMULTI && H.fexp==-128: exp=-128
     float = exp==-128 ; ySize = float?4:(TSPREC?2:4)
     n = xyxy ? S.subnpts : H.fnpts ; x_i = xyxy ? f32[n] : X
     y = float ? f32[n] : int(ySize)[n]·2^(exp-(ySize==2?16:32))   (bounds-checked)
  Z/W per §11-12 using sequential index; dates per §17; log per §14-15 (seek to flogoff, clamp, decode, parse)
```

---

## 26. Recommended output model for spc-parser (non-normative)

- File meta: every raw header field **and** its raw numeric codes (`fexper`, `fxtype`, `fytype`, `fztype`, `fwtype`, `fpost`, `fprocs`, `fmods`, `fdate`), decoded labels `{quantity, units}` for X/Y/Z/W (enumerated or custom), `flags` (named bits), `dataLayout` (`Y | XY | YY | XYY | XYXY`), `zSpacing` (`even | ordered | random`), `planes` (`fwplanes`, `planeSize`, `fwinc`), `modifications` (fmods letters), `invertedPeaks` (fytype ≥ 128), `drawAsSticks` (TXYXYS), `date` (ISO without `Z` unless known UTC, or `undefined`) + `dateLayout` (`spec | labspec | msdos`), `memo` (up to the first NUL) + optional `memoFragments`, `customLabels {x, y, z}` + `customLabelsApplied`, `directory` entries (when present), `warnings: string[]`.
- Per spectrum: `variables.x` / `variables.y` (as today), `meta` = subheader with its **raw** `subexp` plus `exponent` actually used and `isFloat`, `index` (sequential), `z`, `zEnd` (subnext), `w`, `plane`; optionally `title` (memo or `SUBFILEx` label) and `dataType`.
- Logs: `meta` (LOGSTC), `text` (decoded, NUL-truncated), `lines`, `entries: {key, value, section?}[]` (first `=` split, case-preserving key + lower-case lookup map), `history` (audit lines with fmods letter, date, program, user), `binary: Uint8Array`, `disk: Uint8Array`, `imaginary?: Float64Array` (NMR).
- Keep the file's X order (or record `isMonotonic`) — sorting is a presentation choice; share one X array between subfiles of a common-X file instead of copying it per spectrum.

---

## 27. Verification values (for regression tests)

| file (see §24 for location)             | expected with a spec-correct reader                             | spc-parser 2.1.1 today                              |
| --------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `m_evenz.spc` subfile 1                 | exponent 0 (raw subexp), max Y 0.4757522940635681, Z 0.5        | exponent −1, max 0.23787614703178406, startingZ 1.0 |
| `m_evenz.spc` Z of subfiles 0..3        | 0, 0.5, 1.0, 1.5 (fzinc 0.5)                                    | raw 0, 1.0, 1.5, 2.0                                |
| `CONTOUR.SPC` Z of subfiles 0..3        | 0, 2, 4, 6                                                      | raw 0, 1, 1, 1                                      |
| `4d_map.spc` subfile 24                 | plane 2, W 20, Z 20 (µm)                                        | only raw fields                                     |
| `labspec6-sample.spc` subfile 5         | plane 1, W −4016.37, Z 282.335, date 2020-05-18T10:20           | date '0120-04-18T10:20:00.000Z'                     |
| `CAthickyellow_try4_17_ZSCAN.spc` date  | 2016-02-19T16:43                                                | '1983-11-01T19:33:22.000Z'                          |
| `LabRam-2.spc` date                     | 2015-02-25T13:48                                                | '0115-01-25T13:48:00.000Z'                          |
| `m_ordz.spc` date / Z type              | 1992-05-14T20:19 / Minutes                                      | '0092-05-14T20:19:00.000Z' / none                   |
| `DOERNER.spc` date                      | 2013-05-24T10:32                                                | '0113-05-24T10:32:00.000Z'                          |
| `m_evenz.spc` date                      | none (invalid 0x00005000)                                       | '-000001-12-10T00:00:00.000Z'                       |
| `raman-caco3.spc` date / log            | 2026-08-17T13:24:20Z (UTC) / `Slit_opening=65µm`                | ok / `65ﾵm`                                         |
| `Ft-ir.spc` memo                        | `FT-IR Spectrum Example`                                        | `FT-IR Spectrum Exampletorials: polystyrene`        |
| `RAMAN.SPC` Y label                     | `Rmn Intensity`                                                 | `Arbitrary Intensity`                               |
| `KRY3.SPC` X / Y label                  | `Wavenumber (cm-1)` / `(arb)`                                   | `Arbitrary` / `Arbitrary Intensity`                 |
| `gamma.spc` X / Y / Z label             | `KeV` / `Counts` / `Arbitrary Z`                                | `Arbitrary` / `Arbitrary Intensity` / ``            |
| `xraydiff.spc` X / Y / Z label          | `deg (2theta)` / `a.u.` / `Arbitrary Z`                         | `Arbitrary` / `Counts`                              |
| `BARBITUATES.SPC` log                   | LOGSTC {logsizd 182, logtxto 64}, text starts ` \r\n[FILEINFO]` | {size 512, textOffset 1082187440}, ''               |
| `IG_BKGND.SPC`, `DRUG_SAMPLE_PEAKS.SPC` | parse OK with log                                               | throws DataView RangeError                          |
| `test_input.spc`                        | 1 spectrum, log clamped + warning                               | throws DataView RangeError                          |
| `m_xyxy.spc` directory entry 0          | ssfposn 42960, ssfsize 96 (relocated copy)                      | directory not read                                  |
| `NMR_FID.SPC`                           | imaginary Float32[16384] from log binary                        | binary as garbled string                            |
| `fixtures/synthetic/fnsub0.spc`         | 1 spectrum                                                      | 0 spectra                                           |
| `fixtures/synthetic/tsprec_float.spc`   | same data as raman-caco3.spc + warning                          | throws                                              |
| `fixtures/synthetic/spare_be.spc`       | fspare [1..8]                                                   | [8..1]                                              |
