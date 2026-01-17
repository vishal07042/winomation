import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { exec } from 'node:child_process';
import started from 'electron-squirrel-startup';
import FlowRunner from './main/FlowRunner';
import Logger from './main/Logger';
import engine from './main/engine';
import { Tray, Menu } from 'electron';





let tray;
let mainWindow;
let isQuitting = false;
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
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


  mainWindow.on("close", (event) => {
		if (!isQuitting) {
			event.preventDefault(); // stop close
			mainWindow.hide(); // hide instead
		}
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

const isDev = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;

const checkAdmin = () => {
  return new Promise((resolve) => {
    exec('net session', (err) => {
      resolve(!err);
    });
  });
};

const setupAutoRun = () => {
  if (!isDev) {
    try {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: app.getPath('exe'),
          name: 'Winomation'
        });
        Logger.info('Auto-run registered for Winomation.');
    } catch (e) {
        Logger.error('Failed to setup auto-run: ' + e.message);
    }
  }
};

app.whenReady().then(async () => {

    const createTray = () => {
        const iconPath = path.join(app.getAppPath(), "assets", "tray.ico");
            tray = new Tray(iconPath); 
            
            
            const menu = Menu.buildFromTemplate([
				{
					label: "Show Winomation",
					click: () => {
						mainWindow.show();
					},
				},
				
			]);
// use .ico on Windows
        

		tray.setToolTip("Winomation");
		tray.setContextMenu(menu);

		// Optional: click tray icon to toggle window
		tray.on("double-click", () => {
			mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
		});
	};

  createTray();



  const isAdmin = await checkAdmin();
  if (!isAdmin && !isDev) {
    Logger.warn('Winomation is not running with administrator privileges. Attempting to relaunch as administrator...');
    try {
        const exePath = app.getPath('exe');
        exec(`powershell -Command "Start-Process '${exePath}' -Verb RunAs"`, (err) => {
            if (!err) app.quit();
        });
        return;
    } catch (e) {
        Logger.error('Failed to relaunch as administrator: ' + e.message);
    }
  } else if (isAdmin) {
    Logger.success('Winomation is running with administrator privileges.');
  }

  setupAutoRun();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // FlowRunner.stopAll();
    // app.quit();
  }
});

app.on("before-quit", (event) => {
	event.preventDefault();
});

app.on('will-quit', () => {
    // FlowRunner.stopAll();
});

// --- Persistence Helpers ---
const WORKFLOWS_DIR = path.join(app.getPath('userData'), 'workflows');

const ensureWorkflowsDir = async () => {
    try {
        await fs.access(WORKFLOWS_DIR);
    } catch {
        await fs.mkdir(WORKFLOWS_DIR, { recursive: true });
    }
};

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

ipcMain.handle('run-action', async (event, node) => {
    try {
        if (node.data.category === 'condition') {
            return await engine.evaluateCondition(node);
        }
        return await engine.executeAction(node);
    } catch (err) {
        console.error('Action execution failed:', err);
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

ipcMain.handle('get-logs', async () => {
    return Logger.getLogs();
});

ipcMain.handle('clear-logs', async () => {
    Logger.clearLogs();
    return { success: true };
});

ipcMain.handle('get-running-processes', async () => {
    return new Promise((resolve) => {
        // Fetch Name and Path. Note: Path might be null for some system processes.
        const command = 'powershell -Command "Get-Process | Select-Object Name, Path | Sort-Object -Unique Name | ConvertTo-Json"';
        exec(command, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
            if (err) {
                // Fallback to tasklist (names only)
                exec('tasklist /NH /FO CSV', (err2, stdout2) => {
                    if (err2) return resolve([]);
                    const lines = stdout2.split('\n');
                    const processes = [...new Set(lines.map(line => {
                        const parts = line.split(',');
                        const name = parts[0]?.replace(/"/g, '').trim();
                        return name;
                    }).filter(p => p && p.length > 0))];
                    // Return as simple strings for fallback
                    resolve(processes.sort());
                });
                return;
            }
            try {
                const data = JSON.parse(stdout);
                const items = Array.isArray(data) ? data : [data];
                
                // Map to { label, value }
                const processes = items.map(item => {
                    const name = item.Name;
                    const path = item.Path;
                    const exeName = name.toLowerCase().endsWith('.exe') ? name : `${name}.exe`;
                    
                    if (path) {
                        return { label: exeName, value: path };
                    } else {
                        return { label: exeName, value: exeName };
                    }
                }).sort((a, b) => a.label.localeCompare(b.label));
                
                resolve(processes);
            } catch (e) {
                resolve([]);
            }
        });
    });
});

ipcMain.handle('get-installed-apps', async () => {
    // Attempt to get DisplayIcon or InstallLocation to find the executable path
    const command = 'powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-ItemProperty HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayIcon, InstallLocation | Where-Object { $_.DisplayName -ne $null } | ConvertTo-Json"';
    
    return new Promise((resolve) => {
        exec(command, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
            if (err) return resolve([]);
            try {
                const data = JSON.parse(stdout);
                const items = Array.isArray(data) ? data : [data];
                
                const apps = items.map(item => {
                    let path = item.DisplayIcon;
                    
                    // Clean up DisplayIcon (e.g., "C:\Path\App.exe,0" -> "C:\Path\App.exe")
                    if (path) {
                        const commaIndex = path.indexOf(',');
                        if (commaIndex > -1) path = path.substring(0, commaIndex);
                        path = path.replace(/"/g, '');
                    }
                    
                    // Fallback to InstallLocation (not perfect, but better than nothing)
                    // Note: InstallLocation is a folder, so we can't easily guess the exe. 
                    // We'll stick to DisplayName as value if path is missing.
                    
                    return {
                        label: item.DisplayName,
                        value: path || item.DisplayName
                    };
                });
                
                // Deduplicate by label
                const uniqueApps = [];
                const seen = new Set();
                for (const app of apps) {
                    if (!seen.has(app.label)) {
                        seen.add(app.label);
                        uniqueApps.push(app);
                    }
                }
                
                resolve(uniqueApps.sort((a, b) => a.label.localeCompare(b.label)));
            } catch (e) {
                resolve([]);
            }
        });
    });
});

// --- Workflow Persistence IPC ---

ipcMain.handle('save-workflow', async (event, { name, flow }) => {
    try {
        await ensureWorkflowsDir();
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(WORKFLOWS_DIR, `${safeName}.json`);
        
        const data = {
            name,
            updatedAt: new Date().toISOString(),
            flow
        };
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-workflows', async () => {
    try {
        await ensureWorkflowsDir();
        const files = await fs.readdir(WORKFLOWS_DIR);
        const workflows = [];
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(WORKFLOWS_DIR, file), 'utf-8');
                const data = JSON.parse(content);
                workflows.push({
                    name: data.name,
                    updatedAt: data.updatedAt,
                    nodeCount: data.flow?.nodes?.length || 0,
                    filename: file
                });
            } catch (e) {
                console.error(`Failed to read workflow ${file}:`, e);
            }
        }
        
        return workflows.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (err) {
        return [];
    }
});

ipcMain.handle('delete-workflow', async (event, name) => {
    try {
        await ensureWorkflowsDir();
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(WORKFLOWS_DIR, `${safeName}.json`);
        await fs.unlink(filePath);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('load-workflow', async (event, name) => {
    try {
        await ensureWorkflowsDir();
        const safeName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filePath = path.join(WORKFLOWS_DIR, `${safeName}.json`);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        return null;
    }
});
