import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { copyDir } from "../scripts/utils.js";

const tmp = join(import.meta.dir, "..", ".test-tmp");

const touch = (filePath, content = filePath) => {
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, content);
};

const tree = (dir) => {
  const results = [];
  const walk = (d, rel = "") => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(join(d, entry.name), entryRel);
      else results.push(entryRel);
    }
  };
  walk(dir);
  return results.sort();
};

beforeEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("copyDir", () => {
  test("copies all files recursively", () => {
    const src = join(tmp, "src");
    const dest = join(tmp, "dest");
    touch(join(src, "a.txt"));
    touch(join(src, "sub/b.txt"));
    touch(join(src, "sub/deep/c.txt"));

    copyDir(src, dest);

    expect(tree(dest)).toEqual(["a.txt", "sub/b.txt", "sub/deep/c.txt"]);
  });

  test("preserves file content", () => {
    const src = join(tmp, "src");
    const dest = join(tmp, "dest");
    touch(join(src, "hello.txt"), "hello world");

    copyDir(src, dest);

    expect(readFileSync(join(dest, "hello.txt"), "utf8")).toBe("hello world");
  });

  describe("exclude option", () => {
    test("excludes exact filenames at any depth", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "README.md"));
      touch(join(src, "keep.txt"));
      touch(join(src, "sub/README.md"));
      touch(join(src, "sub/keep.txt"));

      copyDir(src, dest, { exclude: ["README.md"] });

      expect(tree(dest)).toEqual(["keep.txt", "sub/keep.txt"]);
    });

    test("excludes directories by name at any depth", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, ".git/config"));
      touch(join(src, "sub/.git/config"));
      touch(join(src, "keep.txt"));

      copyDir(src, dest, { exclude: [".git"] });

      expect(tree(dest)).toEqual(["keep.txt"]);
    });

    test("*.md excludes all markdown files at any depth", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "README.md"));
      touch(join(src, "sub/notes.md"));
      touch(join(src, "keep.txt"));

      copyDir(src, dest, { exclude: ["*.md"] });

      expect(tree(dest)).toEqual(["keep.txt"]);
    });

    test(".* excludes all hidden files and directories", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, ".git/config"));
      touch(join(src, ".env"));
      touch(join(src, ".github/workflows/ci.yml"));
      touch(join(src, "keep.txt"));

      copyDir(src, dest, { exclude: [".*"] });

      expect(tree(dest)).toEqual(["keep.txt"]);
    });

    test("path pattern only matches within that directory", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "landing-pages/page.html"));
      touch(join(src, "landing-pages/data.json"));
      touch(join(src, "landing-pages/sub/nested.html"));
      touch(join(src, "other/page.html"));

      copyDir(src, dest, { exclude: ["landing-pages/*.html"] });

      expect(tree(dest)).toEqual([
        "landing-pages/data.json",
        "landing-pages/sub/nested.html",
        "other/page.html",
      ]);
    });

    test("multiple exclude patterns apply together", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, ".git/config"));
      touch(join(src, "README.md"));
      touch(join(src, "images/photo.jpg"));
      touch(join(src, "landing-pages/sale.html"));
      touch(join(src, "landing-pages/config.yaml"));
      touch(join(src, "src/app.js"));

      copyDir(src, dest, {
        exclude: [".git", "*.md", "images", "landing-pages/*.html"],
      });

      expect(tree(dest)).toEqual([
        "landing-pages/config.yaml",
        "src/app.js",
      ]);
    });
  });

  describe("delete option", () => {
    test("removes dest files not present in source", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "new.txt"));
      touch(join(dest, "old.txt"));
      touch(join(dest, "stale/deep.txt"));

      copyDir(src, dest, { delete: true });

      expect(tree(dest)).toEqual(["new.txt"]);
    });

    test("preserves excluded files in dest during deletion", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "keep.txt"));
      touch(join(dest, ".git/config"));
      touch(join(dest, "old.txt"));

      copyDir(src, dest, { delete: true, exclude: [".git"] });

      expect(tree(dest)).toEqual([".git/config", "keep.txt"]);
    });
  });

  describe("update option", () => {
    test("overwrites older dest files but skips newer ones", async () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(dest, "existing.txt"), "old content");

      await Bun.sleep(50);
      touch(join(src, "existing.txt"), "new content");

      copyDir(src, dest, { update: true });

      expect(readFileSync(join(dest, "existing.txt"), "utf8")).toBe(
        "new content",
      );
    });
  });
});
