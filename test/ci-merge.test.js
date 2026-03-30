import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { copyDir, fs } from "../scripts/utils.js";

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

describe("copyDir rsync parity", () => {
  describe("basic recursive copy", () => {
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
  });

  describe("--exclude with simple name patterns (no /)", () => {
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

    test("excludes glob *.md at any depth", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "README.md"));
      touch(join(src, "CHANGELOG.md"));
      touch(join(src, "sub/notes.md"));
      touch(join(src, "keep.txt"));
      touch(join(src, "sub/keep.js"));

      copyDir(src, dest, { exclude: ["*.md"] });

      expect(tree(dest)).toEqual(["keep.txt", "sub/keep.js"]);
    });

    test("excludes .* (hidden files/dirs) at any depth", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, ".git/config"));
      touch(join(src, ".env"));
      touch(join(src, ".github/workflows/ci.yml"));
      touch(join(src, "sub/.hidden"));
      touch(join(src, "keep.txt"));

      copyDir(src, dest, { exclude: [".*"] });

      expect(tree(dest)).toEqual(["keep.txt"]);
    });
  });

  describe("--exclude with path patterns (contains /)", () => {
    test("landing-pages/*.html excludes html in landing-pages only", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "landing-pages/page1.html"));
      touch(join(src, "landing-pages/page2.html"));
      touch(join(src, "landing-pages/data.json"));
      touch(join(src, "landing-pages/sub/nested.html"));
      touch(join(src, "other/page.html"));
      touch(join(src, "root.html"));

      copyDir(src, dest, { exclude: ["landing-pages/*.html"] });

      expect(tree(dest)).toEqual([
        "landing-pages/data.json",
        "landing-pages/sub/nested.html",
        "other/page.html",
        "root.html",
      ]);
    });
  });

  describe("--delete flag", () => {
    test("removes dest files not in source", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "new.txt"));
      touch(join(dest, "old.txt"));
      touch(join(dest, "stale/deep.txt"));

      copyDir(src, dest, { delete: true });

      expect(tree(dest)).toEqual(["new.txt"]);
    });

    test("delete respects excludes (does not delete excluded files)", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(src, "keep.txt"));
      touch(join(dest, ".git/config"));
      touch(join(dest, "old.txt"));

      copyDir(src, dest, { delete: true, exclude: [".git"] });

      expect(tree(dest)).toEqual([".git/config", "keep.txt"]);
    });
  });

  describe("--update flag", () => {
    test("only copies newer files", async () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");
      touch(join(dest, "existing.txt"), "old content");

      // Wait to ensure mtime difference
      await Bun.sleep(50);
      touch(join(src, "existing.txt"), "new content");
      touch(join(src, "brand-new.txt"), "new file");

      copyDir(src, dest, { update: true });

      expect(readFileSync(join(dest, "existing.txt"), "utf8")).toBe(
        "new content",
      );
      expect(tree(dest)).toEqual(["brand-new.txt", "existing.txt"]);
    });
  });

  describe("CI merge scenario 1: template -> combined", () => {
    test("replicates rsync --recursive --delete with CI excludes", () => {
      const template = join(tmp, "template");
      const combined = join(tmp, "combined");

      // Template structure
      touch(join(template, ".git/HEAD"));
      touch(join(template, "README.md"));
      touch(join(template, "CONTRIBUTING.md"));
      touch(join(template, ".eleventy.js"), "module.exports = {}");
      touch(join(template, "package.json"), "{}");
      touch(join(template, "src/components/nav.njk"), "<nav>");
      touch(join(template, "src/layouts/base.njk"), "<html>");
      touch(join(template, "images/logo.png"), "png");
      touch(join(template, "landing-pages/promo.html"), "<promo>");
      touch(join(template, "landing-pages/data.json"), "{}");
      touch(join(template, "scripts/build.js"), "build");
      touch(join(template, "src/deep/notes.md"), "# notes");

      // Stale file in combined that should be deleted
      touch(join(combined, "old-file.txt"), "stale");

      copyDir(template, combined, {
        delete: true,
        exclude: [".git", "*.md", "images", "landing-pages/*.html"],
      });

      const files = tree(combined);

      // Should include
      expect(files).toContain(".eleventy.js");
      expect(files).toContain("package.json");
      expect(files).toContain("src/components/nav.njk");
      expect(files).toContain("src/layouts/base.njk");
      expect(files).toContain("scripts/build.js");
      expect(files).toContain("landing-pages/data.json");

      // Should exclude
      expect(files).not.toContain(".git/HEAD");
      expect(files).not.toContain("README.md");
      expect(files).not.toContain("CONTRIBUTING.md");
      expect(files).not.toContain("src/deep/notes.md");
      expect(files).not.toContain("images/logo.png");
      expect(files).not.toContain("landing-pages/promo.html");

      // Should delete stale file
      expect(files).not.toContain("old-file.txt");
    });
  });

  describe("CI merge scenario 2: source -> combined/src", () => {
    test("replicates rsync --recursive with CI excludes", () => {
      const source = join(tmp, "source");
      const dest = join(tmp, "combined", "src");

      // Source structure (the client repo)
      touch(join(source, ".git/HEAD"));
      touch(join(source, ".github/workflows/build.yml"), "ci");
      touch(join(source, ".gitignore"), "node_modules");
      touch(join(source, "README.md"), "# readme");
      touch(join(source, "package.json"), "{}");
      touch(join(source, "bun.lock"), "lock");
      touch(join(source, "pages/index.md"), "# Home");
      touch(join(source, "pages/about.md"), "# About");
      touch(join(source, "_data/config.json"), '{"site": "test"}');
      touch(join(source, "css/custom.css"), "body {}");
      touch(join(source, "images/hero.jpg"), "jpg");

      copyDir(source, dest, {
        exclude: [".*", "README.md", "package.json", "bun.lock"],
      });

      const files = tree(dest);

      // Should include content files
      expect(files).toContain("pages/index.md");
      expect(files).toContain("pages/about.md");
      expect(files).toContain("_data/config.json");
      expect(files).toContain("css/custom.css");
      expect(files).toContain("images/hero.jpg");

      // Should exclude
      expect(files).not.toContain(".git/HEAD");
      expect(files).not.toContain(".github/workflows/build.yml");
      expect(files).not.toContain(".gitignore");
      expect(files).not.toContain("README.md");
      expect(files).not.toContain("package.json");
      expect(files).not.toContain("bun.lock");
    });
  });

  describe("multiple excludes combined", () => {
    test("all exclude patterns work together", () => {
      const src = join(tmp, "src");
      const dest = join(tmp, "dest");

      touch(join(src, ".git/config"));
      touch(join(src, "README.md"));
      touch(join(src, "CHANGELOG.md"));
      touch(join(src, "images/photo.jpg"));
      touch(join(src, "landing-pages/sale.html"));
      touch(join(src, "landing-pages/config.yaml"));
      touch(join(src, "src/app.js"));
      touch(join(src, "package.json"));

      copyDir(src, dest, {
        exclude: [".git", "*.md", "images", "landing-pages/*.html"],
      });

      expect(tree(dest)).toEqual([
        "landing-pages/config.yaml",
        "package.json",
        "src/app.js",
      ]);
    });
  });
});
