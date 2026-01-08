import { path, spawn } from "./utils.js";
import { prep } from "./prepare-dev.js";

const dev = path(".build", "dev");

prep();

console.log("Starting server...");

const watchProc = spawn(["bun", path("scripts", "watch.js")]);
const eleventyProc = spawn(["bun", "run", "serve"], { cwd: dev, shell: true });

process.on("SIGINT", () => {
  console.log("\nStopping...");
  watchProc.kill();
  eleventyProc.kill();
  process.exit();
});
