import { watch } from "node:fs";
import { root, ext, debounce } from "./utils.js";
import { sync } from "./prepare-dev.js";

const watched = new Set([".md", ".scss", ".json"]);
const ignored = [".build", "node_modules", ".git"];

const debouncedSync = debounce(sync, 5000);

watch(root, { recursive: true }, (_, file) => {
  if (!file || !watched.has(ext(file))) return;
  if (ignored.some((p) => file.startsWith(p))) return;
  debouncedSync();
});

console.log(`Watching ${root}...`);
