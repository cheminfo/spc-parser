# Changelog

## [0.6.0](https://github.com/cheminfo/spc-parser/compare/v0.5.2...v0.6.0) (2022-09-24)


### ⚠ BREAKING CHANGES

* Split parsing (#27)

### Code Refactoring

* Split parsing ([#27](https://github.com/cheminfo/spc-parser/issues/27)) ([f4da7bd](https://github.com/cheminfo/spc-parser/commit/f4da7bde6fe14368536866d1dce6b30395064539))

### [0.5.2](https://www.github.com/cheminfo/spc-parser/compare/v0.5.1...v0.5.2) (2021-11-10)


### Bug Fixes

* parse 0x80 yFactor correctly ([4bfda58](https://www.github.com/cheminfo/spc-parser/commit/4bfda58eb54ecfa3335e3ff5dd29ed8d9e1b176f))

### [0.5.1](https://www.github.com/cheminfo/spc-parser/compare/v0.5.0...v0.5.1) (2021-08-12)


### Bug Fixes

* use mainHeader exponent if no subheader exp. ([02d5f40](https://www.github.com/cheminfo/spc-parser/commit/02d5f4040c990a2a4d88401ed5d08ba159740571))

## [0.5.0](https://www.github.com/cheminfo/spc-parser/compare/v0.4.0...v0.5.0) (2021-08-02)


### ⚠ BREAKING CHANGES

* return an object for variables

### Features

* return an object for variables ([66c1a43](https://www.github.com/cheminfo/spc-parser/commit/66c1a4327768e61b17a69776d91a28a97cc2e36a))

## [0.4.0](https://www.github.com/cheminfo/spc-parser/compare/v0.3.0...v0.4.0) (2021-08-02)


### ⚠ BREAKING CHANGES

* spectrum structure

### Bug Fixes

* change spectrum objects structure ([b859bdc](https://www.github.com/cheminfo/spc-parser/commit/b859bdc5bf35701744e867263e31280a13182005)), closes [#13](https://www.github.com/cheminfo/spc-parser/issues/13) [#15](https://www.github.com/cheminfo/spc-parser/issues/15) [#16](https://www.github.com/cheminfo/spc-parser/issues/16)

## [0.3.0](https://www.github.com/cheminfo/spc-parser/compare/v0.2.0...v0.3.0) (2021-08-01)


### ⚠ BREAKING CHANGES

* Parse use directly a buffer

### Features

* Parse use directly a buffer ([a4288a5](https://www.github.com/cheminfo/spc-parser/commit/a4288a55ba8faffe39a823a01b74efacc8d18464))

## [0.2.0](https://www.github.com/cheminfo/spc-parser/compare/v0.1.0...v0.2.0) (2021-07-16)


### Features

* Add support for experiment setting codes ([05269e1](https://www.github.com/cheminfo/spc-parser/commit/05269e1074063daad9d43120f3b4552f41f512a0))
* Add support for multifile old files reading ([e67af17](https://www.github.com/cheminfo/spc-parser/commit/e67af179d6b0e36fa09e9bdb56d6db1ab2481e7e))
* Added log block parsing ([fb57086](https://www.github.com/cheminfo/spc-parser/commit/fb570866e1912591371433e3ddccb7f3c8544259))
* Added subheader parsing and X axis generation, renamed some variables, switched back to bitwise operations ([81a2057](https://www.github.com/cheminfo/spc-parser/commit/81a205739cfcd5cf0e96577b56f7b1f35aec5a0f))
* Added support for oldest and newest versions ([4526163](https://www.github.com/cheminfo/spc-parser/commit/4526163c8c7f594b30e0afb8f0b3b841645bac87))
* Added type codes support ([db5b9c4](https://www.github.com/cheminfo/spc-parser/commit/db5b9c45617f40849b4801f043c7e5fbfd81e07f))
* Data reading is functional, needs further in-depth testing ([b3c9de2](https://www.github.com/cheminfo/spc-parser/commit/b3c9de2414f0f9593030b368ff26c2784b0fba96))
* index now features log block parsing ([fd898f5](https://www.github.com/cheminfo/spc-parser/commit/fd898f57c883faabad7998026a9b11bf6c2d291a))
* Index.js now returns something useful ([023fd43](https://www.github.com/cheminfo/spc-parser/commit/023fd43b290760a3289a2ae69ad11089548c9738))


### Bug Fixes

* add lactame build ([b76bb32](https://www.github.com/cheminfo/spc-parser/commit/b76bb32429bbca5b630971a98245d788b1aec87a))
* Added actual yTypes default case ([47df225](https://www.github.com/cheminfo/spc-parser/commit/47df225cdf772be90b593e85ad92a691844d9a09))
* Changed spectrum position, simplified code ([5f6d3b3](https://www.github.com/cheminfo/spc-parser/commit/5f6d3b32a6bb23394c387a253936d91f3e0eb211))
* Everything works now ([afd9edd](https://www.github.com/cheminfo/spc-parser/commit/afd9edd6df62838e88e13877b0ab7d66a7c2966a))
* Old file reading now works without a problem ([313b3a2](https://www.github.com/cheminfo/spc-parser/commit/313b3a225db2093a1bb6b81e12c40822800afba9))
* Removed residual Math.floor(), useless now ([a56caa4](https://www.github.com/cheminfo/spc-parser/commit/a56caa4eb915fed1d4ed137f1c9492de4f128dab))
* Removed useless comment ([7091762](https://www.github.com/cheminfo/spc-parser/commit/7091762b485ccb30ec3940f294664bcfef0385f4))
* Simplified xPoints while making it compatible with negative bounds ([6296b0b](https://www.github.com/cheminfo/spc-parser/commit/6296b0ba86fe2e7eacd47967bd89c984aaaa1834))
* Use typed array instead of list ([b6ca244](https://www.github.com/cheminfo/spc-parser/commit/b6ca2445601ddc4e118d5e3d09d09eecdce492c6))
* Y values reading tested and working, X values different from txt but exactly match hexdump ([3024cc3](https://www.github.com/cheminfo/spc-parser/commit/3024cc35f2b66f18278d720ab4c69d9936df9821))

## 0.1.0 (2021-07-12)


### Features

* Added main header parsing (yet to be tested) ([08a87ea](https://www.github.com/cheminfo/spc-parser/commit/08a87ea43920d8c6f7e247bc2935366c5ffc164d))
* longToDate now outputs an ISO8601:2019-formatted date string, renamed test ([2b9bc83](https://www.github.com/cheminfo/spc-parser/commit/2b9bc83e2253a0ececc1e8c7adff451ef04a7e39))


### Bug Fixes

* Changed bitwise AND with floored modulo ([ac01eae](https://www.github.com/cheminfo/spc-parser/commit/ac01eae3a97e3d52b1882d090eef955d006aa732))
* Changed date parsing to Big Endian instead of Little Endian, added official test files ([804cb1f](https://www.github.com/cheminfo/spc-parser/commit/804cb1ffcf4c97e7e234e1474a9a4399ff7693fe))
* Date parsing is now actually functional, added test cases to mainHeader parsing ([13df566](https://www.github.com/cheminfo/spc-parser/commit/13df5660dcb7be4ca962c4104d97c2168356f8cb))
* Fixed utility bitwise AND operation, added tests for mainHeader, fixed Date class negative years handling ([3eb9e4c](https://www.github.com/cheminfo/spc-parser/commit/3eb9e4c0715bb3ab9ea2b5ab9f5584cf542183ef))
* Used Math.pow instead of >> for bitwise shifting ([1057236](https://www.github.com/cheminfo/spc-parser/commit/10572360cc9e85e0d716de8c63661cb7bc9d1aca))
