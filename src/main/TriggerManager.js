import { exec } from "child_process";
import { globalShortcut } from "electron";
import fs from "fs";
import path from "path";
import Logger from "./Logger";

class TriggerManager {
	constructor(onTriggerFire) {
		this.onTriggerFire = onTriggerFire;
		this.activeListeners = new Map();
	}

	register(node, flow) {
		// Ensure any existing listener for this node is cleared first
		this.clear(node.id);

		const { type, params } = node.data;
		Logger.info(`Registering Trigger: ${type} (ID: ${node.id})`);

		switch (type) {
			case "interval":
				const timer = setInterval(
					() => {
						Logger.info(`[Interval] Firing node ${node.id}`);
						this.onTriggerFire(node, flow.nodes, flow.edges);
					},
					Math.max(
						1000,
						(parseFloat(params.minutes) || 1) * 60 * 1000
					)
				);
				this.activeListeners.set(node.id, { type: "interval", timer });
				break;

			case "app_launch":
				const baseName = path.basename(params.processName);
				// PowerShell Get-Process uses names without .exe
				const procNameNoExt = baseName
					.toLowerCase()
					.replace(/\.exe$/, "");
				const displayProcName = baseName;

				// State tracking
				let wasRunning = false;

				const poll = setInterval(() => {
					// Use PowerShell to avoid /FI argument parsing issues in different shells
					exec(
						`powershell -NoProfile -Command "Get-Process -Name '${procNameNoExt}' -ErrorAction SilentlyContinue"`,
						(err, stdout) => {
							// If err, it usually means process not found (exit code 1)
							const isRunning = !err && stdout.trim().length > 0;

							// Debug log every check
							// Logger.info(`Checking ${displayProcName} (PS): running=${isRunning}, wasRunning=${wasRunning}`);

							if (isRunning && !wasRunning) {
								Logger.info(
									`App launch detected: ${displayProcName}`
								);
								this.onTriggerFire(
									node,
									flow.nodes,
									flow.edges
								);
							}
							wasRunning = isRunning;
						}
					);
				}, 5000); // Check every 5s

				this.activeListeners.set(node.id, {
					type: "interval",
					timer: poll,
				});
				break;

			case "app_close":
				const closeBaseName = path.basename(params.processName);
				const closeProcNameNoExt = closeBaseName
					.toLowerCase()
					.replace(/\.exe$/, "");
				const closeDisplayProcName = closeBaseName;

				let wasRunningClose = false;

				const closePoll = setInterval(() => {
					exec(
						`powershell -NoProfile -Command "Get-Process -Name '${closeProcNameNoExt}' -ErrorAction SilentlyContinue"`,
						(err, stdout) => {
							const isRunning = !err && stdout.trim().length > 0;

							if (!isRunning && wasRunningClose) {
								Logger.info(
									`App close detected: ${closeDisplayProcName}`
								);
								this.onTriggerFire(
									node,
									flow.nodes,
									flow.edges
								);
							}
							wasRunningClose = isRunning;
						}
					);
				}, 5000);

				this.activeListeners.set(node.id, {
					type: "interval",
					timer: closePoll,
				});
				break;

			case "window_focus":
				const winPoll = setInterval(() => {
					const safeTitle = (params.title || "").replace(/'/g, "''");
					exec(
						`powershell -NoProfile -Command "Get-Process | Where-Object {$_.MainWindowTitle -like '*${safeTitle}*'} | Select-Object -First 1"`,
						(err, stdout) => {
							if (!err && stdout.trim().length > 0) {
								// De-bounce could be added here, but firing is okay for now
								Logger.info(`Window focus match: ${safeTitle}`);
								this.onTriggerFire(
									node,
									flow.nodes,
									flow.edges
								);
							}
						}
					);
				}, 3000);
				this.activeListeners.set(node.id, {
					type: "interval",
					timer: winPoll,
				});
				break;

			case "hotkey":
				try {
					Logger.info(
						`Attempting to register hotkey: ${params.shortcut}`
					);
					const ret = globalShortcut.register(params.shortcut, () => {
						Logger.info(`Hotkey triggered: ${params.shortcut}`);
						this.onTriggerFire(node, flow.nodes, flow.edges);
					});
					if (!ret) {
						Logger.error(
							`Failed to register hotkey: ${params.shortcut}. Check format (e.g. CommandOrControl+X) or collisions.`
						);
					} else {
						Logger.info(
							`Hotkey registered successfully: ${params.shortcut}`
						);
					}
					this.activeListeners.set(node.id, {
						type: "hotkey",
						shortcut: params.shortcut,
					});
				} catch (e) {
					Logger.error(
						`Error registering hotkey ${params.shortcut}: ${e.message}`
					);
				}
				break;

			case "file_event":
				try {
					if (fs.existsSync(params.path)) {
						const watcher = fs.watch(
							params.path,
							(eventType, filename) => {
								if (eventType === params.event) {
									Logger.info(
										`File event detected: ${eventType} on ${filename}`
									);
									this.onTriggerFire(
										node,
										flow.nodes,
										flow.edges
									);
								}
							}
						);
						this.activeListeners.set(node.id, {
							type: "fs",
							watcher,
						});
					} else {
						Logger.error(
							`File path not found for trigger: ${params.path}`
						);
					}
				} catch (e) {
					Logger.error(
						`Error registering file watcher: ${e.message}`
					);
				}
				break;

			default:
				Logger.warn(
					`Trigger type ${type} registration not fully implemented.`
				);
		}
	}

	clear(nodeId) {
		if (this.activeListeners.has(nodeId)) {
			const listener = this.activeListeners.get(nodeId);
			if (listener.type === "interval") {
				clearInterval(listener.timer);
			} else if (listener.type === "hotkey") {
				globalShortcut.unregister(listener.shortcut);
			} else if (listener.type === "fs") {
				listener.watcher.close();
			}
			this.activeListeners.delete(nodeId);
		}
	}

	clearAll() {
		for (const nodeId of this.activeListeners.keys()) {
			this.clear(nodeId);
		}
	}
}

export default TriggerManager;
