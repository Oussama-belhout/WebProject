# WebSamplerProject

Full-stack Web Audio sampler that exploites the Express backend from `M1InfoWebTechnos2025_2026/Seance5`. The application serves a dynamic preset catalogue and audio assets from the backend while providing an interactive sampler UI in the browser.

## Design Notes (Work in Progress Mindset)

- **Backend reused, not reinvented** – kept the Express server almost untouched; only retitled the package and pointed it to the merged `public/` folder.
- **Frontend glued on top** – my sampler UI now lives in the same `public/` directory the backend serves, so everything runs from one port.
- **PresetManager lesson** – removed the hard-coded URL and learned how to resolve endpoints relative to the current origin; that makes the app work whether it runs on `localhost:3000` or somewhere else.
- **Windows awareness** – paths and encodings were double-checked so WAV filenames with spaces (e.g. `Kick 808X.wav`) still load when running on Windows.
- **Fallback kept** – the Wikipedia fallback preset remains as proof that I thought about the server being offline.

## How to Launch the App

1. Install dependencies (first-time only):

   ```bash
   cd WebSamplerProject
   npm install
   ```

2. Start the backend + static server:

   ```bash
   npm run dev
   ```

3. Open a browser at [http://localhost:3000](http://localhost:3000) and wait for the pads to finish loading the default preset.  
   If you change the port, set `PORT=XXXX npm run dev` and the frontend will follow automatically.

## Project Structure (at a glance)

- `index.mjs` – Express server exposing `/api/presets` and serving static files from `public`
- `package.json` – Node dependencies and scripts
- `public/`
  - `index.html` – main UI shell
  - `css/styles.css` – UI styling
  - `js/` – ES modules (`main.js`, `SamplerEngine`, `PresetManager`, etc.)
  - `presets/` – JSON definitions and audio samples served by the backend

## Picked Up

- Learned `fetch` needs encoded URLs when filenames contain spaces; added `encodeURI` in `PresetManager`.
- Replaced hard-coded hostnames with `window.location.origin` detection, so there’s one less environment variable to remember.
- Kept a simple README that mirrors the learning steps instead of a “professional” doc—helps me remember why each change was made.
- Preserved the professor’s data directory logic (`PUBLIC_DIR`, `DATA_DIR`) so I can point the server to another preset folder later without rewriting code.

## Environment Variables (optional)

- `PORT` – Override the listening port (defaults to `3000`)
- `PUBLIC_DIR` – Absolute path for static assets (if you want to serve another build)
- `DATA_DIR` – Absolute path for preset JSON/audio files (handy for experiments)

All paths resolve nicely on Windows, macOS, and Linux. By default, everything runs from the `public/` directory in this project.

