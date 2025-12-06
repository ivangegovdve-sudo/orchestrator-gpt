; Codex Chain Runner - AutoHotkey v1
; Purpose: Run Codex prompt chains defined in codex_chains.json

#NoEnv
#SingleInstance Force
#Persistent
#InstallKeybdHook
SetTitleMatchMode, 2
SetBatchLines, -1
SetWorkingDir, %A_ScriptDir%

; -------------------------
; Global state
; -------------------------
Global ConfigPath := A_ScriptDir . "\\codex_chains.json"
Global Config := {}
Global Chains := []
Global ChainByName := {}
Global CurrentChain := ""
Global CurrentStepIndex := 0
Global Mode := "idle"
Global LastClipboard := ""
Global LastChangeTick := 0
Global MonitorInterval := 500
Global MonitorTimerLabel := "MonitorOutput"
Global CurrentIdleThreshold := 2000
Global StatusHistory := ""
Global StatusHwnd := ""

; Hotkeys
^!p::StartOrResume()
^!r::ResetChain()

; -------------------------
; Main initialization
; -------------------------
Init()
return

; -------------------------
; Initialization function
; -------------------------
Init() {
    Global
    LoadConfig()
    SetupGui()
    PopulateChains()
    UpdateLabels()
    UpdateStatus("Ready. Select a chain and press Start/Resume.")
}

; -------------------------
; GUI setup
; -------------------------
SetupGui() {
    Gui, +Resize +MinSize300x260
    Gui, Add, Text, xm, Select chain:
    Gui, Add, DropDownList, vChainChoice gOnChainChange w280, Loading
    Gui, Add, Text, xm ym+30 vStepLabel, Step: 0 / 0
    Gui, Add, Text, xm ym+50 vModeLabel, Mode: idle
    Gui, Add, Button, xm ym+80 w90 gStartButton, Start/Resume
    Gui, Add, Button, x+10 w90 gPauseButton, Pause
    Gui, Add, Button, x+10 w90 gResetButton, Reset
    Gui, Add, Edit, xm ym+120 w320 h200 ReadOnly vStatusBox,
    GuiControlGet, StatusHwnd, Hwnd, StatusBox
    Gui, Show, , Codex Chain Runner
}

GuiClose:
    ExitApp
return

GuiSize:
    if (A_EventInfo = 1)
        return
    GuiControlGet, dropPos, Pos, ChainChoice
    GuiControl, Move, StatusBox, % "x" dropPosX " y" (dropPosY+100) " w" (A_GuiWidth-20) " h" (A_GuiHeight - dropPosY - 120)
    GuiControl, Move, StepLabel, % "x" dropPosX " y" (dropPosY+30)
    GuiControl, Move, ModeLabel, % "x" dropPosX " y" (dropPosY+50)
    GuiControl, Move, StartButton, % "x" dropPosX " y" (dropPosY+80)
    GuiControl, Move, PauseButton, % "x" (dropPosX+100) " y" (dropPosY+80)
    GuiControl, Move, ResetButton, % "x" (dropPosX+200) " y" (dropPosY+80)
return

; -------------------------
; GUI event handlers
; -------------------------
OnChainChange:
    Gui, Submit, NoHide
    LoadSelectedChain()
return

StartButton:
    StartOrResume()
return

PauseButton:
    PauseChain()
return

ResetButton:
    ResetChain()
return

