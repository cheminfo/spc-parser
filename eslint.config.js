import { defineConfig, globalIgnores } from 'eslint/config';
import cheminfo from 'eslint-config-cheminfo-typescript';

export default defineConfig(
  globalIgnores(['coverage', 'dist', 'lib']),
  cheminfo,
  {
    // A flat config is a declarative call by design, which is what
    // `unicorn/no-top-level-side-effects` is written to catch in a module that
    // runs work on import. The rule flags the shape the cheminfo generator
    // itself ships, so it is turned off here and nowhere else.
    files: ['eslint.config.js'],
    rules: { 'unicorn/no-top-level-side-effects': 'off' },
  },
);
