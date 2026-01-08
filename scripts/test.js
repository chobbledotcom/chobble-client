import { rmSync, cpSync, existsSync } from "node:fs";
import { path, run } from "./utils.js";
import { prep } from "./prepare-dev.js";

const template = path(".build", "template");
const dev = path(".build", "dev");
const templateTest = path(".build", "template", "test");
const devTest = path(".build", "dev", "test");

prep();

if (existsSync(templateTest)) {
  console.log("Copying test directory...");
  rmSync(devTest, { recursive: true, force: true });
  cpSync(templateTest, devTest, { recursive: true });
}

console.log("Running tests...");
run(["bun", "test"], { cwd: dev });
