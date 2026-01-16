import { exec, execFile } from "child_process";
import path from "path";
import fs from "fs";
import { app, Notification, BrowserWindow, screen, clipboard } from "electron";
import Logger from "./Logger";
import MitmController from "../MitmEngine/MitmController";

class AutomationEngine {
	constructor() {
		// In dev, the script is at the project root.
		// In production, we'll need to adjust this depending on packaging,
		// but for development, process.cwd() is usually the project root.
		this.basePath = app.isPackaged
			? path.join(process.resourcesPath, "app")
			: process.cwd();
		this.ahkPath = path.join(this.basePath, "ahk", "runner.ahk");
	}

	async executeAction(node) {
		const { type, params } = node.data;
		Logger.info(
			`Executing Action: ${type} with params: ${JSON.stringify(params)}`
		);

		try {
			switch (type) {
				case "notification":
					return this.showNotification(params);
				case "toast":
					return this.showToast(params);
				case "kill_process":
					return this.nodeKill(params);
				case "run_program":
					return this.runProgram(params);
				case "http_request":
					return this.httpRequest(params);
				case "delay":
					Logger.info(`Waiting for ${params.ms}ms...`);
					return new Promise((r) =>
						setTimeout(r, parseInt(params.ms) || 1000)
					);
				case "close_window":
				case "minimize_window":
				case "send_keys":
				case "mouse_click":
				case "window_move":
				case "volume_control":
					return this.invokeAHK(type, params);
				case "screenshot":
					return this.takeScreenshot(params);
				case "set_clipboard":
					clipboard.writeText(params.text);
					return { success: true };
				case "set_dns":
					return this.setDNS(params);
				case "system_power":
					return this.systemPower(params);
				case "file_op":
					return this.fileOperation(params);
				case "mitm_start":
				case "mitm_stop":
				case "mitm_generate_cert":
				case "mitm_install_cert":
					return MitmController.executeMitmAction(
						{ data: { type, params } },
						null,
						"main"
					);
				default:
					Logger.warn(
						`Action type ${type} not fully implemented yet.`
					);
					return { success: false, error: "Not implemented" };
			}
		} catch (error) {
			Logger.error(`Error executing action ${type}: ${error.message}`);
			return { success: false, error: error.message };
		}
	}

	async evaluateCondition(node) {
		const { type, params } = node.data;
		Logger.info(`Checking Condition: ${type}`);

		try {
			switch (type) {
				case "app_running":
					return this.checkProcess(params.processName);
				case "file_exists":
					return fs.existsSync(params.path);
				case "clipboard_contains":
					return this.checkClipboard(params.text);
				case "is_online":
					return this.checkOnline();
				case "mitm_is_running":
					return MitmController.isRunning;
				default:
					return true;
			}
		} catch (error) {
			Logger.error(
				`Error evaluating condition ${type}: ${error.message}`
			);
			return false;
		}
	}

	// --- Implementations ---

	async takeScreenshot(params) {
		const filePath =
			params.path ||
			path.join(app.getPath("pictures"), `screenshot_${Date.now()}.png`);
		// Ensure directory exists
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			await fs.promises.mkdir(dir, { recursive: true });
		}

