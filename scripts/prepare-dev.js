import { join } from "node:path";
import {
  buildDir,
  sourceExcludes,
  templateExcludes,
  templateRepo,
} from "./consts.js";
import {
  bun,
  copyDir,
  find,
  fs,
  git,
  mergeTemplateAndSource,
  path,
  root,
} from "./utils.js";

const build = path(buildDir);
const template = path(buildDir, "template");
const dev = path(buildDir, "dev");

// Prefer an already-checked-out template so local builds work offline and
// skip a redundant network clone: a sibling clone (../chobble-template) or
// the in-repo chobble-template submodule.
const localTemplates = [
  join(root, "..", "chobble-template"),
  path("chobble-template"),
];

const resolveLocalTemplate = () => {
  for (const dir of localTemplates) {
    if (fs.exists(join(dir, ".eleventy.js"))) return dir;
  }
  return null;
};

export const prep = () => {
  console.log("Preparing build...");
  fs.mkdir(build);

  const localTemplate = resolveLocalTemplate();
  if (localTemplate) {
    console.log(`Using local template from ${localTemplate}...`);
    copyDir(localTemplate, template, {
      delete: true,
      exclude: templateExcludes,
    });
  } else if (!fs.exists(join(template, ".git"))) {
    console.log("Cloning template...");
    fs.rm(template);
    git.clone(templateRepo, template);
  } else {
    console.log("Updating template...");
    git.reset(template, { hard: true });
    git.pull(template);
  }

  find.deleteByExt(dev, ".md");
  mergeTemplateAndSource(template, root, dev, {
    delete: true,
    templateExcludes,
    sourceExcludes,
  });

  sync();

  if (!fs.exists(join(dev, "node_modules"))) {
    console.log("Installing dependencies...");
    bun.install(dev);
  }

  fs.rm(join(dev, "_site"));
  console.log("Build ready.");
};

export const sync = () => {
  copyDir(root, join(dev, "src"), {
    update: true,
    exclude: sourceExcludes,
  });
};

if (import.meta.main) prep();
