import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { path, run, spawn, read, exists } from "./utils.js";

const TEMPLATE_REPO = "https://github.com/chobbledotcom/chobble-template.git";
const TEMPLATE_RAW_URL =
  "https://raw.githubusercontent.com/chobbledotcom/chobble-template/refs/heads/main/.pages.yml";

const fetchPages = async () => {
  console.log("Fetching .pages.yml from chobble-template...");

  const res = await fetch(TEMPLATE_RAW_URL);
  if (!res.ok) throw new Error(`Failed to fetch .pages.yml: ${res.status}`);

  const content = (await res.text()).replace(/src\//g, "");
  writeFileSync(".pages.yml", content);
  console.log("Updated .pages.yml from chobble-template (with src/ removed)");
};

const customisePages = async () => {
  const tempDir = mkdtempSync(join(tmpdir(), "chobble-template-"));

  console.log("Cloning chobble-template...");
  const clone = run(["git", "clone", "--depth", "1", TEMPLATE_REPO, tempDir]);
  if (clone.exitCode !== 0) throw new Error("Failed to clone chobble-template");

  console.log("Installing dependencies...");
  const install = run(["bun", "install"], { cwd: tempDir });
  if (install.exitCode !== 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error("Failed to install dependencies");
  }

  console.log("\nStarting CMS customisation TUI...\n");

  const proc = spawn(["bun", "run", "customise-cms"], { cwd: tempDir });
  const code = await proc.exited;

  if (code !== 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`customise-cms exited with code ${code}`);
  }

  const pagesPath = join(tempDir, "src", ".pages.yml");
  if (!(await exists(pagesPath))) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error("No .pages.yml found after customisation");
  }

  const content = (await read(pagesPath)).replace(/src\//g, "");
  writeFileSync(".pages.yml", content);

  console.log("\nCleaning up...");
  rmSync(tempDir, { recursive: true, force: true });
  console.log("Updated .pages.yml with your customisations (with src/ removed)");
};

const updatePages = async ({ customise = false } = {}) =>
  customise ? customisePages() : fetchPages();

if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: bun run update-pages [options]

Options:
  --customise, -c  Run the interactive CMS customisation TUI
  --help, -h       Show this help message

Without options, fetches the latest .pages.yml from chobble-template.
With --customise, clones chobble-template and runs the customise-cms TUI
to let you select which collections to include.`);
    process.exit(0);
  }

  const customise = args.includes("--customise") || args.includes("-c");

  updatePages({ customise }).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

export { updatePages, fetchPages, customisePages };
