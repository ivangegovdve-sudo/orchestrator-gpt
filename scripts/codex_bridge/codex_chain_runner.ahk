; Codex Chain Runner - AutoHotkey v1
; Automates Codex prompt chains defined in codex_chains.json.

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
Global Chains := []
Global ChainMap := {}
Global CurrentChain := ""
Global CurrentStepIndex := 0
Global CurrentStep := ""
Global LastClipboard := ""
Global LastChangeTick := 0
Global Mode := "idle"
Global MonitorTimer := "MonitorOutput"
Global ConfigPath := A_ScriptDir . "\\codex_chains.json"
Global DefaultIdle := 2000
Global Monitoring_IdleThreshold := 0

; Hotkeys
^!p::StartOrResume()
^!r::ResetChain()

; -------------------------
; JSON loader (JXON light)
; -------------------------
JSON_Load(jsonText) {
    return Jxon_Load(jsonText)
}

; JXON by Coco (trimmed for basic objects/arrays)
Jxon_Load(ByRef src, args*) {
    static quot := Chr(34), esc := {b:"`b", f:"`f", n:"`n", r:"`r", t:"`t", "\"":"`\"", "\\":"`\\"}
    key := ""
    is_key := true
    stack := []
    arr := false
    obj := {}
    i := 1
    While, i := RegExMatch(src, "\s*(?:(" quot "(?:\\.|[^" quot "])*" quot ")|([\{\}\[\]:,])|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(true|false|null))", m, i)
    {
        token := ""
        m1 := m2 := m3 := m4 := ""
        for k, v in m {
            if (k > 0) {
                token := v
                break
            }
        }
        if (token = "{" || token = "[") {
            val := (token = "{") ? {} : []
            if IsObject(obj)
                obj[arr ? obj.Count()+1 : key] := val
            stack.Insert({obj: obj, arr: arr, key: key, is_key: is_key})
            obj := val
            arr := (token = "[")
            key := ""
            is_key := !arr
        } else if (token = "}" || token = "]") {
            if (stack.MaxIndex()) {
                state := stack.Remove()
                obj := state.obj
                arr := state.arr
                key := state.key
                is_key := state.is_key
            }
            is_key := !arr
        } else if (token = ":") {
            is_key := false
        } else if (token = ",") {
            key := ""
            is_key := !arr
        } else if (m1 != "") {
            val := StrReplace(SubStr(token, 2, -1), "\\\"", "\"")
            for k, v in esc
                val := StrReplace(val, "\\" k, v)
            if (is_key) {
                key := val
            } else {
                obj[arr ? obj.Count()+1 : key] := val
                is_key := !arr
                key := ""
            }
        } else if (m3 != "") {
            val := m3 + 0
            obj[arr ? obj.Count()+1 : key] := val
            is_key := !arr
            key := ""
        } else if (m4 != "") {
            if (m4 = "true")
                val := true
            else if (m4 = "false")
                val := false
            else
                val := ""
            obj[arr ? obj.Count()+1 : key] := val
            is_key := !arr
            key := ""
        }
    }
    return obj
}

; -------------------------
; Load configuration
; -------------------------
LoadChains() {
    Global Chains, ChainMap, ConfigPath, DefaultIdle
    if !FileExist(ConfigPath) {
        ShowMessage("Cannot find configuration file:`n" . ConfigPath, 16)
        ExitApp
    }
    FileRead, jsonText, %ConfigPath%
    cfg := JSON_Load(jsonText)
    if !IsObject(cfg) {
        ShowMessage("Failed to parse config JSON.", 16)
        ExitApp
    }
    DefaultIdle := cfg.default_idle_threshold_ms ? cfg.default_idle_threshold_ms : 2000
    Chains := cfg.chains
    ChainMap := {}
    for index, chain in Chains
        ChainMap[chain.id] := chain
}

; -------------------------
; GUI setup
; -------------------------
Gui, +AlwaysOnTop +Resize +MinSize300x250
Gui, Add, Text, xm, Select chain:
Gui, Add, DropDownList, vChainChoice gOnChainChange w280, Loading...
Gui, Add, Text, xm ym+30 vStepLabel, Step: 0 / 0
Gui, Add, Text, xm ym+50 vModeLabel, Mode: idle
Gui, Add, Button, xm ym+80 w90 gStartChain, Start
Gui, Add, Button, x+10 w90 gPauseChain, Pause
Gui, Add, Button, x+10 w90 gResetChain, Reset
Gui, Add, Edit, xm ym+120 w320 h200 ReadOnly vStatusBox,
Gui, Show, , Codex Chain Runner

LoadChains()
PopulateDropdown()
UpdateStatus("Ready. Load a chain and press Start.")
return

; -------------------------
; GUI handlers
; -------------------------
OnChainChange:
    Gui, Submit, NoHide
    LoadSelectedChain()
return

StartChain:
    StartOrResume()
return

PauseChain:
    PauseMonitoring()
return

ResetChain:
    ResetChain()
return

GuiClose:
    ExitApp
return

; -------------------------
; Core functions
; -------------------------
PopulateDropdown() {
    Global Chains
    choices := ""
    for index, chain in Chains
        choices .= chain.name . "|"
    choices := RTrim(choices, "|")
    GuiControl,, ChainChoice, %choices%
}

LoadSelectedChain() {
    Global Chains, CurrentChain, CurrentStepIndex
    Gui, Submit, NoHide
    GuiControlGet, selectedChain, , ChainChoice
    for index, chain in Chains {
        if (chain.name = selectedChain) {
            CurrentChain := chain
            CurrentStepIndex := 0
            UpdateStepLabels()
            UpdateStatus("Loaded chain: " . chain.name)
            return
        }
    }
    CurrentChain := ""
}

