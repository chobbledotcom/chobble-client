import { resolve } from "node:path";
import { copyDir, fs } from "./utils.js";

const [templateDir, sourceDir, combinedDir] = process.argv.slice(2);

if (!templateDir || !sourceDir || !combinedDir) {
  console.error(
    "Usage: bun scripts/ci-merge.js <template> <source> <combined>",
  );
  process.exit(1);
}

const template = resolve(templateDir);
const source = resolve(sourceDir);
const combined = resolve(combinedDir);

console.log(`Copying template files to ${combined}...`);
fs.mkdir(combined);
copyDir(template, combined, {
  delete: true,
  exclude: [".git", "*.md", "images", "landing-pages/*.html"],
});

console.log(`Overlaying source files into ${combined}/src...`);
copyDir(source, resolve(combined, "src"), {
  exclude: [".*", "README.md", "package.json", "bun.lock"],
});

console.log("Merge complete.");
