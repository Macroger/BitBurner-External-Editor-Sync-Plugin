# Copilot Instructions for Bitburner External Editor Sync Plugin

## Project Overview
- This repo is a local-first Bitburner script development environment using the **bb-external-editor** workflow.
- Scripts in `servers/` mirror Bitburner’s in-game server filesystem. Subfolders under `servers/` map to in-game servers (e.g., `servers/home/`, `servers/n00dles/`).
- All scripts are written in TypeScript or JavaScript, bundled and synced automatically into Bitburner using esbuild and the `esbuild-bitburner-plugin`.

## Key Workflows
- **Development:**
  - Edit scripts in `servers/` (e.g., `servers/home/attackCoordinator.js`).
  - Run `npm run dev` to start the watcher and sync server.
  - On Windows, use `Start-Bitburner-With-Sync.bat` to launch both Bitburner (via Steam) and the sync server in one step.
- **Build System:**
  - Uses `esbuild` (see `config.mjs`) to bundle and output scripts to `build/`.
  - The sync server watches for changes and mirrors them into Bitburner.
- **Type Definitions:**
  - Use `NetscriptDefinitions.d.ts` for Bitburner API typings in scripts.

## Project Conventions
- **File Placement:**
  - Place scripts for a specific server in `servers/<server>/`.
  - Shared utilities can be placed in subfolders (e.g., `servers/home/lib/`).
- **Module Format:**
  - All scripts are bundled as ES modules (`format: 'esm'` in esbuild config).
- **TypeScript:**
  - TypeScript is fully supported; see `tsconfig.json` for settings.
  - Declaration files are emitted to `build/`.
- **No Manual Copying:**
  - Never copy files manually into Bitburner; the sync server handles all transfers.

## Integration Points
- **Bitburner Game:**
  - Requires the bb-external-editor Bitburner extension for syncing.
- **External Dependencies:**
  - See `package.json` for dependencies (notably `esbuild`, `esbuild-bitburner-plugin`).

## Examples
- To add a new script for `foodnstuff`, create `servers/foodnstuff/myScript.ts`.
- To share code, use `import` statements and place shared files in a common subfolder.

## References
- See `README.md` for detailed setup and workflow instructions.
- See `config.mjs` for esbuild and sync server configuration.
- See `Start-Bitburner-With-Sync.bat` for Windows automation.

---
For any unclear conventions or missing patterns, consult the README or ask for clarification.