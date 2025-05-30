import { existsSync } from 'fs';
import { resolve } from 'path';
import { expect } from '@jest/globals';
import { oneLine, stripIndent } from 'common-tags';
import { diff } from 'jest-diff';

declare global {
  namespace jest {
    interface Matchers<R> {
      /**
       * Normalizes whitespace and performs string comparisons
       */
      toBeSimilarStringTo(expected: string): R;
    }
  }
}

function compareStrings(a: string, b: string): boolean {
  return a.includes(b);
}

/** Ignore whitespace, trailing commas, and leading pipes */
function similarize(str: string): string {
  return (
    oneLine`${str}`
      // Trim trailing commas
      .replace(/\s*,(\s*[)}])/g, '$1')
      // Remove leading pipes
      .replace(/([<:,=(])\s*(?:\|\s*)?/g, '$1')
      // Remove spaces around brackets and semicolons
      .replace(/\s*([[\](){}<>;])\s*/g, '$1')
      // Replace multiple spaces with a single space
      .replace(/\s\s+/g, ' ')
  );
}

expect.extend({
  toBeSimilarStringTo(received: string, expected: string) {
    const strippedReceived = similarize(received);
    const strippedExpected = similarize(expected);

    if (compareStrings(strippedReceived, strippedExpected)) {
      return {
        message: () =>
          `expected
   ${received}
   not to be a string containing (ignoring indents)
   ${expected}`,
        pass: true,
      };
    }
    const diffString = diff(stripIndent`${expected}`, stripIndent`${received}`, {
      expand: this.expand,
    });
    const hasExpect = diffString?.includes('- Expect');

    const message = hasExpect
      ? `Difference:\n\n${diffString}`
      : `expected
      ${received}
      to be a string containing (ignoring indents)
      ${expected}`;

    return {
      message: () => message,
      pass: false,
    };
  },
});

function findProjectDir(dirname: string): string | never {
  const originalDirname = dirname;
  const cwd = process.cwd();
  const stopDir = resolve(cwd, '..');

  while (dirname !== stopDir) {
    try {
      if (existsSync(resolve(dirname, 'package.json'))) {
        return dirname;
      }

      dirname = resolve(dirname, '..');
    } catch {
      // ignore
    }
  }

  throw new Error(`Coudn't find project's root from: ${originalDirname}`);
}

export function useMonorepo({ dirname }: { dirname: string }) {
  const cwd = findProjectDir(dirname);

  return {
    correctCWD() {
      let spyProcessCwd: jest.SpyInstance;
      beforeEach(() => {
        spyProcessCwd = jest.spyOn(process, 'cwd').mockReturnValue(cwd);
      });
      afterEach(() => {
        spyProcessCwd.mockRestore();
      });
    },
  };
}

export * from './mock-graphql-server.js';
export * from './resolvers-common.js';
export * from './typescript.js';
