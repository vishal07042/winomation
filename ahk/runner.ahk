#Requires AutoHotkey v2.0
SetWorkingDir A_ScriptDir

if A_Args.Length < 1
    ExitApp

payload := A_Args[1]

try {
    if InStr(payload, '"type":"send_keys"') {
        if RegExMatch(payload, '"keys":"([^"]+)"', &match) {
            Send(match[1])
        }
    } else if InStr(payload, '"type":"mouse_click"') {
        if RegExMatch(payload, '"x":(\d+),"y":(\d+),"button":"([^"]+)"', &match) {
            Click(match[1], match[2], match[3])
        }
    } else if InStr(payload, '"type":"window_move"') {
        if RegExMatch(payload, '"title":"([^"]+)","x":(\d+),"y":(\d+),"w":(\d+),"h":(\d+)"', &match) {
            WinMove(match[2], match[3], match[4], match[5], match[1])
        }
    } else if InStr(payload, '"type":"close_window"') {
        if RegExMatch(payload, '"title":"([^"]+)"', &match) {
            WinClose(match[1])
        }
    } else if InStr(payload, '"type":"minimize_window"') {
        if RegExMatch(payload, '"title":"([^"]+)"', &match) {
            WinMinimize(match[1])
        }
    } else if InStr(payload, '"type":"run_program"') {
        if RegExMatch(payload, '"path":"([^"]+)"', &match) {
            Run(match[1])
        }
    }
    FileAppend('{"success":true}', "*")
} catch Error as err {
    FileAppend('{"success":false,"error":"' . err.Message . '"}', "*")
}

ExitApp