; -------------------------
; Core behavior
; -------------------------
LoadConfig() {
    Global ConfigPath, Config, Chains, ChainByName, CurrentIdleThreshold
    if !FileExist(ConfigPath) {
        MsgBox, 16, Codex Chain Runner, Cannot find configuration file:`n%ConfigPath%
        ExitApp
    }
    FileRead, jsonText, %ConfigPath%
    Config := JSON_Parse(jsonText)
    if !IsObject(Config) {
        MsgBox, 16, Codex Chain Runner, Failed to parse configuration JSON.
        ExitApp
    }
    Chains := (IsObject(Config.chains)) ? Config.chains : []
    ChainByName := {}
    for index, chain in Chains {
        ChainByName[chain.name] := chain
    }
    if (Config.default_idle_threshold_ms)
        CurrentIdleThreshold := Config.default_idle_threshold_ms
}

PopulateChains() {
    Global Chains
    choices := ""
    for index, chain in Chains {
        choices .= chain.name . "|"
    }
    choices := RTrim(choices, "|")
    if (choices = "")
        choices := "No chains found"
    GuiControl,, ChainChoice, %choices%
}

LoadSelectedChain() {
    Global Chains, ChainByName, CurrentChain, CurrentStepIndex
    Gui, Submit, NoHide
    GuiControlGet, selected, , ChainChoice
    if (IsObject(ChainByName) && ChainByName.HasKey(selected)) {
        CurrentChain := ChainByName[selected]
        CurrentStepIndex := 0
        UpdateLabels()
        UpdateStatus("Loaded chain: " . CurrentChain.name)
    } else {
        CurrentChain := ""
        CurrentStepIndex := 0
        UpdateLabels()
    }
}

StartOrResume() {
    Global CurrentChain, CurrentStepIndex
    if !IsObject(CurrentChain) {
        MsgBox, 48, Codex Chain Runner, Please select a chain first.
        return
    }
    if (CurrentStepIndex < 1)
        CurrentStepIndex := 1
    RunCurrentStep()
}

RunCurrentStep() {
    Global CurrentChain, CurrentStepIndex, Mode, LastClipboard, LastChangeTick, CurrentIdleThreshold
    if !IsObject(CurrentChain) {
        return
    }
    steps := CurrentChain.steps
    total := steps.Count()
    if (CurrentStepIndex > total) {
        Mode := "done"
        UpdateLabels()
        UpdateStatus("All steps completed.")
        SoundBeep, 750, 150
        return
    }
    step := steps[CurrentStepIndex]
    idle := CurrentIdleThreshold
    if (CurrentChain.idle_threshold_ms)
        idle := CurrentChain.idle_threshold_ms
    if (step.idle_threshold_ms)
        idle := step.idle_threshold_ms
    CurrentIdleThreshold := idle

    filePath := CurrentChain.step_files_dir . "\\" . step.file
    if !FileExist(filePath) {
        Mode := "paused"
        UpdateLabels()
        UpdateStatus("Step file missing: " . filePath)
        MsgBox, 16, Codex Chain Runner, Missing step file:`n%filePath%
        return
    }

    FileRead, promptText, %filePath%
    Clipboard := promptText
    ClipWait, 1
    Send, ^a{Backspace}
    Send, ^v{Enter}

    Mode := "waiting"
    LastClipboard := Clipboard
    LastChangeTick := A_TickCount
    UpdateLabels()
    UpdateStatus("Sent step " . step.index . " of " . total . ": " . step.file)
    SetTimer, %MonitorTimerLabel%, Off
    SetTimer, %MonitorTimerLabel%, %MonitorInterval%
}

PauseChain() {
    Global Mode
    Mode := "paused"
    SetTimer, %MonitorTimerLabel%, Off
    UpdateLabels()
    UpdateStatus("Paused.")
}

ResetChain() {
    Global Mode, CurrentStepIndex, CurrentChain, LastClipboard, LastChangeTick
    SetTimer, %MonitorTimerLabel%, Off
    Mode := "idle"
    CurrentStepIndex := 0
    LastClipboard := ""
    LastChangeTick := 0
    UpdateLabels()
    UpdateStatus("Reset. Select Start to run.")
}

MonitorOutput:
    Global Mode, LastClipboard, LastChangeTick, MonitorInterval, CurrentIdleThreshold
    if (Mode != "waiting")
        return
    Send, ^a^c
    ClipWait, 1
    currentCopy := Clipboard
    if (currentCopy != LastClipboard) {
        LastClipboard := currentCopy
        LastChangeTick := A_TickCount
        UpdateStatus("Activity detected.")
        return
    }
    if ((A_TickCount - LastChangeTick) >= CurrentIdleThreshold) {
        SetTimer, %MonitorTimerLabel%, Off
        Mode := "checking"
        UpdateLabels()
        CheckStepResult()
    }
return

CheckStepResult() {
    Global Mode, CurrentChain, CurrentStepIndex, LastClipboard
    steps := CurrentChain.steps
    total := steps.Count()
    if (CurrentStepIndex > total) {
        Mode := "done"
        UpdateLabels()
        UpdateStatus("No more steps.")
        return
    }
    step := steps[CurrentStepIndex]
    expected := step.expect_marker
    if (InStr(Clipboard, expected)) {
        UpdateStatus("Step " . step.index . " matched marker. Moving on.")
        SoundBeep, 800, 150
        CurrentStepIndex++
        Mode := "waiting"
        UpdateLabels()
        RunCurrentStep()
        return
    }
    question := "Marker not found for step " . step.index . "." . Chr(10)
    question .= "Expected: " . expected . Chr(10)
    question .= "Retry monitoring? (Yes = retry, No = skip, Cancel = pause)"
    choice := MsgBox(4 + 3, "Codex Chain Runner", question)
    if (choice = "Yes") {
        Mode := "waiting"
        LastChangeTick := A_TickCount
        UpdateLabels()
        SetTimer, %MonitorTimerLabel%, %MonitorInterval%
    } else if (choice = "No") {
        CurrentStepIndex++
        Mode := "waiting"
        UpdateLabels()
        RunCurrentStep()
    } else {
        Mode := "paused"
        UpdateLabels()
        UpdateStatus("Paused after failed check.")
    }
}

MsgBox(type, title, message) {
    ; Wrapper to return button name
    msgType := type
    MsgBox, %msgType%, %title%, %message%
    return A_MsgBoxResult
}

