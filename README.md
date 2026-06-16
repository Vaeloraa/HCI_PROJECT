# FocusFlow

[中文版 README](./README.zh-CN.md)

FocusFlow is an adaptive attention management reading assistant. It tracks where you look (or move your mouse), estimates cognitive states such as focus, distraction, and reading difficulty, and applies lightweight interventions like highlights, prompts, and summaries.

The app runs in the browser as a static web application with an optional local dev server for LLM features.

## Requirements

- **Node.js** 18 or newer (for the dev server; Node 18+ includes native `fetch`)
- A modern browser: **Chrome**, **Edge**, or **Firefox** 
- **Webcam** (optional) — required only for eye-tracking via WebGazer; mouse tracking works without a camera

> **Important:** Do not open `index.html` directly with `file://`. Camera access and service workers require a local HTTP server (`http://localhost:8080` or `http://127.0.0.1:8080`).

## Quick Start

### 1. Install dependencies

From the project root (`HCI_PROJECT/`):

```bash
npm install
```

### 2. Start the dev server

```bash
npm start
```

This runs `server/dev-server.js` and serves the app at:

**http://127.0.0.1:8080**

Open that URL in your browser.

### 3. Use the app

1. Read the default article, or click **Import File** to load your own text (`.txt`, `.md`, `.pdf`, `.docx`, `.pptx`, and more).
2. By default, **mouse tracking** is active — move the cursor over the reading area to simulate gaze.
3. To enable **eye tracking**, click the camera / tracking control in the header and allow camera access when prompted. Complete the calibration if shown.
4. Switch language (**中文 / EN**), theme, and focus mode from the header bar.
5. Watch the sidebar for cognitive state, attention metrics, and session timeline.

## Run Options

| Command | Description |
|---------|-------------|
| `npm start` | Recommended. Starts the dev server with static files + LLM API proxy |
| `npm run serve` | Same as `npm start` |
| `npm run start:static` | Static file server only (no LLM proxy) via `http-server` on port 8080 |

## Optional: LLM Features (Summaries, Translation, Session Insights)

AI features (paragraph summaries, translate, session report insights) require an API key on the server.

Modify the `.env` file in the project root:

```env
OPENAI_API_KEY=your_api_key_here

# Optional overrides:
# PORT=8080
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-4o-mini
# FOCUSFLOW_LLM_API_KEY=your_api_key_here
```

Restart the dev server after changing `.env`.

- If no API key is set, the app still runs; LLM features fall back to local heuristics or show as unavailable.
- Check LLM status: `GET http://127.0.0.1:8080/api/llm/status`

**Do not commit `.env` or share API keys.**

## Project Structure

```
HCI_PROJECT/
├── index.html          # Main app entry
├── css/                # Styles
├── js/
│   ├── main.js         # Application orchestrator
│   ├── perception/     # Gaze / scroll / face input
│   ├── cognition/      # Cognitive state machine
│   ├── decision/       # Intervention strategy & execution
│   ├── ui/               # Reading view, visual effects, debug panel
│   ├── analytics/      # Session metrics & reports
│   ├── nlp/            # Summaries & translation
│   └── i18n/           # English / Chinese UI strings
├── server/
│   └── dev-server.js   # Local dev server + LLM proxy
├── manifest.json       # PWA manifest
└── sw.js               # Service worker (offline support)
```

## Troubleshooting

### Camera / eye tracking not working

- Use `http://127.0.0.1:8080` or `http://localhost:8080`, not `file://`.
- Allow camera permission in the browser (lock icon in the address bar).
- Close other apps that may be using the webcam (Zoom, Teams, etc.).
- If eye tracking fails, the app automatically falls back to mouse tracking.

### LLM / AI summary unavailable

- Confirm `.env` contains a valid `OPENAI_API_KEY`.
- Restart `npm start` after editing `.env`.
- Visit `/api/llm/status` — `"enabled": true` means the server sees your key.

### Imported file shows garbled text

- For Chinese `.txt` files, the app auto-detects UTF-8, GBK, and Big5 encodings.
- Legacy `.doc` / `.ppt` binary formats are not supported; convert to `.docx` / `.pptx`.

### Port already in use

Set a different port in `.env`:

```env
PORT=3000
```

Then open `http://127.0.0.1:3000`.

