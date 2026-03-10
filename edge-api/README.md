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
2. Run `npm run dev`.
3. Point `EXPO_PUBLIC_EDGE_API_BASE_URL` at the local worker URL.

## Production notes

- `CACHE_KV` is optional but strongly recommended.
- `HIJRI_OVERRIDES` is optional and allows date-specific corrections without an app release.
- Search still proxies Nominatim as a temporary compatibility path. Replace that with a curated city index before high-scale public rollout.

