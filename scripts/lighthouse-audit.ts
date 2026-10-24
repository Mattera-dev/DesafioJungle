import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:4173';
const OUT_DIR = path.resolve(process.cwd(), 'lighthouse-reports');
const DEBUG_PORT = 9222;

const PAGES = [
  { name: 'home', url: `${BASE_URL}/` },
  { name: 'nft-detail', url: `${BASE_URL}/nft/emerald-ape-042` },
];

const PROFILES = ['mobile', 'desktop'] as const;
const RUNS_PER_COMBINATION = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

async function isServerReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensurePreviewServer(): Promise<ChildProcess | null> {
  if (await isServerReachable(BASE_URL)) {
    return null;
  }

  const distIndex = path.resolve(process.cwd(), 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    console.log('[Lighthouse] Building production bundle first...');
    const buildProc = spawn('bun', ['run', 'build'], {
      stdio: 'inherit',
      shell: true,
    });
    await new Promise<void>((resolve, reject) => {
      buildProc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
  }

  console.log(`[Lighthouse] Starting preview server at ${BASE_URL}...`);
  const previewProc = spawn('bun', ['run', 'preview', '--port', '4173'], {
    stdio: 'ignore',
    shell: true,
  });

  for (let i = 0; i < 40; i++) {
    if (await isServerReachable(BASE_URL)) {
      return previewProc;
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  previewProc.kill();
  throw new Error(`Timed out waiting for preview server at ${BASE_URL}`);
}

async function runAudit() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const previewProc = await ensurePreviewServer();

  const browser = await chromium.launch({
    headless: true,
    args: [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
    ],
  });

  const summary: Record<string, unknown> = {
    executedAt: new Date().toISOString(),
    runtime: `Bun ${process.versions.bun || process.version}`,
    browserExecutable: chromium.executablePath(),
    os: `${process.platform} ${process.arch}`,
    baseUrl: BASE_URL,
    runsPerPageAndProfile: RUNS_PER_COMBINATION,
    results: [],
  };

  try {
    for (const page of PAGES) {
      for (const profile of PROFILES) {
        const scores = {
          performance: [] as number[],
          accessibility: [] as number[],
          bestPractices: [] as number[],
          seo: [] as number[],
          lcpMs: [] as number[],
          cls: [] as number[],
          tbtMs: [] as number[],
        };

        for (let run = 1; run <= RUNS_PER_COMBINATION; run++) {
          console.log(
            `[Lighthouse] Auditing ${page.name} (${profile}) — run ${run}/${RUNS_PER_COMBINATION}...`
          );
          const runnerResult = await lighthouse(
            page.url,
            {
              logLevel: 'error',
              output: ['json', 'html'],
              port: DEBUG_PORT,
              onlyCategories: [
                'performance',
                'accessibility',
                'best-practices',
                'seo',
              ],
              formFactor: profile,
              screenEmulation:
                profile === 'desktop'
                  ? {
                      mobile: false,
                      width: 1440,
                      height: 900,
                      deviceScaleFactor: 1,
                      disabled: false,
                    }
                  : undefined,
            },
            profile === 'desktop'
              ? {
                  extends: 'lighthouse:default',
                  settings: {
                    formFactor: 'desktop',
                    throttling: {
                      rttMs: 40,
                      throughputKbps: 10240,
                      cpuSlowdownMultiplier: 1,
                    },
                  },
                }
              : undefined
          );

          if (!runnerResult) continue;
          const lhr = runnerResult.lhr;
          const [jsonReport, htmlReport] = runnerResult.report as [string, string];

          fs.writeFileSync(
            path.join(OUT_DIR, `${page.name}-${profile}-run${run}.json`),
            jsonReport
          );
          fs.writeFileSync(
            path.join(OUT_DIR, `${page.name}-${profile}-run${run}.html`),
            htmlReport
          );

          scores.performance.push(
            Math.round((lhr.categories.performance?.score ?? 0) * 100)
          );
          scores.accessibility.push(
            Math.round((lhr.categories.accessibility?.score ?? 0) * 100)
          );
          scores.bestPractices.push(
            Math.round((lhr.categories['best-practices']?.score ?? 0) * 100)
          );
          scores.seo.push(Math.round((lhr.categories.seo?.score ?? 0) * 100));

          scores.lcpMs.push(
            Math.round(lhr.audits['largest-contentful-paint']?.numericValue ?? 0)
          );
          scores.cls.push(
            Number(
              (lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(4)
            )
          );
          scores.tbtMs.push(
            Math.round(lhr.audits['total-blocking-time']?.numericValue ?? 0)
          );
        }

        const medianResult = {
          page: page.name,
          url: page.url,
          profile,
          medians: {
            performance: median(scores.performance),
            accessibility: median(scores.accessibility),
            bestPractices: median(scores.bestPractices),
            seo: median(scores.seo),
            lcpMs: median(scores.lcpMs),
            cls: median(scores.cls),
            tbtMs: median(scores.tbtMs),
          },
          rawRuns: scores,
        };

        (summary.results as unknown[]).push(medianResult);
        console.log(
          `[Lighthouse] Median for ${page.name} (${profile}):`,
          medianResult.medians
        );
      }
    }
  } finally {
    await browser.close();
    if (previewProc) {
      previewProc.kill();
    }
  }

  fs.writeFileSync(
    path.join(OUT_DIR, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  console.log(`\n[Lighthouse] Reports saved to ${OUT_DIR}/summary.json`);
}

runAudit().catch((err) => {
  console.error('Lighthouse audit failed:', err);
  process.exit(1);
});
