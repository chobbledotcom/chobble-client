import { join } from "node:path";
import { fs, bun, path } from "./utils.js";
import { setupTemplate } from "./template-utils.js";

const USAGE = `
Usage: bun run screenshot [options] [page-paths...]

Take screenshots of your site pages.

Options:
  -v, --viewport <name>   Viewport to use: mobile, tablet, desktop, full-page (default: desktop)
  -a, --all-viewports     Capture all viewport variants for each page
  -o, --output <dir>      Output directory (default: ./screenshots)
  -t, --timeout <ms>      Navigation timeout in milliseconds (default: 10000)
  -h, --help              Show this help message

Examples:
  bun run screenshot                           # Screenshot homepage at desktop viewport
  bun run screenshot /about /contact           # Screenshot multiple pages
  bun run screenshot -a /                      # Screenshot homepage at all viewports
  bun run screenshot -v mobile /products       # Screenshot products page at mobile viewport
  bun run screenshot -o ./my-screenshots /     # Save to custom directory

Page paths should start with / (e.g., /, /about, /products/item-1)
`;

const buildSite = (tempDir) => {
  console.log("Building site...");
  const result = bun.run("build", tempDir);
  if (result.exitCode !== 0) {
    throw new Error("Failed to build site");
  }
  console.log("Build complete.");
};

const runScreenshots = async (tempDir, args) => {
  const siteDir = join(tempDir, "_site");

  // Determine output directory and ensure it exists
  let outputDir = path("screenshots");
  const outputIdx = args.findIndex(a => a === "-o" || a === "--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    const outputPath = args[outputIdx + 1];
    outputDir = outputPath.startsWith("/") ? outputPath : path(outputPath);
  }
  fs.mkdir(outputDir);

  // Build args for template's screenshot script
  const scriptArgs = ["-s", siteDir];

  // Pass through all args, but remap output to absolute path if relative
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      scriptArgs.push("-o", outputDir);
      i++; // Skip the value we already handled
    } else {
      scriptArgs.push(arg);
    }
    i++;
  }

  // Default output if not specified
  if (!args.includes("-o") && !args.includes("--output")) {
    scriptArgs.push("-o", outputDir);
  }

  // Default to homepage if no pages specified
  const hasPages = args.some(a => a.startsWith("/"));
  if (!hasPages) {
    scriptArgs.push("/");
  }

  console.log("Taking screenshots...");
  const proc = Bun.spawn(["bun", "scripts/screenshot.js", ...scriptArgs], {
    cwd: tempDir,
    stdio: ["inherit", "inherit", "inherit"],
  });

  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Screenshot process exited with code ${code}`);
  }
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    console.log(USAGE);
    return;
  }

  console.log("Setting up template environment...");
  const { tempDir, cleanup } = await setupTemplate();

  try {
    buildSite(tempDir);
    await runScreenshots(tempDir, args);
  } finally {
    cleanup();
  }

  console.log("Done!");
};

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
