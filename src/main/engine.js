const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { shell, Notification } = require('electron');

class AutomationEngine {
    constructor() {
        this.ahkPath = path.join(__dirname, '../ahk/runner.ahk');
    }

    async executeAction(node) {
        const { type, params } = node.data;
        console.log(`[Engine] Executing Action: ${type}`);

        switch (type) {
            case 'notification':
                return this.showNotification(params);
            case 'kill_process':
                return this.nodeKill(params);
            case 'run_program':
                return this.runProgram(params);
            case 'http_request':
                return this.httpRequest(params);
            case 'delay':
                return new Promise(r => setTimeout(r, parseInt(params.ms) || 1000));
            case 'send_keys':
            case 'mouse_click':
            case 'window_move':
                return this.invokeAHK(type, params);
            default:
                console.warn(`Action type ${type} not fully implemented yet.`);
                return { success: false, error: 'Not implemented' };
        }
    }

    async evaluateCondition(node) {
        const { type, params } = node.data;
        console.log(`[Engine] Checking Condition: ${type}`);

        switch (type) {
            case 'app_running':
                return this.checkProcess(params.processName);
            case 'file_exists':
                return fs.existsSync(params.path);
            case 'internet_reachable':
                return this.checkInternet();
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

    runProgram(params) {
        exec(`"${params.path}"`, (err) => {
            if (err) console.error('Failed to run program:', err);
        });
        return { success: true };
    }

    async httpRequest(params) {
        try {
            // Using dynamic import for cross-platform compatibility if needed, 
            // but for simplicity in this project we assume node environment.
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

    async checkInternet() {
        return new Promise((resolve) => {
            exec('ping -n 1 8.8.8.8', (err) => resolve(!err));
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
        const payload = JSON.stringify({ type, ...params }).replace(/"/g, '\"');
        return new Promise((resolve) => {
            // Note: Users must have AutoHotkey installed and in PATH
            exec(`AutoHotkey.exe "${this.ahkPath}" "${payload}"`, (err, stdout) => {
                try { resolve(JSON.parse(stdout)); } catch (e) { resolve({ success: true }); }
            });
        });
    }
}

module.exports = new AutomationEngine();
