#SingleInstance Force
#Requires AutoHotkey v2.0

; Start logging
FileAppend "AHK Script Started`n", "key_handler.log"

; Create command file
commandFile := "commands.txt"
if FileExist(commandFile)
    FileDelete commandFile
FileAppend "", commandFile

; Function to send keys
SendKeys(command) {
    try {
        if InStr(command, "backspace:") {
            count := StrReplace(command, "backspace:")
            FileAppend "Sending " count " backspaces`n", "key_handler.log"
            SetKeyDelay 10, 10
            Loop count
                SendInput "{BS}"
            FileAppend "Backspaces sent successfully`n", "key_handler.log"
        } else if InStr(command, "text:") {
            text := SubStr(command, 6)
            FileAppend "Sending text: " text "`n", "key_handler.log"
            SetKeyDelay 50
            Send text
            FileAppend "Text sent successfully: " text "`n", "key_handler.log"
        } else {
            FileAppend "Unknown command: " command "`n", "key_handler.log"
        }
    } catch Error as e {
        FileAppend "Error sending keys: " e.Message "`n", "key_handler.log"
    }
}

; Main loop to check for commands
FileAppend "Watching for commands`n", "key_handler.log"
Loop {
    try {
        if FileExist(commandFile) {
            content := FileRead(commandFile)
            if content {
                FileAppend "Found command: " content "`n", "key_handler.log"
                SendKeys(content)
                FileDelete commandFile
                FileAppend "", commandFile
            }
        }
    } catch Error as e {
        FileAppend "Error: " e.Message "`n", "key_handler.log"
    }
    Sleep 10
}
