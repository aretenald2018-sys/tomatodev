# Lite Version Implementation Notes

This lite version no longer includes the old movie-calendar crawler.

Removed legacy pieces:

- `movie` tab runtime
- `npm run crawl`
- `POST /api/crawl-movies`
- `GET /api/status`
- Claude Vision movie extraction dependency

The remaining optional API server is intentionally small:

- `GET /api/health`
- `GET /api/fear-greed`

Run the app locally with:

```powershell
cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; npm.cmd run dev
```
