const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runFlow: (flow) => ipcRenderer.invoke('run-flow', flow),
    stopFlow: (id) => ipcRenderer.invoke('stop-flow', id),
    getSystemStatus: () => ipcRenderer.invoke('get-system-status'),
    getRunningProcesses: () => ipcRenderer.invoke('get-running-processes'),
    getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
    onLog: (callback) => ipcRenderer.on('new-log', (event, log) => callback(log)),
    getLogs: () => ipcRenderer.invoke('get-logs'),
    clearLogs: () => ipcRenderer.invoke('clear-logs'),
});
