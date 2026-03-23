import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = -1;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

function loadMetadata(outputDir) {
  return JSON.parse(readFileSync(join(outputDir, 'metadata.json'), 'utf8'));
}

function buildReport(outputDir) {
  const metadata = loadMetadata(outputDir);
  const ios = metadata.fileMetadata?.ios;

  if (!ios?.bundle || !Array.isArray(ios.assets)) {
    throw new Error('Expo export metadata is missing iOS bundle or asset data');
  }

  const bundlePath = join(outputDir, ios.bundle);
  const bundleBytes = statSync(bundlePath).size;
  const assets = ios.assets.map((asset) => {
    const path = join(outputDir, asset.path);
    return {
      path: asset.path,
      ext: asset.ext,
      bytes: statSync(path).size,
    };
  });

  const assetBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const byType = [...assets]
    .reduce((map, asset) => {
      map.set(asset.ext, (map.get(asset.ext) ?? 0) + asset.bytes);
      return map;
    }, new Map())
    .entries();

  const sortedTypes = [...byType].sort((left, right) => right[1] - left[1]);
  const largestAssets = [...assets]
    .sort((left, right) => right.bytes - left.bytes)
    .slice(0, 20);

  return { bundleBytes, assetBytes, sortedTypes, largestAssets };
}

function printReport(report) {
  console.log('Bundle analysis summary');
  console.log(`- JS bundle: ${formatBytes(report.bundleBytes)}`);
  console.log(`- Total exported assets: ${formatBytes(report.assetBytes)}`);
  console.log('- Asset totals by type:');
  report.sortedTypes.forEach(([ext, bytes]) => {
    console.log(`  - .${ext}: ${formatBytes(bytes)}`);
  });
  console.log('- Top 20 largest exported assets:');
  report.largestAssets.forEach((asset) => {
    console.log(`  - ${formatBytes(asset.bytes)}  ${asset.path}`);
  });
}

const outputDir = mkdtempSync(join(tmpdir(), 'sukoon-bundle-'));
const expoCli = require.resolve('expo/bin/cli');
const exportArgs = [
  expoCli,
  'export',
  '--platform',
  'ios',
  '--output-dir',
  outputDir,
  '--dump-sourcemap',
];

const exportRun = spawnSync(process.execPath, exportArgs, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI ?? '1',
  },
});

if (exportRun.status !== 0) {
  rmSync(outputDir, { recursive: true, force: true });
  process.exit(exportRun.status ?? 1);
}

try {
  const report = buildReport(outputDir);
  printReport(report);
  console.log(`- Output directory: ${outputDir}`);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
