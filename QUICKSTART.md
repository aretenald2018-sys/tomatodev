# Tomato Farm Quickstart

## Local App

Start the app from the project root:

```powershell
cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; npm.cmd run dev
```

Open the URL printed by the dev script. It is usually `http://localhost:5500/`, but the script may choose `5501`, `5502`, and so on if the default port is busy.

## Optional API Server

The optional API server only exposes operational helper endpoints:

- `GET /api/health`
- `GET /api/fear-greed`

Start it only when you need those endpoints:

```powershell
cd "C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)"; npm.cmd run server
```

Movie crawling endpoints were removed with the lite-version cleanup. The `movie` tab and `crawl` script are no longer part of this app.
