import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { root, path, run, shell, exists } from "./utils.js";
import { buildDir, templateRepo } from "./consts.js";

const build = path(buildDir);
const template = path(buildDir, "template");
const dev = path(buildDir, "dev");

const templateExcludes = [".git", "node_modules", "*.md", "test", "test-*"];
const rootExcludes = [
  ".git", "*.nix", "README.md", buildDir, "scripts",
  "node_modules", "package*.json", "bun.lock", "old_site",
];

const excludeArgs = (list) => list.map((e) => `--exclude="${e}"`).join(" ");

export const prep = () => {
  console.log("Preparing build...");
  mkdirSync(build, { recursive: true });

  const gitDir = join(template, ".git");
  if (!existsSync(gitDir)) {
    console.log("Cloning template...");
    rmSync(template, { recursive: true, force: true });
    run(["git", "clone", "--depth", "1", templateRepo, template]);
  } else {
    console.log("Updating template...");
    run(["git", "-C", template, "reset", "--hard"]);
    run(["git", "-C", template, "pull"]);
  }

  shell(`find "${dev}" -type f -name "*.md" -delete 2>/dev/null || true`);
  shell(`rsync -r --delete ${excludeArgs(templateExcludes)} "${template}/" "${dev}/"`);
  shell(`rsync -r ${excludeArgs(rootExcludes)} "${root}/" "${dev}/src/"`);

  sync();

  const nodeModules = join(dev, "node_modules");
  const bunTag = join(dev, "node_modules", ".bun-tag");

  if (!existsSync(nodeModules) || !existsSync(bunTag)) {
    console.log("Installing dependencies...");
    run(["bun", "install"], { cwd: dev });
  }

  rmSync(join(dev, "_site"), { recursive: true, force: true });
  console.log("Build ready.");
};

export const sync = () => {
  const excludes = excludeArgs(rootExcludes);
  shell([
    `rsync -ru ${excludes}`,
    '--include="*/"',
    '--include="**/*.md"',
    '--include="**/*.scss"',
    '--exclude="*"',
    `"${root}/"`,
    `"${dev}/src/"`,
  ].join(" "));
};

if (import.meta.main) prep();
