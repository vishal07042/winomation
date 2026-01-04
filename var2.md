Node-based visual automation for Windows
(MacroDroid / Tasker-style, powered by Electron + Node + AutoHotkey)

🧱 High-Level Architecture
┌────────────────────────────┐
│        React UI            │
│   (React Flow Graph)       │
└────────────┬───────────────┘
             │ IPC (safe)
┌────────────▼───────────────┐
│        Preload Layer       │
│   (contextBridge APIs)     │
└────────────┬───────────────┘
             │ IPC
┌────────────▼───────────────┐
│        Node Engine         │
│  (Graph Executor / State) │
└────────────┬───────────────┘
      Node if possible
             │
      else fallback
             ▼
┌────────────────────────────┐
│    AutoHotkey v2 Engine    │
│  (Native Windows Control) │
└────────────────────────────┘

🎨 UI Layer (Renderer)
Tech

React

React Flow

No global state library

Responsibilities

Visual graph editor

Node configuration UI

Flow validation (basic)

Start / stop automations

Display logs & errors

Rules

❌ No Node APIs

❌ No filesystem

❌ No system access

🔐 Preload Layer
Tech

Electron contextBridge

IPC only

Responsibilities

Expose minimal APIs:

runFlow(flowJson)

stopFlow(id)

getSystemStatus()

Input validation

Permission checks

Example
window.api.runFlow(flow)

⚙️ Node Engine (Core Brain)
Responsibilities

Flow execution

Trigger listening

Condition evaluation

Action execution

Error handling

Scheduling

Permissions (Admin)

Core Components
engine/
 ├── FlowRunner.js
 ├── TriggerManager.js
 ├── ConditionEvaluator.js
 ├── ActionExecutor.js
 ├── AhkBridge.js

🔥 Execution Rule (Very Important)

If Node.js can do it → use Node
Else → delegate to AutoHotkey

This keeps:

Performance high

Native code minimal

Debugging easier

🧲 TRIGGERS

“When should the automation start?”

System Triggers

App launched

App closed

Window focused

Window title contains text

Screen locked / unlocked

System startup

System idle

Network connected / disconnected

USB device plugged / removed

Time Triggers

Specific time

Time interval

Daily / weekly

Cron-like schedule

Input Triggers

Global hotkey

Mouse button pressed

Key sequence

File Triggers

File created

File deleted

File modified

Folder change

Power Triggers

Battery low

Charger connected

Sleep / wake

🔎 CONDITIONS

“Should the automation continue?”

App Conditions

App is running

App is in foreground

App CPU usage

App memory usage

System Conditions

Wi-Fi connected

Internet reachable

Battery level

CPU usage

RAM usage

Window Conditions

Window title matches

Window exists

Screen resolution

File Conditions

File exists

File size

File contains text

Logical Conditions

AND / OR / NOT

Compare values

Regex match

⚡ ACTIONS

“What should happen?”

🟢 Node-First Actions

(use Node.js directly)

Run program

Kill process

Read / write file

HTTP request

Clipboard read / write

Notifications

Play sound

Delay / sleep

Log output

JSON / variable manipulation

🔴 AHK-Powered Actions

(fallback to AutoHotkey)

Simulate key press

Mouse move / click

Window resize / move

Control UI elements

Send text to apps

Scroll

Drag & drop

Screenshot

Screen pixel detection

🧠 Variables & Flow Data

Global variables

Flow-local variables

Environment variables

Output of one node → input of next

🔄 Flow Execution Model
Trigger fires
   ↓
Check conditions
   ↓
Execute actions (sequential / parallel)
   ↓
Handle errors
   ↓
Repeat / stop

🧪 Error Handling

Node failure → retry / stop

AHK failure → capture stdout

Timeout protection

Per-node error policy:

Stop flow

Skip node

Retry

🔐 Permissions Model (Windows “Device Owner” Equivalent)

App requests Admin once

Admin status stored securely

All privileged actions routed through Node

Renderer never touches admin APIs

📦 AutoHotkey Integration
Communication

child_process.spawn

JSON via stdin/stdout

Temporary script files

Example
Node → JSON → AHK → stdout → Node

🚀 Extensibility

New triggers via plugin folder

New actions via JS or AHK

Custom nodes auto-registered in UI