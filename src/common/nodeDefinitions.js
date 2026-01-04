export const NODE_TYPES = {
    TRIGGER: 'trigger',
    CONDITION: 'condition',
    ACTION: 'action'
};

export const CATEGORIES = {
    SYSTEM: 'System',
    TIME: 'Time',
    INPUT: 'Input',
    FILE: 'File',
    POWER: 'Power',
    LOGIC: 'Logic',
    APP: 'App'
};

export const PARAM_TYPES = {
    TEXT: 'text',
    PROCESS: 'process',
    APP: 'app',
    PATH: 'path',
    NUMBER: 'number',
    SELECT: 'select'
};

export const CATALOG = {
    triggers: [
        // System
        { 
            type: 'app_launch', 
            category: CATEGORIES.SYSTEM, 
            label: 'App Launched', 
            icon: '🚀', 
            params: { processName: '' },
            paramTypes: { processName: PARAM_TYPES.PROCESS }
        },
        { 
            type: 'app_close', 
            category: CATEGORIES.SYSTEM, 
            label: 'App Closed', 
            icon: '🛑', 
            params: { processName: '' },
            paramTypes: { processName: PARAM_TYPES.PROCESS }
        },
        { 
            type: 'window_focus', 
            category: CATEGORIES.SYSTEM, 
            label: 'Window Focused', 
            icon: '🪟', 
            params: { title: '' },
            paramTypes: { title: PARAM_TYPES.TEXT }
        },
        { 
            type: 'window_title_contains', 
            category: CATEGORIES.SYSTEM, 
            label: 'Window Title Contains', 
            icon: '🔍', 
            params: { word: '' },
            paramTypes: { word: PARAM_TYPES.TEXT }
        },
        { 
            type: 'net_status', 
            category: CATEGORIES.SYSTEM, 
            label: 'Network Change', 
            icon: '🌐', 
            params: { status: 'connected' },
            paramTypes: { status: PARAM_TYPES.SELECT },
            options: { status: ['connected', 'disconnected'] }
        },
        
        // Time
        { 
            type: 'schedule', 
            category: CATEGORIES.TIME, 
            label: 'Specific Time', 
            icon: '⏰', 
            params: { time: '09:00' },
            paramTypes: { time: PARAM_TYPES.TEXT }
        },
        { 
            type: 'interval', 
            category: CATEGORIES.TIME, 
            label: 'Time Interval', 
            icon: '⏳', 
            params: { minutes: 5 },
            paramTypes: { minutes: PARAM_TYPES.NUMBER }
        },
        
        // Power
        { 
            type: 'battery_low', 
            category: CATEGORIES.POWER, 
            label: 'Battery Low', 
            icon: '🔋', 
            params: { threshold: 20 },
            paramTypes: { threshold: PARAM_TYPES.NUMBER }
        }
    ],
    conditions: [
        { 
            type: 'app_running', 
            category: CATEGORIES.APP, 
            label: 'App is Running', 
            icon: '🔍', 
            params: { processName: '' },
            paramTypes: { processName: PARAM_TYPES.PROCESS }
        },
        { 
            type: 'file_exists', 
            category: CATEGORIES.FILE, 
            label: 'File Exists', 
            icon: '📁', 
            params: { path: '' },
            paramTypes: { path: PARAM_TYPES.PATH }
        }
    ],
    actions: [
        { 
            type: 'run_program', 
            category: CATEGORIES.APP, 
            label: 'Run Program', 
            icon: '🏃', 
            params: { path: '' }, 
            paramTypes: { path: PARAM_TYPES.APP }, // We'll use APP type to select installed apps
            engine: 'node' 
        },
        { 
            type: 'kill_process', 
            category: CATEGORIES.APP, 
            label: 'Kill Process', 
            icon: '💀', 
            params: { processName: '' }, 
            paramTypes: { processName: PARAM_TYPES.PROCESS },
            engine: 'node' 
        },
        { 
            type: 'close_window', 
            category: CATEGORIES.SYSTEM, 
            label: 'Close Window', 
            icon: '❌', 
            params: { title: '' }, 
            paramTypes: { title: PARAM_TYPES.TEXT }
        },
        { 
            type: 'minimize_window', 
            category: CATEGORIES.SYSTEM, 
            label: 'Minimize Window', 
            icon: '➖', 
            params: { title: '' }, 
            paramTypes: { title: PARAM_TYPES.TEXT }
        },
        { 
            type: 'notification', 
            category: CATEGORIES.SYSTEM, 
            label: 'Show Notification', 
            icon: '🔔', 
            params: { title: 'Winomation', message: '' }, 
            paramTypes: { title: PARAM_TYPES.TEXT, message: PARAM_TYPES.TEXT },
            engine: 'node' 
        }
    ]
};
