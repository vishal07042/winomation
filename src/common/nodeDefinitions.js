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
        // Input
        {
            type: 'hotkey',
            category: CATEGORIES.INPUT,
            label: 'On Hotkey Press',
            icon: '🎹',
            params: { shortcut: 'CommandOrControl+Shift+A' },
            paramTypes: { shortcut: PARAM_TYPES.TEXT }
        },
        // File
        {
            type: 'file_event',
            category: CATEGORIES.FILE,
            label: 'File Changed',
            icon: '📝',
            params: { path: '', event: 'change' },
            paramTypes: { path: PARAM_TYPES.PATH, event: PARAM_TYPES.SELECT },
            options: { event: ['change', 'rename'] }
        },
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
        },
        {
            type: 'clipboard_contains',
            category: CATEGORIES.INPUT,
            label: 'Clipboard Contains',
            icon: '📋',
            params: { text: '' },
            paramTypes: { text: PARAM_TYPES.TEXT }
        },
        {
            type: 'is_online',
            category: CATEGORIES.SYSTEM,
            label: 'Is Online',
            icon: '📶',
            params: {},
            paramTypes: {}
        }
    ],
    actions: [
        // System
        {
            type: 'set_dns',
            category: CATEGORIES.SYSTEM,
            label: 'Set DNS',
            icon: '🔧',
            params: { interface: 'Wi-Fi', primary: '8.8.8.8', secondary: '8.8.4.4' },
            paramTypes: { interface: PARAM_TYPES.TEXT, primary: PARAM_TYPES.TEXT, secondary: PARAM_TYPES.TEXT }
        },
        {
            type: 'system_power',
            category: CATEGORIES.POWER,
            label: 'System Power',
            icon: '🔌',
            params: { action: 'shutdown' },
            paramTypes: { action: PARAM_TYPES.SELECT },
            options: { action: ['shutdown', 'restart', 'sleep', 'lock', 'logout'] }
        },
        {
            type: 'volume_control',
            category: CATEGORIES.SYSTEM,
            label: 'Volume Control',
            icon: '🔊',
            params: { action: 'set', level: 50 },
            paramTypes: { action: PARAM_TYPES.SELECT, level: PARAM_TYPES.NUMBER },
            options: { action: ['set', 'mute', 'unmute'] }
        },
        {
            type: 'screenshot',
            category: CATEGORIES.SYSTEM,
            label: 'Take Screenshot',
            icon: '📸',
            params: { path: 'C:\\screenshot.png' },
            paramTypes: { path: PARAM_TYPES.TEXT }
        },
        // File
        {
            type: 'file_op',
            category: CATEGORIES.FILE,
            label: 'File Operation',
            icon: '📂',
            params: { operation: 'copy', source: '', dest: '' },
            paramTypes: { operation: PARAM_TYPES.SELECT, source: PARAM_TYPES.TEXT, dest: PARAM_TYPES.TEXT },
            options: { operation: ['copy', 'move', 'delete', 'create_folder'] }
        },
        // App
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
        },
        { 
            type: 'toast', 
            category: CATEGORIES.SYSTEM, 
            label: 'Show Toast', 
            icon: '🍞', 
            params: { message: 'Hello from Winomation!' }, 
            paramTypes: { message: PARAM_TYPES.TEXT },
            engine: 'node' 
        },
        {
            type: 'mouse_click',
            category: CATEGORIES.INPUT,
            label: 'Mouse Click',
            icon: '🖱️',
            params: { x: 0, y: 0, button: 'left' },
            paramTypes: { x: PARAM_TYPES.NUMBER, y: PARAM_TYPES.NUMBER, button: PARAM_TYPES.SELECT },
            options: { button: ['left', 'right', 'middle'] }
        },
        {
            type: 'send_keys',
            category: CATEGORIES.INPUT,
            label: 'Send Keys',
            icon: '⌨️',
            params: { keys: '' },
            paramTypes: { keys: PARAM_TYPES.TEXT }
        },
        {
            type: 'set_clipboard',
            category: CATEGORIES.INPUT,
            label: 'Set Clipboard',
            icon: '📋',
            params: { text: '' },
            paramTypes: { text: PARAM_TYPES.TEXT }
        }
    ]
};
