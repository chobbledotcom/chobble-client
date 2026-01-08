import { watch } from "node:fs";
import { resolve, extname } from "node:path";

import { sync } from "./prepare-dev.js";

const root = resolve(import.meta.dir, "..");

// Use Set for O(1) extension lookup
const watchedExtensions = new Set([".md", ".scss", ".json"]);
const ignoredPrefixes = [".build", "node_modules", ".git"];

// Debounce to prevent multiple rapid syncs
let debounceTimer = null;
const DEBOUNCE_MS = 100;

function debouncedSync() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    sync();
  }, DEBOUNCE_MS);
}

watch(root, { recursive: true }, (_event, file) => {
  if (!file) return;

  // Use extname for cleaner extension check
  const ext = extname(file);
  if (!watchedExtensions.has(ext)) return;

  // Check if file is in ignored directory
  const isIgnored = ignoredPrefixes.some((prefix) => file.startsWith(prefix));
  if (isIgnored) return;

  debouncedSync();
});

console.log(`Watching for changes in ${root}...`);
