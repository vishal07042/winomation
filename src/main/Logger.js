import { BrowserWindow, app } from 'electron';
import fs from 'fs';
import path from 'path';

class Logger {
    constructor() {
        this.logs = [];
        try {
            // userData is available after app is ready or during early bootstrap
            this.logFilePath = path.join(app.getPath('userData'), 'app.log');
        } catch (e) {
            this.logFilePath = 'app.log'; 
        }
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        
        console.log(`[${type.toUpperCase()}] ${message}`);

        this.logs.push(logEntry);
        if (this.logs.length > 500) this.logs.shift();

        const logString = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
        fs.appendFile(this.logFilePath, logString, (err) => {
            if (err) console.error('Failed to write to log file:', err);
        });

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
        try {
            fs.writeFileSync(this.logFilePath, '');
        } catch (e) {}
    }
}

export default new Logger();
