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

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  "full-page": { width: 1280, height: 4000 },
};

const parseArgs = (args) => {
  const opts = {
    pages: [],
    viewport: "desktop",
    allViewports: false,
    output: path("screenshots"),
    timeout: 10000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "-v":
      case "--viewport":
        opts.viewport = args[++i];
        break;
      case "-a":
      case "--all-viewports":
        opts.allViewports = true;
        break;
      case "-o":
      case "--output":
        opts.output = args[++i];
        break;
      case "-t":
      case "--timeout":
        opts.timeout = parseInt(args[++i], 10);
        break;
      case "-h":
      case "--help":
        console.log(USAGE);
        process.exit(0);
      default:
        if (arg.startsWith("-")) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        opts.pages.push(arg);
    }
  }

  if (opts.pages.length === 0) {
    opts.pages.push("/");
  }

  return opts;
};

const buildSite = (tempDir) => {
  console.log("Building site...");
  const result = bun.run("build", tempDir);
  if (result.exitCode !== 0) {
    throw new Error("Failed to build site");
  }
  console.log("Build complete.");
};

const startServer = (siteDir, port = 8080) => {
  console.log(`Starting server for ${siteDir} on port ${port}...`);
  const proc = Bun.spawn(["bun", "-e", `Bun.serve({port:${port},fetch(req){const url=new URL(req.url);let p=url.pathname;if(p.endsWith('/'))p+='index.html';return new Response(Bun.file('${siteDir}'+p))}})`], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  return proc;
};

const waitForServer = async (url, maxAttempts = 20) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(250);
  }
  return false;
};

const sanitizePagePath = (pagePath) =>
  pagePath === "/" ? "index" : pagePath.replace(/^\/|\/$/g, "").replace(/\//g, "-");

const takeScreenshots = async (tempDir, opts) => {
  const { pages, viewport, allViewports, output, timeout } = opts;
  const siteDir = join(tempDir, "_site");
  const port = 8765;
  const baseUrl = `http://localhost:${port}`;

  fs.mkdir(output);

  const server = startServer(siteDir, port);

  try {
    const serverReady = await waitForServer(baseUrl);
    if (!serverReady) {
      throw new Error("Server failed to start");
    }
    console.log(`Server running at ${baseUrl}`);

    const { chromium } = await import("playwright");

    const viewportsToCapture = allViewports
      ? Object.keys(VIEWPORTS)
      : [viewport];

    let count = 0;

    for (const pagePath of pages) {
      for (const vp of viewportsToCapture) {
        const { width, height } = VIEWPORTS[vp];
        const url = `${baseUrl}${pagePath}`;
        const filename = `${sanitizePagePath(pagePath)}-${vp}.png`;
        const outputPath = join(output, filename);

        console.log(`Taking screenshot of ${url} (${vp})...`);

        let browser;
        try {
          browser = await chromium.launch({
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"],
          });
          const page = await browser.newPage({ viewport: { width, height } });

          await page.goto(url, { waitUntil: "load", timeout });
          await page.screenshot({ path: outputPath, fullPage: vp === "full-page" });

          console.log(`  ✓ Saved ${filename}`);
          count++;
        } catch (err) {
          console.error(`  ✗ Failed to capture ${pagePath} (${vp}): ${err.message}`);
        } finally {
          if (browser) await browser.close();
        }
      }
    }

    console.log(`\nSaved ${count} screenshot(s) to ${output}`);
  } finally {
    server.kill();
  }
};

const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes("-h") || args.includes("--help")) {
    console.log(USAGE);
    return;
  }

  const opts = parseArgs(args);

  console.log("Setting up template environment...");
  const { tempDir, cleanup } = await setupTemplate();

  try {
    buildSite(tempDir);
    await takeScreenshots(tempDir, opts);
  } finally {
    cleanup();
  }

  console.log("Done!");
};

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
