# Cloudflare Edge Setup

## What this adds

The app can now read prayer times, Hijri dates, and geocoding through a Sukoon-controlled edge API instead of calling third-party providers directly from the phone.

## What you need to create in Cloudflare

### 1. Create a Worker

- Create a new Worker named `sukoon-edge-api`.
- Use the files in [`edge-api/`](/Users/dhrubo/Desktop/dev-folder/Sukoon/edge-api).

### 2. Optional but recommended KV namespaces

Create:

- `CACHE_KV`
- `HIJRI_OVERRIDES`

Then bind them in `wrangler.toml`.

Example:

```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "replace-with-prod-id"
preview_id = "replace-with-preview-id"

[[kv_namespaces]]
binding = "HIJRI_OVERRIDES"
id = "replace-with-prod-id"
preview_id = "replace-with-preview-id"
```

### 3. Set Worker variables

Use the defaults unless you need different providers:

- `ALADHAN_API_BASE=https://api.aladhan.com/v1`
- `NOMINATIM_API_BASE=https://nominatim.openstreetmap.org`
- `PRAYER_CACHE_TTL_SECONDS=86400`
- `HIJRI_CACHE_TTL_SECONDS=86400`
- `GEOCODE_CACHE_TTL_SECONDS=604800`
- `SEARCH_CACHE_TTL_SECONDS=604800`

### 4. Deploy the Worker

Inside [`edge-api/`](/Users/dhrubo/Desktop/dev-folder/Sukoon/edge-api):

```bash
npm install
npm run deploy
```

### 5. Configure the mobile app

Set:

```bash
EXPO_PUBLIC_EDGE_API_BASE_URL=https://your-worker-subdomain.workers.dev
```

Optional:

```bash
EXPO_PUBLIC_EDGE_API_ENABLED=true
```

The app will fall back to direct provider requests if this base URL is missing or if the edge request fails.

## Recommended rollout

1. Deploy Worker to preview or dev first.
2. Point one local/dev build at the Worker.
3. Verify prayer times match current app behavior for several cities and methods.
4. Verify Hijri date matches expected regional policy.
5. Verify manual location search and reverse geocoding.
6. Only then set `EXPO_PUBLIC_EDGE_API_BASE_URL` in production.

## Important operational note

`/v1/location/search` still uses Nominatim behind the Worker as a temporary compatibility path. That is acceptable for low-volume rollout, but not the final state for large-scale search traffic. Replace it with a curated city index next.
