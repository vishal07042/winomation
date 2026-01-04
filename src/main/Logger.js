import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';

class Logger {
    constructor() {
        this.logs = [];
        // Delay log file path initialization if app is not ready, though userData should be available
        try {
            this.logFilePath = path.join(app.getPath('userData'), 'app.log');
        } catch (e) {
            this.logFilePath = 'app.log'; // Fallback
        }
        console.log(`[Logger] Log file at: ${this.logFilePath}`);
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        
        // Console log
        console.log(`[${type.toUpperCase()}] ${message}`);

        // Memory log (limited to 500 entries)
        this.logs.push(logEntry);
        if (this.logs.length > 500) this.logs.shift();

        // File log
        const logString = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
        fs.appendFile(this.logFilePath, logString, (err) => {
            if (err) console.error('Failed to write to log file:', err);
        });

        // Send to renderer if window exists
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
            windows[0].webContents.send('new-log', logEntry);
        }
    }

    info(message) { this.log(message, 'info'); }
    warn(message) { this.log(message, 'warn'); }
    error(message) { this.log(message, 'error'); }
    success(message) { this.log(message, 'success'); }

    getLogs() {
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
        fs.writeFile(this.logFilePath, '', () => {});
    }
}

const loggerInstance = new Logger();
export default loggerInstance;
