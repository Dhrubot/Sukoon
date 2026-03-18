# Sukoon Edge API

Cloudflare Worker facade for:

- prayer times
- Hijri date
- geocoding and reverse geocoding

The mobile app should call this worker instead of calling Aladhan or Nominatim directly.

## Endpoints

- `GET /v1/prayer-times`
- `GET /v1/hijri-date`
- `GET /v1/location/reverse`
- `GET /v1/location/search`
- `GET /health`

## Local development

1. Install dependencies in this folder.
2. Run `npm run build:city-index` after changing `data/cities.v1.json`.
3. Upload the generated city index into the remote `CACHE_KV` namespace before testing search:
   `wrangler kv bulk put --binding CACHE_KV dist/city-index.kv.json --preview false --remote`
4. Run `npm run dev`.
5. Point `EXPO_PUBLIC_EDGE_API_BASE_URL` at the local worker URL.

## Production notes

- `CACHE_KV` is required for city search and strongly recommended for response caching.
- `HIJRI_OVERRIDES` is optional and allows date-specific corrections without an app release.
- City search now reads KV-backed shards generated from `data/cities.v1.json`.
- Upload search shards to `CACHE_KV` after every city dataset change:
  `wrangler kv bulk put --binding CACHE_KV dist/city-index.kv.json --preview false --remote`
- Search no longer falls back to live Nominatim lookups.
- If a town is not indexed, the app should guide the user to choose the nearest major city instead.
- `CITY_INDEX_VERSION` lets you roll forward to a new shard set without breaking old keys.
- Search misses are logged as `city_search_resolved` events with `searchSource: "city_index_miss"`.
- Review miss buckets from Wrangler logs with:
  `npm run review:city-search-misses -- path/to/city-search.log`
- If you pipe `wrangler tail` output into a file, the review script will group misses by `country + queryPrefix` so you can expand `data/cities.v1.json` based on real demand.


Then, when you want to review misses from Cloudflare logs:

npx wrangler tail sukoon-edge-api > city-search.log
npm run review:city-search-misses -- city-search.log
