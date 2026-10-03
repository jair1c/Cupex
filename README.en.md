# Cupex

Unofficial Windows desktop widget for Codex usage, adapted from [Cupo](https://github.com/OkazoKoroma/cupo) under its MIT license.

Version 0.4.0 adds reading age, manual refresh, persistent stale readings, configurable weekly alerts and used/remaining display modes. Check for updates from `jair1c/Cupex` in Settings.

Displays real weekly and primary-window quotas using the local `codex app-server`, reset countdowns, configurable alerts, estimated daily usage, local history, projections and CSV export. Supports one active ChatGPT-backed Codex account, with separate archived histories when the connected account changes. Disconnecting the widget does not log Codex out.

Requires Windows, Node.js 20+ and an installed Codex executable. Run `npm install`, then `npm start`. Set `CUPEX_CODEX_PATH` to choose an executable explicitly. Settings live under `%APPDATA%\Cupex`, separate from Cupo.

The first version requires a weekly secondary quota. Other quota structures and API-key billing are unsupported. Daily usage is an estimate from observed weekly percentage changes, not an exact token count. Product breakdown is unavailable. Browser sign-in is implemented; local validation used an existing session.

Run `npm test` for calculations and response-validation tests; `npm run verify:ui` validates the Electron UI with live limits and saves screenshots under `artifacts/`. Close the widget first. `npm start -- --prueba` uses simulated data.

See [README.md](README.md) for full setup, architecture and limitations.
