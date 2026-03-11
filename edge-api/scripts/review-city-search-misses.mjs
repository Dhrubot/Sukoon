import fs from 'node:fs/promises';
import process from 'node:process';

async function readInput() {
  const filePath = process.argv[2];
  if (filePath) {
    return fs.readFile(filePath, 'utf8');
  }

  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parseLines(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

function aggregateMisses(events) {
  const buckets = new Map();

  for (const event of events) {
    if (event.event !== 'city_search_resolved') continue;
    if (event.searchSource !== 'city_index_miss') continue;

    const country = String(event.country || 'unknown').toUpperCase();
    const queryPrefix = String(event.queryPrefix || 'none').toLowerCase();
    const key = `${country}:${queryPrefix}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        country,
        queryPrefix,
        count: 0,
        hasCountryCoverage: Boolean(event.hasCountryCoverage),
      });
    }

    buckets.get(key).count += 1;
  }

  return [...buckets.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    if (left.country !== right.country) return left.country.localeCompare(right.country);
    return left.queryPrefix.localeCompare(right.queryPrefix);
  });
}

async function main() {
  const raw = await readInput();
  const events = parseLines(raw);
  const misses = aggregateMisses(events);

  process.stdout.write(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalEvents: events.length,
        totalMissBuckets: misses.length,
        misses,
      },
      null,
      2
    ) + '\n'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
