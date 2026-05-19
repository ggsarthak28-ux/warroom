# WarRoom

Professional Indian stock-market learning simulator built with React, Vite, Node/Express, WebSocket price plumbing, TradingView Lightweight Charts, provider-backed market data, virtual trading, and backend-only Gemini AI.

## Quick Open

- App: [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- API health: [http://127.0.0.1:8787/api/health](http://127.0.0.1:8787/api/health)
- Project folder: `C:\Users\sarth\Documents\Codex\2026-05-18\files-mentioned-by-the-user-doctype\WarRoom`

## Open In VS Code

Open PowerShell, then run:

```powershell
cd "C:\Users\sarth\Documents\Codex\2026-05-18\files-mentioned-by-the-user-doctype\WarRoom"
code .
```

If `code` is not recognized, open VS Code first, press `Ctrl+K Ctrl+O`, and choose the WarRoom folder above.

## Start The App

From the WarRoom folder:

```powershell
node scripts/dev.mjs
```

## Open On Another Device

`127.0.0.1` only works on the same computer. For your phone or another laptop, start LAN mode:

```powershell
cd "C:\Users\sarth\Documents\Codex\2026-05-18\files-mentioned-by-the-user-doctype\WarRoom"
node scripts/dev.mjs --lan
```

Then open this on the other device while it is connected to the same Wi-Fi:

```text
http://172.18.31.235:5173/
```

If it does not open:

- Make sure both devices are on the same Wi-Fi network.
- Keep the WarRoom terminal running on your computer.
- Allow Node.js / Vite through Windows Firewall if Windows asks.
- Try disabling VPN or mobile hotspot isolation.
- Re-check your computer IP with:

```powershell
ipconfig
```

Look for `IPv4 Address` under `Wireless LAN adapter Wi-Fi`, then open:

```text
http://YOUR_IPV4_ADDRESS:5173/
```

If PowerShell blocks `npm.ps1`, use Node directly:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev
```

The app needs both services:

- Frontend: `http://127.0.0.1:5173/`
- Backend: `http://127.0.0.1:8787/`

## Environment

Create `.env.local` from `.env.example` and add server-side keys only:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
MARKET_DATA_PROVIDER=yahoo
MARKET_API_KEY=
TWELVE_DATA_API_KEY=
NSE_INSTRUMENTS_URL=https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv
BSE_INSTRUMENTS_URL=
INSTRUMENTS_FILE=data/instruments.csv
```

Never put Gemini keys in React, browser code, or `VITE_` variables. Gemini runs only from the backend through `process.env.GEMINI_API_KEY`.

## Vercel Deployment

Vercel must deploy both the Vite frontend and the `/api/*` serverless routes in this repository. The app uses those routes for instruments, quotes, candles, options placeholders, market status, and Gemini backend calls.

In Vercel, add these Environment Variables:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
MARKET_DATA_PROVIDER=yahoo
TWELVE_DATA_API_KEY=
NSE_INSTRUMENTS_URL=https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv
BSE_INSTRUMENTS_URL=
```

On Vercel, WebSocket streaming is disabled unless `VITE_WS_BASE_URL` points to a separate WebSocket backend. The frontend uses `/api/*` polling there, so charts should still load from the provider-backed candle API.

## If The Link Does Not Open

1. Check the frontend:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:5173/
```

2. Check the backend:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8787/api/health
```

3. Restart both:

```powershell
cd "C:\Users\sarth\Documents\Codex\2026-05-18\files-mentioned-by-the-user-doctype\WarRoom"
node scripts/dev.mjs
```

For another device, restart with:

```powershell
node scripts/dev.mjs --lan
```

## Notes

- Yahoo Finance is labelled as free/delayed data.
- No fake quotes, fake candles, fake option-chain data, or random price movement is generated.
- Unsupported symbols stay searchable, but the chart explains when the current provider has no candle data.