		const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$Screen = [System.Windows.Forms.Screen]::PrimaryScreen
$Width = $Screen.Bounds.Width
$Height = $Screen.Bounds.Height
$Bitmap = New-Object System.Drawing.Bitmap $Width, $Height
$Graphic = [System.Drawing.Graphics]::FromImage($Bitmap)
$Graphic.CopyFromScreen($Screen.Bounds.X, $Screen.Bounds.Y, 0, 0, $Bitmap.Size)
$Bitmap.Save('${filePath}')
        `;

		const command = `powershell -Command "${psScript.replace(/\n/g, ";")}"`;

		return new Promise((resolve) => {
			exec(command, (err) => {
				if (err) {
					const msg = err.message;
					if (msg.includes("GDI+") || msg.includes("Generic error")) {
						Logger.error(
							`Screenshot failed: Permission denied or invalid path. Try a user folder like 'C:\\Users\\You\\Pictures'.`
						);
						resolve({
							success: false,
							error: "Permission denied or invalid path. System blocked saving to this location.",
						});
					} else {
						Logger.error(`Screenshot failed: ${msg}`);
						resolve({ success: false, error: msg });
					}
				} else {
					Logger.info(`Screenshot saved to ${filePath}`);
					resolve({ success: true, path: filePath });
				}
			});
		});
	}

	async setDNS(params) {
		// Requires admin privileges usually.
		// Interface Name e.g. "Wi-Fi"
		const iface = params.interface || "Wi-Fi";
		const primary = params.primary || "8.8.8.8";
		const secondary = params.secondary || "8.8.4.4";

		const cmd = `netsh interface ip set dns name="${iface}" static ${primary} && netsh interface ip add dns name="${iface}" ${secondary} index=2`;

		return new Promise((resolve) => {
			exec(cmd, (err) => {
				if (err) {
					Logger.error(`Failed to set DNS: ${err.message}`);
					resolve({ success: false, error: err.message });
				} else {
					resolve({ success: true });
				}
			});
		});
	}

	async systemPower(params) {
		let cmd = "";
		switch (params.action) {
			case "shutdown":
				// /s = shutdown, /f = force close apps, /t 0 = 0 seconds delay
				cmd = "shutdown /s /f /t 0";
				break;
			case "restart":
				// /r = restart, /f = force close apps, /t 0 = 0 seconds delay
				cmd = "shutdown /r /f /t 0";
				break;
			case "sleep":
				// Using PowerShell's .NET method for reliable sleep (not hibernate or shutdown)
				cmd =
					'powershell -Command "Add-Type -Assembly System.Windows.Forms; [System.Windows.Forms.Application]::SetSuspendState([System.Windows.Forms.PowerState]::Suspend, $false, $false)"';
				break;
			case "lock":
				// Lock the workstation immediately
				cmd = "rundll32.exe user32.dll,LockWorkStation";
				break;
			case "logout":
				// /l = logoff current user
				cmd = "shutdown /l";
				break;
		}

		if (!cmd) {
			Logger.warn(`Invalid system power action: ${params.action}`);
			return { success: false, error: "Invalid action" };
		}

		Logger.info(`Executing system power action: ${params.action}`);

		return new Promise((resolve) => {
			exec(cmd, (err, stdout, stderr) => {
				if (err) {
					Logger.error(
						`System power action '${params.action}' failed: ${err.message}`
					);
					resolve({ success: false, error: err.message });
				} else {
					Logger.info(
						`System power action '${params.action}' executed successfully`
					);
					resolve({ success: true });
				}
			});
		});
	}

	async fileOperation(params) {
		try {
			switch (params.operation) {
				case "copy":
					await fs.promises.copyFile(params.source, params.dest);
					break;
				case "move":
					await fs.promises.rename(params.source, params.dest);
					break;
				case "delete":
					await fs.promises.unlink(params.source);
					break;
				case "create_folder":
					await fs.promises.mkdir(params.source, { recursive: true });
					break;
			}
			return { success: true };
		} catch (e) {
			return { success: false, error: e.message };
		}
	}

	async checkClipboard(text) {
		// Using electron clipboard
		const currentText = clipboard.readText();
		return currentText.includes(text);
	}

	async checkOnline() {
		// Simple check
		return new Promise((resolve) => {
			require("dns").lookup("google.com", (err) => {
				resolve(!err);
			});
		});
	}

	showNotification(params) {
		if (Notification.isSupported()) {
			new Notification({
				title: params.title,
				body: params.message,
			}).show();
			return { success: true };
		}
		return { success: false };
	}

	showToast(params) {
		const { width, height } = screen.getPrimaryDisplay().workAreaSize;

		const toast = new BrowserWindow({
			width: 350,
			height: 80,
			x: width - 370,
			y: height - 100,
			frame: false,
			transparent: true,
			alwaysOnTop: true,
			skipTaskbar: true,
			show: false,
			focusable: false,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
			},
		});

		const html = `
            <html>
                <body style="margin: 0; padding: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; height: 100%;">
                    <div style="
                        background: rgba(30, 30, 30, 0.95);
                        color: white;
                        padding: 15px 25px;
                        border-radius: 12px;
                        font-family: 'Segoe UI', sans-serif;
                        font-size: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        animation: slideIn 0.3s ease-out;
                    ">
                        <span style="font-size: 20px;">ℹ️</span>
                        <div>${params.message}</div>
                    </div>
                    <style>
                        @keyframes slideIn {
                            from { transform: translateX(100%); opacity: 0; }
                            to { transform: translateX(0); opacity: 1; }
                        }
                    </style>
                </body>
            </html>
        `;

		toast.loadURL(
			`data:text/html;charset=utf-8,${encodeURIComponent(html)}`
		);
		toast.once("ready-to-show", () => {
			toast.show();
			setTimeout(() => {
				if (!toast.isDestroyed()) toast.close();
			}, 5000);
		});

		return { success: true };
	}

	runProgram(params) {
		return this.invokeAHK("run_program", params);
	}

	async httpRequest(params) {
		try {
			const response = await fetch(params.url, { method: params.method });
			return await response.json();
		} catch (e) {
			return { error: e.message };
		}
	}

	async checkProcess(name) {
		return new Promise((resolve) => {
			exec(`tasklist /FI "IMAGENAME eq ${name}"`, (err, stdout) => {
				resolve(stdout.includes(name));
			});
		});
	}

	async nodeKill(params) {
		return new Promise((resolve) => {
			exec(`taskkill /F /IM ${params.processName}`, (err) => {
				resolve({ success: !err });
			});
		});
	}

	async invokeAHK(type, params) {
		const payload = JSON.stringify({ type, ...params });
		const ahkExe = path.join(this.basePath, "AutoHotkey64.exe");

		if (!fs.existsSync(ahkExe)) {
			Logger.error(`AHK Executable not found at: ${ahkExe}`);
			return {
				success: false,
				error: `AHK Executable not found at: ${ahkExe}`,
			};
		}

		Logger.info(`Invoking AHK: ${ahkExe} with payload: ${payload}`);

		return new Promise((resolve) => {
			execFile(
				ahkExe,
				["/ErrorStdOut", this.ahkPath, payload],
				(err, stdout, stderr) => {
					if (err) {
						Logger.error(`AHK execution error: ${err.message}`);
						if (stderr) Logger.error(`AHK stderr: ${stderr}`);
						resolve({ success: false, error: err.message });
						return;
					}

					try {
						const result = JSON.parse(stdout);
						resolve(result);
					} catch (e) {
						Logger.warn(`AHK output was not valid JSON: ${stdout}`);
						resolve({ success: true, rawOutput: stdout });
					}
				}
			);
		});
	}
}

export default new AutomationEngine();
