# Changelog

### [0.1.1](https://www.github.com/cheminfo/spc-parser/compare/v0.1.0...v0.1.1) (2021-07-12)


### Bug Fixes

* add lactame build ([b76bb32](https://www.github.com/cheminfo/spc-parser/commit/b76bb32429bbca5b630971a98245d788b1aec87a))

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
