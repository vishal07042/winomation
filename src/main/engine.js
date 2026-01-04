import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { app, Notification, BrowserWindow, screen } from 'electron';
import Logger from './Logger';

class AutomationEngine {
    constructor() {
        // In dev, the script is at the project root. 
        // In production, we'll need to adjust this depending on packaging, 
        // but for development, process.cwd() is usually the project root.
        this.basePath = app.isPackaged ? path.join(process.resourcesPath, 'app') : process.cwd();
        this.ahkPath = path.join(this.basePath, 'ahk', 'runner.ahk');
    }

    async executeAction(node) {
        const { type, params } = node.data;
        Logger.info(`Executing Action: ${type} with params: ${JSON.stringify(params)}`);

        switch (type) {
            case 'notification':
                return this.showNotification(params);
            case 'toast':
                return this.showToast(params);
            case 'kill_process':
                return this.nodeKill(params);
            case 'run_program':
                return this.runProgram(params);
            case 'http_request':
                return this.httpRequest(params);
            case 'delay':
                Logger.info(`Waiting for ${params.ms}ms...`);
                return new Promise(r => setTimeout(r, parseInt(params.ms) || 1000));
            case 'close_window':
            case 'minimize_window':
            case 'send_keys':
            case 'mouse_click':
            case 'window_move':
                return this.invokeAHK(type, params);
            default:
                Logger.warn(`Action type ${type} not fully implemented yet.`);
                return { success: false, error: 'Not implemented' };
        }
    }

    async evaluateCondition(node) {
        const { type, params } = node.data;
        Logger.info(`Checking Condition: ${type}`);

        switch (type) {
            case 'app_running':
                return this.checkProcess(params.processName);
            case 'file_exists':
                return fs.existsSync(params.path);
            default:
                return true;
        }
    }

    // --- Implementations ---
    showNotification(params) {
        if (Notification.isSupported()) {
            new Notification({ title: params.title, body: params.message }).show();
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
                contextIsolation: true
            }
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

        toast.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        toast.once('ready-to-show', () => {
            toast.show();
            setTimeout(() => {
                if (!toast.isDestroyed()) toast.close();
            }, 5000);
        });

        return { success: true };
    }

    runProgram(params) {
        return this.invokeAHK('run_program', params);
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
        const payload = JSON.stringify({ type, ...params }).replace(/"/g, '\\"');
        const ahkExe = path.join(this.basePath, 'AutoHotkey64.exe');
        return new Promise((resolve) => {
            exec(`"${ahkExe}" "${this.ahkPath}" "${payload}"`, (err, stdout) => {
                try { 
                    const result = JSON.parse(stdout);
                    resolve(result); 
                } catch (e) { 
                    resolve({ success: true }); 
                }
            });
        });
    }
}

export default new AutomationEngine();
