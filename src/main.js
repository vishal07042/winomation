import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import FlowRunner from './main/FlowRunner';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#121212',
    show: false
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

ipcMain.handle('run-flow', async (event, flow) => {
    try {
        await FlowRunner.run(flow);
        return { success: true };
    } catch (err) {
        console.error('Flow execution failed:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('stop-flow', async (event, id) => {
    FlowRunner.stop(id);
    return { success: true };
});

ipcMain.handle('get-system-status', async () => {
    return {
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
    };
});

ipcMain.handle('get-running-processes', async () => {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
        // Get unique process names using PowerShell (more robust than CSV parsing)
        const command = 'powershell -Command "Get-Process | Select-Object -ExpandProperty Name | Sort-Object -Unique | ConvertTo-Json"';
        exec(command, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
            if (err) {
                // Fallback to tasklist
                exec('tasklist /NH /FO CSV', (err2, stdout2) => {
                    if (err2) return resolve([]);
                    const lines = stdout2.split('\n');
                    const processes = [...new Set(lines.map(line => {
                        const parts = line.split(',');
                        return parts[0]?.replace(/"/g, '').trim();
                    }).filter(p => p && p.length > 0))];
                    resolve(processes.sort());
                });
                return;
            }
            try {
                const data = JSON.parse(stdout);
                const processes = Array.isArray(data) ? data : [data];
                // Append .exe to match common expectations, or just keep as name
                resolve(processes.map(p => p.toLowerCase().endsWith('.exe') ? p : `${p}.exe`).sort());
            } catch (e) {
                resolve([]);
            }
        });
    });
});

ipcMain.handle('get-installed-apps', async () => {
    const { exec } = require('child_process');
    // Using PowerShell to get a cleaner list of installed apps
    const psCommand = 'Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName | ToJson';
    const command = `powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName | Where-Object { $_.DisplayName -ne $null } | ConvertTo-Json"`;
    
    return new Promise((resolve) => {
        exec(command, (err, stdout) => {
            if (err) return resolve([]);
            try {
                const data = JSON.parse(stdout);
                const apps = Array.isArray(data) ? data.map(i => i.DisplayName) : [data.DisplayName];
                resolve([...new Set(apps)].sort());
            } catch (e) {
                resolve([]);
            }
        });
    });
});
