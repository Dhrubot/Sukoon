import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'dist');
const outputPath = path.join(outputDir, 'city-index.kv.json');
const DEFAULT_CITY_INDEX_VERSION = 'v2';
const MAX_SHARD_ENTRIES = Number(process.env.CITY_INDEX_MAX_SHARD_ENTRIES ?? '120');
const MAX_SHARD_BYTES = Number(process.env.CITY_INDEX_MAX_SHARD_BYTES ?? '50000');

function parseArgs(argv) {
  const parsed = {};

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;

    const [rawKey, rawValue] = arg.slice(2).split('=');
    if (!rawKey) continue;
    parsed[rawKey] = rawValue ?? 'true';
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));
const CITY_INDEX_VERSION = args.version || process.env.CITY_INDEX_VERSION || DEFAULT_CITY_INDEX_VERSION;
const inputPath = args.input
  ? path.resolve(rootDir, args.input)
  : path.join(rootDir, 'data', `cities.${CITY_INDEX_VERSION}.json`);
const resolvedOutputPath = args.output ? path.resolve(rootDir, args.output) : outputPath;

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildPrefixKeys(entry) {
  const tokens = [entry.normalizedName, ...entry.normalizedAliases]
    .flatMap((value) => value.split(' '))
    .filter((value) => value.length >= 2);

  const prefixes = new Set();
  for (const token of tokens) {
    prefixes.add(token.slice(0, 2));
  }

  if (prefixes.size === 0 && entry.normalizedName.length > 0) {
    prefixes.add(entry.normalizedName.slice(0, Math.min(2, entry.normalizedName.length)));
  }

  return [...prefixes];
}

function sortShardEntries(left, right) {
  if (right.population !== left.population) {
    return right.population - left.population;
  }

  if (left.countryCode !== right.countryCode) {
    return left.countryCode.localeCompare(right.countryCode);
  }

  return left.name.localeCompare(right.name);
}

function buildManifestKey() {
  return `city-index:${CITY_INDEX_VERSION}:manifest`;
}

function buildShardKey(countryCode, prefix) {
  return `city-index:${CITY_INDEX_VERSION}:shard:${countryCode}:${prefix}`;
}

function buildKvRecords(entries) {
  const countryCounts = {};
  const countryTopCities = {};
  const shards = new Map();

  for (const entry of entries) {
    countryCounts[entry.countryCode] = (countryCounts[entry.countryCode] || 0) + 1;
    if (!countryTopCities[entry.countryCode]) {
      countryTopCities[entry.countryCode] = [];
    }
    countryTopCities[entry.countryCode].push({
      city: entry.name,
      country: entry.country,
      admin1: entry.admin1,
      latitude: entry.latitude,
      longitude: entry.longitude,
      population: entry.population,
    });

    for (const prefix of buildPrefixKeys(entry)) {
      const globalKey = buildShardKey('*', prefix);
      const countryKey = buildShardKey(entry.countryCode.toLowerCase(), prefix);

      if (!shards.has(globalKey)) shards.set(globalKey, []);
      if (!shards.has(countryKey)) shards.set(countryKey, []);

      shards.get(globalKey).push(entry);
      shards.get(countryKey).push(entry);
    }
  }

  const records = [
    {
      key: buildManifestKey(),
      value: JSON.stringify({
        version: CITY_INDEX_VERSION,
        countryCounts,
        countryTopCities: Object.fromEntries(
          Object.entries(countryTopCities).map(([countryCode, cities]) => [
            countryCode,
            cities
              .sort((left, right) => right.population - left.population)
              .slice(0, 5)
              .map(({ population, ...city }) => city),
          ])
        ),
      }),
    },
  ];

  const shardStats = [...shards.entries()]
    .map(([key, shardEntries]) => {
      const deduped = [...new Map(
        shardEntries.map((entry) => [
          `${entry.name}:${entry.countryCode}:${entry.admin1 || ''}`,
          entry,
        ])
      ).values()].sort(sortShardEntries);

      return {
        key,
        entries: deduped,
        entryCount: deduped.length,
        byteLength: JSON.stringify(deduped).length,
      };
    })
    .sort((left, right) => {
      if (right.entryCount !== left.entryCount) {
        return right.entryCount - left.entryCount;
      }

      return right.byteLength - left.byteLength;
    });

  const largestShard = shardStats[0] ?? null;
  if (
    largestShard &&
    (largestShard.entryCount > MAX_SHARD_ENTRIES || largestShard.byteLength > MAX_SHARD_BYTES)
  ) {
    throw new Error(
      `Shard guard failed for ${largestShard.key}: ${largestShard.entryCount} entries, ${largestShard.byteLength} bytes ` +
      `(limits ${MAX_SHARD_ENTRIES} entries / ${MAX_SHARD_BYTES} bytes).`
    );
  }

  for (const shard of shardStats) {
    records.push({
      key: shard.key,
      value: JSON.stringify(shard.entries),
    });
  }

  return {
    records,
    countryCounts,
    largestShard,
  };
}

async function main() {
  const raw = await fs.readFile(inputPath, 'utf8');
  const sourceEntries = JSON.parse(raw);

  const entries = sourceEntries.map((entry) => ({
    name: entry.name,
    country: entry.country,
    countryCode: entry.countryCode,
    admin1: entry.admin1 ?? undefined,
    latitude: entry.latitude,
    longitude: entry.longitude,
    population: entry.population,
    normalizedName: normalizeText(entry.name),
    normalizedCountry: normalizeText(entry.country),
    normalizedAdmin1: normalizeText(entry.admin1 ?? ''),
    normalizedAliases: (entry.aliases ?? []).map((alias) => normalizeText(alias)),
  }));

  const { records, countryCounts, largestShard } = buildKvRecords(entries);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(resolvedOutputPath, JSON.stringify(records, null, 2));

  console.log(
    `Generated ${entries.length} city entries, ${Object.keys(countryCounts).length} countries, and ${records.length - 1} shard keys for ${CITY_INDEX_VERSION}.`
  );
  if (largestShard) {
    console.log(
      `Largest shard ${largestShard.key}: ${largestShard.entryCount} entries, ${largestShard.byteLength} bytes.`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
