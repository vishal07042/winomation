import { exec } from 'child_process';
import { globalShortcut } from 'electron';
import fs from 'fs';
import Logger from './Logger';

class TriggerManager {
    constructor(onTriggerFire) {
        this.onTriggerFire = onTriggerFire;
        this.activeListeners = new Map();
    }

    register(node, flow) {
        // Ensure any existing listener for this node is cleared first
        this.clear(node.id);

        const { type, params } = node.data;
        Logger.info(`Registering Trigger: ${type}`);

        switch (type) {
            case 'interval':
                const timer = setInterval(() => {
                    this.onTriggerFire(node, flow.nodes, flow.edges);
                }, params.minutes * 60 * 1000);
                this.activeListeners.set(node.id, { type: 'interval', timer });
                break;
            
            case 'app_launch':
                const procName = params.processName.toLowerCase().endsWith('.exe') ? params.processName : `${params.processName}.exe`;
                const poll = setInterval(() => {
                    exec(`tasklist /FI "IMAGENAME eq ${procName}"`, (err, stdout) => {
                        if (stdout.toLowerCase().includes(procName.toLowerCase())) {
                            // Check if already fired recently? For now, simplistic.
                            this.onTriggerFire(node, flow.nodes, flow.edges);
                        }
                    });
                }, 5000);
                this.activeListeners.set(node.id, { type: 'interval', timer: poll });
                break;
            
            case 'window_focus':
                const winPoll = setInterval(() => {
                    exec(`powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like '*${params.title}*'} | Select-Object -Property MainWindowTitle"`, (err, stdout) => {
                        if (stdout.trim().length > 0) {
                            this.onTriggerFire(node, flow.nodes, flow.edges);
                        }
                    });
                }, 3000);
                this.activeListeners.set(node.id, { type: 'interval', timer: winPoll });
                break;

            case 'hotkey':
                try {
                    const ret = globalShortcut.register(params.shortcut, () => {
                        Logger.info(`Hotkey triggered: ${params.shortcut}`);
                        this.onTriggerFire(node, flow.nodes, flow.edges);
                    });
                    if (!ret) {
                        Logger.error(`Failed to register hotkey: ${params.shortcut}`);
                    }
                    this.activeListeners.set(node.id, { type: 'hotkey', shortcut: params.shortcut });
                } catch (e) {
                    Logger.error(`Error registering hotkey ${params.shortcut}: ${e.message}`);
                }
                break;

            case 'file_event':
                try {
                    if (fs.existsSync(params.path)) {
                        const watcher = fs.watch(params.path, (eventType, filename) => {
                            if (eventType === params.event) {
                                Logger.info(`File event detected: ${eventType} on ${filename}`);
                                this.onTriggerFire(node, flow.nodes, flow.edges);
                            }
                        });
                        this.activeListeners.set(node.id, { type: 'fs', watcher });
                    } else {
                        Logger.error(`File path not found for trigger: ${params.path}`);
                    }
                } catch (e) {
                    Logger.error(`Error registering file watcher: ${e.message}`);
                }
                break;
            
            default:
                Logger.warn(`Trigger type ${type} registration not fully implemented.`);
        }
    }

    clear(nodeId) {
        if (this.activeListeners.has(nodeId)) {
            const listener = this.activeListeners.get(nodeId);
            if (listener.type === 'interval') {
                clearInterval(listener.timer);
            } else if (listener.type === 'hotkey') {
                globalShortcut.unregister(listener.shortcut);
            } else if (listener.type === 'fs') {
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
