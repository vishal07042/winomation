import { exec } from 'child_process';
import Logger from './Logger';

class TriggerManager {
    constructor(onTriggerFire) {
        this.onTriggerFire = onTriggerFire;
        this.activeListeners = new Map();
    }

    register(node, flow) {
        const { type, params } = node.data;
        Logger.info(`Registering Trigger: ${type} with params: ${JSON.stringify(params)}`);

        switch (type) {
            case 'interval':
                const timer = setInterval(() => {
                    Logger.info(`Interval trigger fired for node ${node.id}`);
                    this.onTriggerFire(node, flow.nodes, flow.edges);
                }, params.minutes * 60 * 1000);
                this.activeListeners.set(node.id, timer);
                break;
            
            case 'app_launch':
                const procName = params.processName.toLowerCase().endsWith('.exe') ? params.processName : `${params.processName}.exe`;
                const poll = setInterval(() => {
                    exec(`tasklist /FI "IMAGENAME eq ${procName}"`, (err, stdout) => {
                        if (stdout.toLowerCase().includes(procName.toLowerCase())) {
                            Logger.info(`App launch detected: ${procName}`);
                            this.onTriggerFire(node, flow.nodes, flow.edges);
                        }
                    });
                }, 5000);
                this.activeListeners.set(node.id, poll);
                break;
            
            case 'window_focus':
            case 'window_title_contains':
                // For window titles, we use a slightly faster polling for better UX
                const targetTitle = type === 'window_title_contains' ? params.word : params.title;
                const winPoll = setInterval(() => {
                    // Use PowerShell to get window titles
                    const cmd = `powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like '*${targetTitle}*'} | Select-Object -Property MainWindowTitle"`;
                    exec(cmd, (err, stdout) => {
                        if (stdout.trim().length > 0) {
                            Logger.info(`Window title match detected: ${targetTitle}`);
                            this.onTriggerFire(node, flow.nodes, flow.edges);
                        }
                    });
                }, 3000);
                this.activeListeners.set(node.id, winPoll);
                break;
            
            default:
                Logger.warn(`Trigger type ${type} Registration not fully implemented`);
        }
    }

    clear(nodeId) {
        if (this.activeListeners.has(nodeId)) {
            clearInterval(this.activeListeners.get(nodeId));
            this.activeListeners.delete(nodeId);
        }
    }
}

export default TriggerManager;
