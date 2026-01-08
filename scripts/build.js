import { rmSync, renameSync } from "node:fs";
import { join } from "node:path";
import { path, run } from "./utils.js";
import { prep } from "./prepare-dev.js";

const dev = path(".build", "dev");
const output = path("_site");

prep();

console.log("Building site...");

rmSync(output, { recursive: true, force: true });
run(["bun", "run", "build"], { cwd: dev });
renameSync(join(dev, "_site"), output);

console.log("Built to _site/");
