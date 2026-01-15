export const NODE_TYPES = {
	TRIGGER: "trigger",
	CONDITION: "condition",
	ACTION: "action",
};

export const CATEGORIES = {
	SYSTEM: "System",
	TIME: "Time",
	INPUT: "Input",
	FILE: "File",
	POWER: "Power",
	LOGIC: "Logic",
	APP: "App",
	MITM: "Mitm",
};

export const PARAM_TYPES = {
	TEXT: "text",
	PROCESS: "process",
	APP: "app",
	PATH: "path",
	NUMBER: "number",
	SELECT: "select",
};

export const CATALOG = {
	triggers: [
		// Input
		{
			type: "hotkey",
			category: CATEGORIES.INPUT,
			label: "On Hotkey Press",
			icon: "🎹",
			params: { shortcut: "CommandOrControl+Shift+A" },
			paramTypes: { shortcut: PARAM_TYPES.TEXT },
		},
		// File
		{
			type: "file_event",
			category: CATEGORIES.FILE,
			label: "File Changed",
			icon: "📝",
			params: { path: "", event: "change" },
			paramTypes: { path: PARAM_TYPES.PATH, event: PARAM_TYPES.SELECT },
			options: { event: ["change", "rename"] },
		},
		// System
		{
			type: "app_launch",
			category: CATEGORIES.SYSTEM,
			label: "App Launched",
			icon: "🚀",
			params: { processName: "" },
			paramTypes: { processName: PARAM_TYPES.PROCESS },
		},
		{
			type: "app_close",
			category: CATEGORIES.SYSTEM,
			label: "App Closed",
			icon: "🛑",
			params: { processName: "" },
			paramTypes: { processName: PARAM_TYPES.PROCESS },
		},
		{
			type: "window_focus",
			category: CATEGORIES.SYSTEM,
			label: "Window Focused",
			icon: "🪟",
			params: { title: "" },
			paramTypes: { title: PARAM_TYPES.TEXT },
		},
		{
			type: "net_status",
			category: CATEGORIES.SYSTEM,
			label: "Network Change",
			icon: "🌐",
			params: { status: "connected" },
			paramTypes: { status: PARAM_TYPES.SELECT },
			options: { status: ["connected", "disconnected"] },
		},

		// Time
		{
			type: "schedule",
			category: CATEGORIES.TIME,
			label: "Specific Time",
			icon: "⏰",
			params: { time: "09:00" },
			paramTypes: { time: PARAM_TYPES.TEXT },
		},
		{
			type: "interval",
			category: CATEGORIES.TIME,
			label: "Time Interval",
			icon: "⏳",
			params: { minutes: 5 },
			paramTypes: { minutes: PARAM_TYPES.NUMBER },
		},

		// Power
		{
			type: "battery_level",
			category: CATEGORIES.POWER,
			label: "Battery Level",
			icon: "🔋",
			params: { threshold: 20 },
			paramTypes: { threshold: PARAM_TYPES.NUMBER },
		},
		// Mitm
		{
			type: "mitm_request",
			category: CATEGORIES.MITM,
			label: "On Request Intercept",
			icon: "🌐",
			params: {},
			paramTypes: {},
			description:
				"Triggers when an HTTP/HTTPS request is intercepted by the proxy.",
		},
		{
			type: "mitm_response",
			category: CATEGORIES.MITM,
			label: "On Response Intercept",
			icon: "📥",
			params: {},
			paramTypes: {},
			description:
				"Triggers when an HTTP/HTTPS response is intercepted by the proxy.",
		},
	],
	conditions: [
		{
			type: "app_running",
			category: CATEGORIES.APP,
			label: "App is Running",
			icon: "🔍",
			params: { processName: "" },
			paramTypes: { processName: PARAM_TYPES.PROCESS },
		},
		{
			type: "file_exists",
			category: CATEGORIES.FILE,
			label: "File Exists",
			icon: "📁",
			params: { path: "" },
			paramTypes: { path: PARAM_TYPES.PATH },
		},
		{
			type: "clipboard_contains",
			category: CATEGORIES.INPUT,
			label: "Clipboard Contains",
			icon: "📋",
			params: { text: "" },
			paramTypes: { text: PARAM_TYPES.TEXT },
		},

		// Mitm
		{
			type: "mitm_is_running",
			category: CATEGORIES.MITM,
			label: "Proxy is Running",
			icon: "⚙️",
			params: {},
			paramTypes: {},
			description: "Checks if the MITM proxy server is currently active.",
		},
		{
			type: "mitm_url_match",
			category: CATEGORIES.MITM,
			label: "URL Contains",
			icon: "🔗",
			params: { keyword: "api.example.com" },
			paramTypes: { keyword: PARAM_TYPES.TEXT },
			placeholders: { keyword: "e.g. google.com" },
			description:
				"Matches if the intercepted URL contains the specified keyword.",
		},
		{
			type: "mitm_body_match",
			category: CATEGORIES.MITM,
			label: "Body Contains",
			icon: "📄",
			params: { text: '"status":"success"' },
			paramTypes: { text: PARAM_TYPES.TEXT },
			placeholders: { text: 'e.g. {"error": false}' },
			description:
				"Matches if the request/response body contains the specified text.",
		},
		{
			type: "mitm_status_match",
			category: CATEGORIES.MITM,
			label: "Status Code Is",
			icon: "🔢",
			params: { status: 200 },
			paramTypes: { status: PARAM_TYPES.NUMBER },
			placeholders: { status: "e.g. 200, 404, 500" },
			description:
				"Matches if the response status code equals the specified value. Example: 200, 404, 500",
		},
	],
	actions: [
		// System
		{
			type: "set_dns",
			category: CATEGORIES.SYSTEM,
			label: "Set DNS",
			icon: "🔧",
			params: {
				interface: "Wi-Fi",
				primary: "8.8.8.8",
				secondary: "8.8.4.4",
			},
			paramTypes: {
				interface: PARAM_TYPES.TEXT,
				primary: PARAM_TYPES.TEXT,
				secondary: PARAM_TYPES.TEXT,
			},
		},
		{
			type: "system_power",
			category: CATEGORIES.POWER,
			label: "System Power",
			icon: "🔌",
			params: { action: "shutdown" },
			paramTypes: { action: PARAM_TYPES.SELECT },
			options: {
				action: ["shutdown", "restart", "sleep", "lock", "logout"],
			},
		},
		{
			type: "volume_control",
			category: CATEGORIES.SYSTEM,
			label: "Volume Control",
			icon: "🔊",
			params: { action: "set", level: 50 },
			paramTypes: {
				action: PARAM_TYPES.SELECT,
				level: PARAM_TYPES.NUMBER,
			},
			options: { action: ["set", "mute", "unmute"] },
		},
		{
			type: "screenshot",
			category: CATEGORIES.SYSTEM,
			label: "Take Screenshot",
			icon: "📸",
			params: { path: "" }, // Defaults to Pictures folder
			paramTypes: { path: PARAM_TYPES.TEXT },
		},
		// File
		{
			type: "file_op",
			category: CATEGORIES.FILE,
			label: "File Operation",
			icon: "📂",
			params: { operation: "copy", source: "", dest: "" },
			paramTypes: {
				operation: PARAM_TYPES.SELECT,
				source: PARAM_TYPES.TEXT,
				dest: PARAM_TYPES.TEXT,
			},
			options: { operation: ["copy", "move", "delete", "create_folder"] },
		},
		// App
		{
			type: "run_program",
			category: CATEGORIES.APP,
			label: "Run Program",
			icon: "🏃",
			params: { path: "" },
			paramTypes: { path: PARAM_TYPES.APP }, // We'll use APP type to select installed apps
			engine: "node",
		},
		{
			type: "kill_process",
			category: CATEGORIES.APP,
			label: "Kill Process",
			icon: "💀",
			params: { processName: "" },
			paramTypes: { processName: PARAM_TYPES.PROCESS },
			engine: "node",
		},
		{
			type: "close_window",
			category: CATEGORIES.SYSTEM,
			label: "Close Window",
			icon: "❌",
			params: { title: "" },
			paramTypes: { title: PARAM_TYPES.TEXT },
		},
		{
			type: "minimize_window",
			category: CATEGORIES.SYSTEM,
			label: "Minimize Window",
			icon: "➖",
			params: { title: "" },
			paramTypes: { title: PARAM_TYPES.TEXT },
		},
		{
			type: "notification",
			category: CATEGORIES.SYSTEM,
			label: "Show Notification",
			icon: "🔔",
			params: { title: "Winomation", message: "" },
			paramTypes: { title: PARAM_TYPES.TEXT, message: PARAM_TYPES.TEXT },
			engine: "node",
		},
		{
			type: "toast",
			category: CATEGORIES.SYSTEM,
			label: "Show Toast",
			icon: "🍞",
			params: { message: "Hello from Winomation!" },
			paramTypes: { message: PARAM_TYPES.TEXT },
			engine: "node",
		},
		{
			type: "mouse_click",
			category: CATEGORIES.INPUT,
			label: "Mouse Click",
			icon: "🖱️",
			params: { x: 0, y: 0, button: "left" },
			paramTypes: {
				x: PARAM_TYPES.NUMBER,
				y: PARAM_TYPES.NUMBER,
				button: PARAM_TYPES.SELECT,
			},
			options: { button: ["left", "right", "middle"] },
		},
		{
			type: "send_keys",
			category: CATEGORIES.INPUT,
			label: "Send Keys",
			icon: "⌨️",
			params: { keys: "" },
			paramTypes: { keys: PARAM_TYPES.TEXT },
		},

		// Mitm
		{
			type: "mitm_start",
			category: CATEGORIES.MITM,
			label: "Start MITM Proxy",
			icon: "🟢",
			params: { port: 8080, host: "localhost" },
			paramTypes: { port: PARAM_TYPES.NUMBER, host: PARAM_TYPES.TEXT },
			placeholders: { port: "8080", host: "localhost or 0.0.0.0" },
			description:
				"Starts the MITM proxy server. Example: port 8080, host 0.0.0.0",
		},
		{
			type: "mitm_stop",
			category: CATEGORIES.MITM,
			label: "Stop MITM Proxy",
			icon: "🛑",
			params: {},
			paramTypes: {},
			description: "Stops the running MITM proxy server.",
		},
		{
			type: "mitm_generate_cert",
			category: CATEGORIES.MITM,
			label: "Generate Certificate",
			icon: "📜",
			params: {},
			paramTypes: {},
			description:
				"Generates a new Root CA certificate for HTTPS interception.",
		},
		{
			type: "mitm_install_cert",
			category: CATEGORIES.MITM,
			label: "Install Certificate",
			icon: "🛡️",
			params: {},
			paramTypes: {},
			description:
				"Installs the Root CA certificate to the Windows system store.",
		},
		{
			type: "mitm_block",
			category: CATEGORIES.MITM,
			label: "Block Request",
			icon: "🚫",
			params: {},
			paramTypes: {},
			description:
				"Drops the intercepted request and returns a 403 Forbidden error.",
		},
		{
			type: "mitm_modify_body",
			category: CATEGORIES.MITM,
			label: "Replace in Body",
			icon: "✍️",
			params: { search: "old_value", replace: "new_value" },
			paramTypes: { search: PARAM_TYPES.TEXT, replace: PARAM_TYPES.TEXT },
			placeholders: {
				search: "Text to find",
				replace: "New replacement text",
			},
			description:
				"Replaces occurrences of search text with replace text in the body.",
		},
		{
			type: "mitm_set_status",
			category: CATEGORIES.MITM,
			label: "Change Status",
			icon: "⚡",
			params: { status: 200 },
			paramTypes: { status: PARAM_TYPES.NUMBER },
			placeholders: { status: "e.g. 200, 404, 500" },
			description:
				"Changes the response status code. Example: 200, 404, 500",
		},
		{
			type: "mitm_drop_header",
			category: CATEGORIES.MITM,
			label: "Remove Header",
			icon: "✂️",
			params: { header: "Authorization" },
			paramTypes: { header: PARAM_TYPES.TEXT },
			placeholders: { header: "e.g. User-Agent" },
			description:
				"Removes the specified HTTP header from the request/response.",
		},
		{
			type: "mitm_set_json_field",
			category: CATEGORIES.MITM,
			label: "Set JSON Field",
			icon: "🧩",
			params: { path: "user.is_premium", value: "true" },
			paramTypes: { path: PARAM_TYPES.TEXT, value: PARAM_TYPES.TEXT },
			placeholders: { path: "user.role", value: "admin" },
			description:
				"Modifies a field in a JSON body using dot notation for paths.",
		},
	],
};
