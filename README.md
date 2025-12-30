# Bitburner External Editor Project

This repository contains my personal Bitburner development environment using the **bb-external-editor** workflow. It provides a clean, local‑first setup for writing, organizing, and maintaining Bitburner scripts with full TypeScript and module support.

Anyone cloning this repo can immediately start coding with automatic syncing into the game.

---

## 🏷️ Badges

![Node.js](https://img.shields.io/badge/Node.js-LTS-green)
![Bitburner](https://img.shields.io/badge/Bitburner-External%20Editor-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-Enabled-3178C6)
![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Steam-lightgrey)

---

## ⚡ Quickstart

Clone the repo:

```bash
git clone <your-repo-url>
cd <your-project-folder>
```

Install dependencies:

```bash
npm install
```

Start the development watcher:

```bash
npm run dev
```

Launch Bitburner and your scripts will sync automatically.

**Windows users:**  
You can instead use the included `Start-Bitburner-With-Sync.bat` script to launch *both* Bitburner (via Steam) and the sync server automatically (details below).

---

## 🚀 Features

- Local folder structure that mirrors Bitburner’s internal server layout  
- Automatic syncing between local files and the game  
- Full TypeScript support via esbuild  
- Modular script organization with nested directories  
- Zero manual file copying  
- A Windows startup script that launches Bitburner via Steam and automatically manages the sync server lifecycle  

---

## 🧠 How the Folder Mapping Works

The `servers/` directory in this repo directly maps to Bitburner’s internal virtual filesystem.

You can create subdirectories under `servers/` to target **any server that exists in the game**, not just `home`.

For example:

```
servers/home/hack.ts
servers/n00dles/early-grow.ts
servers/foodnstuff/utility/scan.ts
```

These become, inside Bitburner:

```
/hack.js                 on home
/early-grow.js           on n00dles
/utility/scan.js         on foodnstuff
```

I personally keep all my scripts under `servers/home/`, but the system fully supports multi‑server organization if you prefer a more distributed layout.

---

## ▶️ Windows Convenience Script

This project includes a Windows batch script (`Start-Bitburner-With-Sync.bat`) that provides a fully automated development workflow.

### What the script does

The script:

1. Opens a terminal titled **bitburner-sync-server**
2. Navigates to your project directory
3. Starts the sync server (`npm start`) *in the same terminal*
4. Detects the PID of the sync server’s `node.exe` process
5. Launches Bitburner via Steam (`steam://rungameid/1812820`)
6. Waits for Bitburner to fully start
7. Monitors Bitburner until it closes
8. Automatically terminates the sync server when Bitburner exits
9. Closes the terminal if launched from Explorer

### Why this is useful

- No leftover Node processes  
- No need to manually start or stop anything  
- One double‑click launches your entire game and dev environment  
- Clean shutdown every time  

### Running it

Double‑click:

```
Start-Bitburner-With-Sync.bat
```

Or run from a terminal:

```bash
Start-Bitburner-With-Sync.bat
```

---

## 📁 Project Structure

```
servers/
  home/
    *.ts        # Your Bitburner scripts
    lib/        # Optional shared utilities

Start-Bitburner-With-Sync.bat
esbuild.config.js
package.json
package-lock.json
README.md
```

The `servers/` directory is the source of truth.  
The external editor plugin syncs these files directly into Bitburner’s internal filesystem.

---

## 📦 Requirements

- Node.js (LTS recommended)  
- Bitburner (Steam or browser)  
- The bb-external-editor extension installed in Bitburner  
- Windows (optional, for the convenience script)

---

## 📝 Credits

This project is based on the excellent **bb-external-editor** template by  
**@shyguy1412**  
https://github.com/shyguy1412/bb-external-editor

Their work made this workflow possible.

---

