# Architecture

## Overview
The application is a monorepo structured with `pnpm workspaces`.

### Packages
- **`apps/desktop`**: The main Electron application.
  - **Main Process**: Handles window management, global shortcuts, and orchestrates the core logic.
  - **Renderer Process**: React application for the UI.
- **`packages/core`**: The business logic, decoupled from Electron.
  - **LogTailer**: Watches `Player.log` for changes.
  - **ArenaLogParser**: Parses raw log lines into structured events.
  - **GameStateStore**: Maintains the current known state of the game (cards in zones).
  - **ScryfallClient**: Fetches card metadata and images.
  - **CardCache**: Caches Scryfall data locally.
- **`packages/shared`**: Shared TypeScript types and schemas used by both Core and UI.

## Data Flow
1. **MTGA** writes to `Player.log`.
2. **LogTailer** detects changes and reads new lines.
3. **ArenaLogParser** processes lines, extracting GRE (Game Rules Engine) messages.
4. **GameStateParser** (part of Parser/Store) updates the **GameStateStore**.
5. **Main Process** observes the Store and sends IPC messages (`game-state-update`) to the **Renderer**.
6. **React UI** receives the state and updates the DOM.

## Security
- No remote code execution.
- No auto-updates in MVP.
- No analytics.
