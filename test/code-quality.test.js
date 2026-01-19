/**
 * Code quality tests for scripts/
 * Uses @chobble/js-toolkit scanner utilities.
 */
import { describe, test } from "bun:test";
import { Glob } from "bun";
import {
  createCodeChecker,
  assertNoViolations,
} from "@chobble/js-toolkit/code-quality/scanner";

const ROOT_DIR = process.cwd();
const THIS_FILE = "test/code-quality.test.js";

// Get all JS files in scripts/
const getScriptFiles = () =>
  [...new Glob("scripts/**/*.js").scanSync(ROOT_DIR)];

// Get test files excluding this file
const getTestFiles = () =>
  [...new Glob("test/**/*.js").scanSync(ROOT_DIR)].filter(
    (f) => f !== THIS_FILE,
  );

describe("code quality", () => {
  test("no TODO comments without ticket references", () => {
    const checker = createCodeChecker({
      patterns: [/\bTODO\b(?!.*#\d+)/i],
      files: getScriptFiles,
      rootDir: ROOT_DIR,
    });

    const { violations } = checker.analyze();
    assertNoViolations(violations, {
      singular: "TODO without ticket reference",
      fixHint: "Add a ticket reference like TODO(#123) or remove the TODO",
    });
  });

  test("no debugger statements", () => {
    const checker = createCodeChecker({
      patterns: [/\bdebugger\b/],
      files: getScriptFiles,
      rootDir: ROOT_DIR,
    });

    const { violations } = checker.analyze();
    assertNoViolations(violations, {
      singular: "debugger statement",
      fixHint: "Remove debugger statements before committing",
    });
  });

  test("no focused or skipped tests", () => {
    const checker = createCodeChecker({
      // Match .only( or .skip( at start of statement (not in strings)
      patterns: [/^\s*(?:describe|test|it)\.(?:only|skip)\s*\(/],
      files: getTestFiles,
      rootDir: ROOT_DIR,
    });

    const { violations } = checker.analyze();
    assertNoViolations(violations, {
      singular: "focused/skipped test",
      fixHint: "Remove .only() or .skip() before committing",
    });
  });
});
