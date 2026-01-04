const { exec } = require('child_process');

class TriggerManager {
    constructor(onTriggerFire) {
        this.onTriggerFire = onTriggerFire;
        this.activeListeners = new Map();
    }

    register(node, flow) {
        const { type, params } = node.data;
        console.log(`[TriggerManager] Registering: ${type}`);

        switch (type) {
            case 'interval':
                const timer = setInterval(() => {
                    this.onTriggerFire(node, flow.nodes, flow.edges);
                }, params.minutes * 60 * 1000);
                this.activeListeners.set(node.id, timer);
                break;
            
            case 'app_launch':
                const procName = params.processName.toLowerCase().endsWith('.exe') ? params.processName : `${params.processName}.exe`;
                const poll = setInterval(() => {
                    exec(`tasklist /FI "IMAGENAME eq ${procName}"`, (err, stdout) => {
                        if (stdout.toLowerCase().includes(procName.toLowerCase())) {
                            this.onTriggerFire(node, flow.nodes, flow.edges);
                        }
                    });
                }, 5000);
                this.activeListeners.set(node.id, poll);
                break;
            
            case 'window_focus':
                // For window titles, we use a slightly faster polling for better UX
                const winPoll = setInterval(() => {
                    // This is a simplified check; in a full app we'd use a native helper for focused window
                    exec(`powershell -Command "Get-Process | Where-Object {$_.MainWindowTitle -like '*${params.title}*'} | Select-Object -Property MainWindowTitle"`, (err, stdout) => {
                        if (stdout.trim().length > 0) {
                            this.onTriggerFire(node, flow.nodes, flow.edges);
                        }
                    });
                }, 3000);
                this.activeListeners.set(node.id, winPoll);
                break;
            
            default:
                console.warn(`Trigger type ${type} Registration not fully implemented`);
        }
    }

    clear(nodeId) {
        if (this.activeListeners.has(nodeId)) {
            clearInterval(this.activeListeners.get(nodeId));
            this.activeListeners.delete(nodeId);
        }
    }
}

module.exports = TriggerManager;
