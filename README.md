# Winomation

Winomation is a Windows automation desktop app built with Electron, React, and React Flow. It gives you a visual, node-based editor for building automations with `Trigger -> Condition -> Action` logic, then runs those workflows in the Electron main process with a Node-first execution model.

## What This Project Does

This project is meant to be a Windows equivalent of tools like Tasker or MacroDroid, but with a desktop-first workflow editor.

With Winomation, you can:

- Create workflows from a drag-and-drop canvas
- Start automations from system, file, time, input, power, and MITM proxy triggers
- Gate execution with conditions like process checks, file existence, clipboard matching, and proxy state
- Run actions such as launching apps, killing processes, file operations, screenshots, notifications, DNS changes, power commands, keyboard/mouse automation, and HTTP proxy modifications
- Save workflows locally and reopen them from a dashboard
- Keep the app running in the system tray so registered triggers continue listening in the background

## How It Works

The app is split into three practical layers:

### 1. UI layer

The renderer is built with React and React Flow.

- `src/App.jsx` contains the dashboard, workflow editor, node settings panel, and drag-and-drop canvas
- `src/common/nodeDefinitions.js` defines the available triggers, conditions, actions, categories, parameter types, and defaults
- `src/renderer/nodes.jsx` provides the custom node components shown on the canvas

The editor stores workflows as a graph:

- `nodes` describe triggers, conditions, and actions
- `edges` describe execution order between nodes

### 2. IPC bridge

The renderer does not call Node or Electron APIs directly.

- `src/preload.js` exposes a small `window.electronAPI` surface
- `src/main.js` receives those IPC calls and routes them to the runtime, persistence helpers, and system queries

This keeps the renderer focused on UI and keeps execution inside the main process.

### 3. Runtime layer

The automation runtime lives in the Electron main process.

- `src/main/FlowRunner.js` starts workflows, registers trigger listeners, and walks the graph when a trigger fires
- `src/main/TriggerManager.js` registers long-lived listeners for hotkeys, file watchers, polling-based system checks, schedules, and battery/network monitoring
- `src/main/engine.js` executes actions and evaluates conditions
- `src/main/Logger.js` keeps an in-memory log and writes to the app log file

## How We Achieve The Automation

The project follows a Node-first approach:

### Node.js handles what it can directly

Node and Electron are used for:

- File operations
- Process checks and process termination
- Notifications and toast windows
- Clipboard access
- PowerShell-backed screenshots
- DNS changes and power commands
- Workflow persistence
- Tray behavior and app startup behavior

This logic is centered in `src/main/engine.js`, `src/main/TriggerManager.js`, and `src/main.js`.

### AutoHotkey is used as a focused fallback

Some Windows UI actions are awkward or unreliable from plain Node alone, so Winomation delegates them to AutoHotkey:

- Sending keys
- Mouse clicks
- Window close/minimize
- Program launch
- Volume control

That bridge works like this:

1. `src/main/engine.js` builds a JSON payload for the requested action.
2. It launches `AutoHotkey64.exe`.
3. `ahk/runner.ahk` reads the payload and performs the UI-level action.
4. The result is written back as JSON so the main process can continue the flow.

This keeps AHK as an implementation detail instead of the main automation engine.

### MITM automation is built in as a separate execution path

The project also includes a proxy automation engine:

- `src/MitmEngine/MitmController.js` starts and stops the proxy
- It can intercept requests and responses
- It can block requests, remove headers, replace body content, change status codes, and update JSON fields
- MITM nodes are defined alongside the other workflow nodes in `src/common/nodeDefinitions.js`

This lets workflows automate not only the desktop, but also selected HTTP/HTTPS traffic scenarios.

## Execution Model

When a workflow runs:

1. The renderer sends the current graph through IPC.
2. `src/main/FlowRunner.js` registers every trigger node in that flow.
3. When a trigger fires, FlowRunner walks forward through connected nodes.
4. Condition nodes decide whether the branch continues.
5. Action nodes execute through Node/Electron or AutoHotkey depending on the action type.

This means workflows are graph-driven, not hardcoded. The canvas itself becomes the runtime definition.

## Current Trigger Types

Implemented trigger categories include:

- Hotkey
- File change / rename
- App launch
- App close
- Window focus
- Network connect / disconnect
- Specific daily time
- Repeating interval
- Battery threshold
- MITM request / response interception

## Current Condition Types

Implemented conditions include:

- App is running
- File exists
- Clipboard contains text
- Proxy is running
- MITM URL match
- MITM status-code match

## Current Action Types

Implemented actions include:

- Run program
- Kill process
- File operations
- Screenshot
- Show notification
- Show toast
- Send keys
- Mouse click
- Close window
- Minimize window
- Volume control
- Set DNS
- System power actions
- Start/stop MITM proxy
- Generate/install MITM certificate
- MITM request/response modification actions

## Project Structure

```text
.
|-- ahk/
|   `-- runner.ahk
|-- assets/
|   `-- tray.ico
|-- src/
|   |-- main.js
|   |-- preload.js
|   |-- App.jsx
|   |-- common/
|   |   `-- nodeDefinitions.js
|   |-- main/
|   |   |-- FlowRunner.js
|   |   |-- TriggerManager.js
|   |   |-- engine.js
|   |   `-- Logger.js
|   |-- MitmEngine/
|   |   `-- MitmController.js
|   `-- renderer/
|       `-- nodes.jsx
|-- package.json
`-- forge.config.js
```

## Development

### Requirements

- Windows
- Node.js
- npm
- AutoHotkey runtime shipped in this repo as `AutoHotkey64.exe`

### Install

```bash
npm install
```

### Start in development

```bash
npm start
```

### Build packages

```bash
npm run package
npm run make
```

## Notes About The Current State

This codebase already delivers the main workflow editor and runtime loop, but it is still evolving.

- The architecture document in `requirements.md` describes the broader target system
- The current implementation is centered on Electron main-process execution, not a separate Windows service yet
- Some actions listed in the catalog are more complete than others, and a few paths are still partial or evolving
- The MITM support is present in the codebase and operationally separate from the regular trigger/action path

## Summary

Winomation is a visual Windows automation builder that combines:

- React Flow for authoring workflows
- Electron IPC for safe UI-to-runtime communication
- Node.js for most automation work
- AutoHotkey for UI-level fallback actions
- A built-in MITM proxy module for request/response automation

The main idea is simple: design workflows visually, store them as graph data, and execute them through a runtime that chooses the most practical automation path for each node.