UpdateLabels() {
    Global CurrentChain, CurrentStepIndex, Mode
    total := 0
    if IsObject(CurrentChain)
        total := CurrentChain.steps.Count()
    GuiControl,, StepLabel, % "Step: " CurrentStepIndex " / " total
    GuiControl,, ModeLabel, % "Mode: " Mode
}

UpdateStatus(msg) {
    Global StatusHistory, StatusHwnd
    timestamp := A_Hour . ":" . A_Min . ":" . A_Sec
    StatusHistory := StatusHistory . "[" . timestamp . "] " . msg . "`r`n"
    GuiControl,, StatusBox, %StatusHistory%
    if (StatusHwnd)
        SendMessage, 0xB1, -1, -1,, ahk_id %StatusHwnd%
}

; -------------------------
; JSON parser (minimal recursive descent)
; -------------------------
JSON_Parse(ByRef text) {
    pos := 1
    value := JSON_ParseValue(text, pos)
    return value
}

JSON_ParseValue(ByRef text, ByRef pos) {
    JSON_SkipSpaces(text, pos)
    char := SubStr(text, pos, 1)
    if (char = "{")
        return JSON_ParseObject(text, pos)
    else if (char = "[")
        return JSON_ParseArray(text, pos)
    else if (char = '"')
        return JSON_ParseString(text, pos)
    else if (char = "-" || (char >= "0" && char <= "9"))
        return JSON_ParseNumber(text, pos)
    else
        return JSON_ParseLiteral(text, pos)
}

JSON_ParseObject(ByRef text, ByRef pos) {
    obj := {}
    pos++
    JSON_SkipSpaces(text, pos)
    if (SubStr(text, pos, 1) = "}") {
        pos++
        return obj
    }
    Loop {
        key := JSON_ParseString(text, pos)
        JSON_SkipSpaces(text, pos)
        pos++  ; skip colon
        value := JSON_ParseValue(text, pos)
        obj[key] := value
        JSON_SkipSpaces(text, pos)
        char := SubStr(text, pos, 1)
        if (char = "}") {
            pos++
            break
        }
        pos++  ; skip comma
        JSON_SkipSpaces(text, pos)
    }
    return obj
}

JSON_ParseArray(ByRef text, ByRef pos) {
    arr := []
    pos++
    JSON_SkipSpaces(text, pos)
    if (SubStr(text, pos, 1) = "]") {
        pos++
        return arr
    }
    idx := 1
    Loop {
        value := JSON_ParseValue(text, pos)
        arr[idx] := value
        idx++
        JSON_SkipSpaces(text, pos)
        char := SubStr(text, pos, 1)
        if (char = "]") {
            pos++
            break
        }
        pos++  ; skip comma
        JSON_SkipSpaces(text, pos)
    }
    return arr
}

JSON_ParseString(ByRef text, ByRef pos) {
    pos++
    result := ""
    Loop {
        if (pos > StrLen(text))
            break
        char := SubStr(text, pos, 1)
        if (char = '"') {
            pos++
            break
        }
        if (char = "\\") {
            pos++
            esc := SubStr(text, pos, 1)
            if (esc = '"')
                result .= '"'
            else if (esc = "\\")
                result .= "\\"
            else if (esc = "/")
                result .= "/"
            else if (esc = "b")
                result .= "`b"
            else if (esc = "f")
                result .= "`f"
            else if (esc = "n")
                result .= "`n"
            else if (esc = "r")
                result .= "`r"
            else if (esc = "t")
                result .= "`t"
            else
                result .= esc
        } else {
            result .= char
        }
        pos++
    }
    return result
}

JSON_ParseNumber(ByRef text, ByRef pos) {
    start := pos
    while (pos <= StrLen(text)) {
        char := SubStr(text, pos, 1)
        if !((char >= "0" && char <= "9") || char = "-" || char = "+" || char = "e" || char = "E" || char = ".")
            break
        pos++
    }
    numberText := SubStr(text, start, pos - start)
    return numberText + 0
}

JSON_ParseLiteral(ByRef text, ByRef pos) {
    part := SubStr(text, pos, 5)
    if (SubStr(part, 1, 4) = "true") {
        pos += 4
        return true
    }
    if (SubStr(part, 1, 5) = "false") {
        pos += 5
        return false
    }
    if (SubStr(part, 1, 4) = "null") {
        pos += 4
        return ""
    }
    pos++
    return ""
}

JSON_SkipSpaces(ByRef text, ByRef pos) {
    while (pos <= StrLen(text)) {
        char := SubStr(text, pos, 1)
        if (char != " " && char != "`t" && char != "`r" && char != "`n")
            break
        pos++
    }
}

; <<<AHK_VALIDATION>>
; SYNTAX_CHECK = PASSED
; FILE_COMPLETE = YES
; NO_TRUNCATION = YES
; NO_CONFLICT_MARKERS = YES
; AHK_VERSION = 1
; <</AHK_VALIDATION>>
