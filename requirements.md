You are a senior Windows automation architect.

I am building a “Tasker / MacroDroid for Windows” desktop application with a
node-based drag-and-drop editor.

CORE PRINCIPLES (IMPORTANT):
- Prefer Node.js for ALL automation when possible
- Use AutoHotkey (AHK) ONLY when Node.js cannot do the task
- JavaScript ONLY (no TypeScript anywhere)
- Keep the system minimal and production-grade

TECH STACK (FIXED):
- UI: Electron + React (JavaScript)
- Node editor: React Flow
- State management: React useState, useReducer, Context ONLY
  (NO Redux, NO Zustand, NO MobX)
- Automation engine: Node.js
- Native helper: AutoHotkey (external process, fallback only)
- Privileged execution: Windows Service (SYSTEM level)
- IPC: local sockets or named pipes

ARCHITECTURE REQUIREMENTS:
1. Split the system into 3 layers:
   - UI Layer (Electron + React Flow)
   - Automation Engine (Node.js, main authority)
   - Privileged Windows Service

2. Node.js Automation Engine:
   - Performs all tasks possible using:
     - fs, child_process, os, net, timers
     - PowerShell only if necessary
   - Delegates to AHK ONLY for:
     - Keyboard/mouse input
     - Window focus/control
     - UI automation
   - Chooses Node vs AHK dynamically per action

3. UI Layer:
   - Visual node editor using React Flow
   - Nodes represent Trigger, Condition, Action
   - Manages graph state with React hooks only
   - Outputs validated workflow JSON

4. AutoHotkey Layer:
   - Runs as a separate helper process
   - Receives JSON commands from Node
   - Performs only non-Node-possible actions
   - Returns execution results and errors

5. Windows Service:
   - Installed once with admin permission
   - Runs permanently as SYSTEM
   - Handles system-level triggers and actions
   - Exposes IPC to Node engine
   - Never contains UI or business logic

DELIVERABLES I WANT:
- Text-based architecture diagram
- Clear folder structure (JS only)
- Node-first action execution decision flow
- Workflow JSON schema
- Example:
  - One trigger node
  - One condition node
  - One action node
- Pseudocode showing:
  - When Node executes directly
  - When AHK is invoked as fallback
- IPC design between:
  - UI ↔ Node
  - Node ↔ AHK
  - Node ↔ Windows Service
- Best practices for:
  - Security
  - Permissions
  - Reliability
  - Crash recovery

IMPORTANT RULES:
- NO TypeScript
- NO state management libraries
- NO always-on AHK (use only when needed)
- Treat AHK as an internal implementation detail
- Assume this is a serious production system

Explain concisely but deeply, like a senior engineer.
