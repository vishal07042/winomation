#Requires AutoHotkey v2.0
SetTitleMatchMode 2

; Simple Command Dispatcher using discrete arguments
if (A_Args.Length < 1) {
    ExitApp
}

cmdType := A_Args[1]

try {
    if (cmdType == "send_keys") {
        Send(A_Args[2])
    } else if (cmdType == "mouse_click") {
        Click(A_Args[2], A_Args[3], A_Args[4])
    } else if (cmdType == "window_move") {
        ; WinMove(X, Y, Width, Height, WinTitle)
        WinMove(A_Args[3], A_Args[4], A_Args[5], A_Args[6], A_Args[2])
    } else if (cmdType == "window_close") {
        if WinExist(A_Args[2]) {
            WinClose(A_Args[2])
        }
    } else if (cmdType == "window_minimize") {
        if WinExist(A_Args[2]) {
            WinMinimize(A_Args[2])
        }
    }
} catch Error as e {
    FileAppend("Error: " . e.Message, "*")
}

ExitApp
