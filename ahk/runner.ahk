; Winomation AHK Helper (v2-ish logic)
#Requires AutoHotkey v1.1+
#NoEnv
SendMode Input
SetWorkingDir %A_ScriptDir%

; This helper receives a JSON payload as the first argument
payload := A_Args[1]

; Simple JSON-to-Command Dispatcher
if (InStr(payload, """type"":""send_keys""")) {
    RegExMatch(payload, """keys"":""([^""]+)""", match)
    keys := match1
    Send, %keys%
} else if (InStr(payload, """type"":""mouse_click""")) {
    RegExMatch(payload, """x"":(\d+),""y"":(\d+),""button"":""([^""]+)""", match)
    x := match1
    y := match2
    btn := match3
    Click, %x%, %y%, %btn%
} else if (InStr(payload, """type"":""window_move""")) {
    RegExMatch(payload, """title"":""([^""]+)"",""x"":(\d+),""y"":(\d+),""w"":(\d+),""h"":(\d+)""", match)
    title := match1
    WinMove, %title%, , match2, match3, match4, match5
}

; Return success to Node.js
FileAppend, {"success":true}, *
ExitApp
