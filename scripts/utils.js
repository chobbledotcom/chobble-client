import { resolve, join, extname } from "node:path";

// Paths
export const root = resolve(import.meta.dir, "..");
export const path = (...segments) => join(root, ...segments);

// File operations using Bun APIs
export const file = (p) => Bun.file(p);
export const exists = (p) => file(p).exists();
export const read = (p) => file(p).text();
export const readJson = async (p) => JSON.parse(await read(p));
export const write = Bun.write;

// Shell commands
export const run = (cmd, opts = {}) =>
  Bun.spawnSync(cmd, { stdio: ["inherit", "inherit", "inherit"], ...opts });

export const shell = (cmd, opts = {}) =>
  run(["sh", "-c", cmd], opts);

export const spawn = (cmd, opts = {}) =>
  Bun.spawn(cmd, { stdio: ["inherit", "inherit", "inherit"], ...opts });

// Utilities
export const ext = extname;

export const debounce = (fn, ms) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

export const loadEnv = async (p = path(".env")) => {
  if (!(await exists(p))) return;
  (await read(p)).split("\n").forEach((line) => {
    const [key, ...val] = line.split("=");
    if (key && val.length && !process.env[key]) {
      process.env[key] = val.join("=").trim();
    }
  });
};
