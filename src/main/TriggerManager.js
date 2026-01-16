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
				const intervalSeconds = Math.max(
					1,
					parseFloat(params.seconds) || 30
				);
				Logger.info(
					`Interval trigger will fire every ${intervalSeconds} seconds`
				);
				const timer = setInterval(() => {
					Logger.info(`[Interval] Firing node ${node.id}`);
					this.onTriggerFire(node, flow.nodes, flow.edges);
				}, intervalSeconds * 1000);
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

			case "schedule":
				// Trigger at a specific time each day (e.g., "09:00")
				const scheduledTime = params.time || "09:00";
				const [hours, minutes] = scheduledTime.split(":").map(Number);
				let lastTriggered = null;

				const scheduleChecker = setInterval(() => {
					const now = new Date();
					const currentHour = now.getHours();
					const currentMinute = now.getMinutes();
					const currentDay = now.getDate();

					// Check if it's the scheduled time
					if (currentHour === hours && currentMinute === minutes) {
						// Only trigger once per day at this time
						if (lastTriggered !== currentDay) {
							Logger.info(
								`Schedule trigger fired at ${scheduledTime}`
							);
							this.onTriggerFire(node, flow.nodes, flow.edges);
							lastTriggered = currentDay;
						}
					}
				}, 5000); // Check every 5 seconds for precision

				Logger.info(`Schedule trigger set for ${scheduledTime} daily`);
				this.activeListeners.set(node.id, {
					type: "interval",
					timer: scheduleChecker,
				});
				break;

			case "net_status":
				// Monitor network status changes (connected/disconnected)
				const targetStatus = params.status || "connected";
				let wasOnline = null;

				const netChecker = setInterval(() => {
					require("dns").lookup("google.com", (err) => {
						const isOnline = !err;

						if (wasOnline === null) {
							wasOnline = isOnline;
							return;
						}

						// Detect change
						if (
							(targetStatus === "connected" &&
								isOnline &&
								!wasOnline) ||
							(targetStatus === "disconnected" &&
								!isOnline &&
								wasOnline)
						) {
							Logger.info(
								`Network status changed to: ${targetStatus}`
							);
							this.onTriggerFire(node, flow.nodes, flow.edges);
						}
						wasOnline = isOnline;
					});
				}, 5000); // Check every 5 seconds

				Logger.info(`Network status trigger set for: ${targetStatus}`);
				this.activeListeners.set(node.id, {
					type: "interval",
					timer: netChecker,
				});
				break;

			case "battery_level":
				// Trigger when battery level drops below threshold
				const threshold = parseInt(params.threshold) || 20;
				let batteryTriggered = false;

				const batteryChecker = setInterval(() => {
					// Use PowerShell to get battery status
					exec(
						'powershell -Command "Get-WmiObject Win32_Battery | Select-Object -ExpandProperty EstimatedChargeRemaining"',
						(err, stdout) => {
							if (err || !stdout.trim()) return;

							const batteryLevel = parseInt(stdout.trim());
							if (!isNaN(batteryLevel)) {
								if (
									batteryLevel <= threshold &&
									!batteryTriggered
								) {
									Logger.info(
										`Battery level (${batteryLevel}%) dropped below threshold (${threshold}%)`
									);
									this.onTriggerFire(
										node,
										flow.nodes,
										flow.edges
									);
									batteryTriggered = true;
								} else if (batteryLevel > threshold) {
									// Reset when battery goes above threshold
									batteryTriggered = false;
								}
							}
						}
					);
				}, 60000); // Check every 60 seconds

				Logger.info(
					`Battery level trigger set for threshold: ${threshold}%`
				);
				this.activeListeners.set(node.id, {
					type: "interval",
					timer: batteryChecker,
				});
				break;

			case "mitm_request":
			case "mitm_response":
				// MITM triggers are handled by MitmController (which needs to be made aware of flow)
				// Here we just register it logically so we don't warn.
				// The MitmController is typically initialized with flows separately.
				Logger.info(
					`MITM trigger registered: ${type}. Execution delegated to MitmController.`
				);
				// We don't set a timer listener, but we track it so we can 'clear' it if needed (though clearing is no-op here)
				this.activeListeners.set(node.id, {
					type: "mitm",
					triggerType: type,
				});
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