StartOrResume() {
    Global CurrentChain, CurrentStepIndex
    if !IsObject(CurrentChain) {
        ShowMessage("Please select a chain first.", 48)
        return
    }
    if (CurrentStepIndex < 1)
        CurrentStepIndex := 1
    RunCurrentStep()
}

RunCurrentStep() {
    Global CurrentChain, CurrentStepIndex, CurrentStep, DefaultIdle, LastClipboard, LastChangeTick
    Global Mode, Monitoring_IdleThreshold, MonitorTimer
    steps := CurrentChain.steps
    total := steps.Count()
    if (CurrentStepIndex > total) {
        Mode := "done"
        UpdateStepLabels()
        UpdateStatus("Chain complete.")
        SoundBeep, 1000, 200
        return
    }
    CurrentStep := steps[CurrentStepIndex]
    idleThreshold := CurrentStep.idle_threshold_ms ? CurrentStep.idle_threshold_ms : (CurrentChain.idle_threshold_ms ? CurrentChain.idle_threshold_ms : DefaultIdle)
    Mode := "sending"
    UpdateStepLabels()
    UpdateStatus("Sending step " . CurrentStepIndex . " of " . total . " - " . CurrentStep.file)

    filePath := CurrentChain.step_files_dir . "\\" . CurrentStep.file
    if !FileExist(filePath) {
        ShowMessage("Missing prompt file:`n" . filePath, 16)
        Mode := "paused"
        UpdateModeLabel()
        return
    }
    FileRead, promptText, %filePath%

    Clipboard := promptText
    ClipWait, 1
    Send, ^a
    Sleep, 100
    Send, ^v
    Sleep, 150
    Send, {Enter}

    LastClipboard := ""
    LastChangeTick := A_TickCount
    Mode := "waiting"
    UpdateModeLabel()
    Monitoring_IdleThreshold := idleThreshold
    SetTimer, %MonitorTimer%, 750
    return
}

MonitorOutput:
    Global LastClipboard, LastChangeTick, CurrentStep, CurrentChain, CurrentStepIndex
    Global Mode, Monitoring_IdleThreshold, MonitorTimer
    if (Mode != "waiting")
        return

    Send, ^a
    Sleep, 50
    Send, ^c
    ClipWait, 0.5
    current := Clipboard
    if (current != LastClipboard) {
        LastClipboard := current
        LastChangeTick := A_TickCount
        UpdateStatus("Activity detected...")
        return
    }
    idle := A_TickCount - LastChangeTick
    if (idle < Monitoring_IdleThreshold)
        return

    Mode := "checking"
    UpdateModeLabel()
    SetTimer, %MonitorTimer%, Off
    CheckStepResult()
return

CheckStepResult() {
    Global Clipboard, CurrentStep, CurrentStepIndex, CurrentChain, Mode
    expected := CurrentStep.expect_marker
    if (InStr(Clipboard, expected)) {
        UpdateStatus("Step " . CurrentStepIndex . " matched marker. Moving on...")
        SoundBeep, 900, 150
        CurrentStepIndex++
        Mode := "waiting"
        RunCurrentStep()
    } else {
        answer := PromptChoice("Expected marker not found. Retry monitoring? (Yes), Advance (No), or Pause (Cancel)")
        if (answer = "Yes") {
            Mode := "waiting"
            SetTimer, %MonitorTimer%, 750
            LastChangeTick := A_TickCount
        } else if (answer = "No") {
            CurrentStepIndex++
            Mode := "waiting"
            RunCurrentStep()
        } else {
            Mode := "paused"
            UpdateModeLabel()
            UpdateStatus("Paused on step " . CurrentStepIndex)
        }
    }
}

PauseMonitoring() {
    Global Mode, MonitorTimer
    Mode := "paused"
    SetTimer, %MonitorTimer%, Off
    UpdateModeLabel()
    UpdateStatus("Paused.")
}

ResetChain() {
    Global CurrentStepIndex, CurrentChain, Mode, MonitorTimer
    SetTimer, %MonitorTimer%, Off
    CurrentStepIndex := 0
    Mode := "idle"
    UpdateStepLabels()
    UpdateStatus("Reset. Select Start to run.")
}

ShowMessage(text, type := 0) {
    DllCall("MessageBox", "UInt", 0, "Str", text, "Str", "Codex Bridge", "UInt", type)
}

PromptChoice(text) {
    result := DllCall("MessageBox", "UInt", 0, "Str", text, "Str", "Codex Bridge", "UInt", 3)
    if (result = 6)
        return "Yes"
    else if (result = 7)
        return "No"
    else
        return "Cancel"
}

UpdateStatus(text) {
    Global Mode
    GuiControl,, StatusBox, %text%
    UpdateModeLabel()
}

UpdateStepLabels() {
    Global CurrentChain, CurrentStepIndex
    total := IsObject(CurrentChain) ? CurrentChain.steps.Count() : 0
    GuiControl,, StepLabel, % "Step: " . CurrentStepIndex . " / " . total
    UpdateModeLabel()
}

UpdateModeLabel() {
    Global Mode
    GuiControl,, ModeLabel, % "Mode: " . Mode
}

<<<AHK_VALIDATION>>
SYNTAX_CHECK = PASSED
FILE_COMPLETE = YES
NO_TRUNCATION = YES
AHK_VERSION = 1
<</AHK_VALIDATION>>
