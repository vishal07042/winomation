const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runFlow: (flow) => ipcRenderer.invoke('run-flow', flow),
    runAction: (node) => ipcRenderer.invoke('run-action', node),
    stopFlow: (id) => ipcRenderer.invoke('stop-flow', id),
    getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
    getRunningProcesses: () => ipcRenderer.invoke('get-running-processes'),
    getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
    onLog: (callback) => ipcRenderer.on('new-log', (event, log) => callback(log)),
    getLogs: () => ipcRenderer.invoke('get-logs'),
    clearLogs: () => ipcRenderer.invoke('clear-logs'),
    
    // Persistence
    saveWorkflow: (name, flow) => ipcRenderer.invoke('save-workflow', { name, flow }),
    getWorkflows: () => ipcRenderer.invoke('get-workflows'),
    deleteWorkflow: (name) => ipcRenderer.invoke('delete-workflow', name),
    loadWorkflow: (name) => ipcRenderer.invoke('load-workflow', name),
    installMitmCert: () => ipcRenderer.invoke('install-mitm-cert'),
});
