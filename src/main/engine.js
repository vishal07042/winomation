import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Notification } from 'electron';
import Logger from './Logger';

class AutomationEngine {
    constructor() {
        // Resolve paths relative to the project root
        this.basePath = process.cwd();
        this.ahkExe = path.join(this.basePath, 'AutoHotkey64.exe');
        this.ahkScript = path.join(this.basePath, 'ahk', 'runner.ahk');
    }

    async executeAction(node) {
        const { type, params } = node.data;
        Logger.info(`Executing Action: ${type} with params: ${JSON.stringify(params)}`);

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
                Logger.info(`Waiting for ${params.ms}ms...`);
                return new Promise(r => setTimeout(r, parseInt(params.ms) || 1000));
            case 'close_window':
            case 'minimize_window':
                return this.invokeAHK(`window_${type.split('_')[0]}`, params);
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
            if (err) Logger.error('Failed to run program: ' + err.message);
        });
        return { success: true };
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
        // Pass params as individual arguments to avoid complex JSON quoting issues in CMD
        const args = [type];
        if (type === 'send_keys') args.push(params.keys);
        else if (type === 'mouse_click') args.push(params.x, params.y, params.button);
        else if (type === 'window_move') args.push(params.title, params.x, params.y, params.w, params.h);
        else if (type === 'window_close' || type === 'window_minimize') args.push(params.title);

        const argString = args.map(a => `"${a}"`).join(' ');
        
        return new Promise((resolve) => {
            const command = `"${this.ahkExe}" "${this.ahkScript}" ${argString}`;
            Logger.info(`Running command: ${command}`);
            
            exec(command, (err, stdout) => {
                if (err) {
                    Logger.error(`AutoHotkey failed to launch. Path: ${this.ahkExe}. Error: ${err.message}`);
                    resolve({ success: false, error: err.message });
                    return;
                }
                Logger.success(`AHK Action ${type} executed.`);
                resolve({ success: true });
            });
        });
    }
}

const engineInstance = new AutomationEngine();
export default engineInstance;
