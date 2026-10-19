# Notices for third-party test data

`spc-parser` itself is MIT licensed (see `LICENSE`) and the published npm package
contains only its own sources: the files below are test fixtures, excluded from
the package by `src/.npmignore`. They are kept in the repository so that the
behaviour of real instruments stays covered by the test suite.

Every fixture is a spectrum or a header recorded by an instrument. Each one is
listed with its URL, licence, attribution and SHA-256 in the `PROVENANCE.md` of
its folder, and `src/__tests__/fixtures.test.ts` verifies those hashes:

- `src/galactic/__tests__/data/corpus/PROVENANCE.md`
- `src/uvProbe/__tests__/data/corpus/PROVENANCE.md`
- `src/__tests__/data/PROVENANCE.md`

## Attribution by source

| Fixtures | Licence                    | Attribution                                                                                                            |
| -------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 14       | MIT                        | `r-hyperspec/hySpc.read.spc` contributors; SPCSpectra.jl contributors                                                  |
| 5        | MIT, from a GPL-3.0 origin | SPCSpectra.jl contributors (files originally from `rohanisaac/spc`, GPL-3.0)                                           |
| 3        | GPL-3.0                    | `stonerlab/Stoner-PythonCode` contributors; `OEUM/PySpectra` contributors; CSIRO, `csiro/soilspec.format` contributors |
| 2        | LGPL-3.0                   | `KarritPrimorph/Eleana` contributors                                                                                   |
| 1        | NIST public-domain notice  | National Institute of Standards and Technology, `usnistgov/NexusLIMS`                                                  |

### CC-BY-4.0 fixtures

Attribution is a condition of this licence, so each record is named in full:

- Zenodo record 16108826 (doi:10.5281/zenodo.16108826), "Identifying
  Archaeological Bone and Antler and Methods to Soften Them Using FTIR
  Spectroscopy", file `sample 41 (30).SPC`
- Zenodo record 19470487 (doi:10.5281/zenodo.19470487), file
  `OR50_BKG_23072024.Spc`
- Zenodo record 22745748 (doi:10.5281/zenodo.22745748)
- Zenodo record 7433815 (doi:10.5281/zenodo.7433815), file
  `20220216_DMTTF_NO2_20K_0p2G_15dB_60d.spc`
- figshare article 30231052, "Recycling of Polyolefins Using Recycled PVC under
  Sunlight", file `UV-Vis-NIR_dPVC.spc`

If you hold rights in any of these files and want one removed, open an issue and
it will be taken out together with the test that reads it.
