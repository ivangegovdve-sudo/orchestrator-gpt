; Codex Chain Runner - MINIMAL / HARD-CODED VERSION (AutoHotkey v1)
; No JSON, no parsers, just one fixed 5-step chain.

#NoEnv
#SingleInstance Force
#Persistent
SendMode Input
SetTitleMatchMode, 2
SetBatchLines, -1

; -------------------------
; Global state
; -------------------------
Global StepFilesDir      := "C:\Ivan\_StableDiffusion\orchestrator-gpt\codex_prompts"
Global Steps             := []    ; filled in InitChain()
Global CurrentStepIndex  := 0
Global Mode              := "idle"   ; idle | sending | waiting | checking | paused | done
Global LastClipboard     := ""
Global LastChangeTick    := 0
Global IdleThresholdMs   := 2000
Global MonitorIntervalMs := 750

; -------------------------
; Hotkeys
; -------------------------
^!p::StartOrResume()   ; Ctrl+Alt+P
^!r::ResetChain()      ; Ctrl+Alt+R

; -------------------------
; Auto-execute
; -------------------------
InitChain()
CreateGui()
return

; -------------------------
; Chain definition (5 steps, hard-coded)
; -------------------------
InitChain() {
    Global Steps

    Steps := []

    step := {}
    step.file   := "codex_step_A.txt"
    step.marker := """schema"": ""ivan-sd-inventory-v1"""
    Steps.Push(step)

    step := {}
    step.file   := "codex_step_B.html.txt"
    step.marker := "<html"
    Steps.Push(step)

    step := {}
    step.file   := "codex_step_C.css.txt"
    step.marker := "#healthBox"
    Steps.Push(step)

    step := {}
    step.file   := "codex_step_D.js.txt"
    step.marker := "document.addEventListener(""DOMContentLoaded"""
    Steps.Push(step)

    step := {}
    step.file   := "codex_step_E_index.txt"
    step.marker := "Prompt Builder"
    Steps.Push(step)
}

; -------------------------
; GUI
; -------------------------
CreateGui() {
    Global

    Gui, New, +Resize +MinSize300x220, Codex Chain Runner (MIN)
    Gui, Font, s9, Segoe UI

    Gui, Add, Text, xm, Chain: Prompt Builder (5 steps)
    Gui, Add, Text, xm ym+25 vStepLabel, Step: 0 / 5
    Gui, Add, Text, xm ym+45 vModeLabel, Mode: idle

    Gui, Add, Button, xm  ym+75 w80 gGuiStart, Start
    Gui, Add, Button, x+10 w80 gGuiPause, Pause
    Gui, Add, Button, x+10 w80 gGuiReset, Reset

    Gui, Add, Edit, xm ym+110 w320 h140 ReadOnly vStatusBox,
        Ready. Focus Codex chat input, then click Start or press Ctrl+Alt+P.

    Gui, Show, AutoSize Center, Codex Chain Runner (MIN)
    UpdateLabels()
}

GuiClose:
    ExitApp
return

GuiSize:
    ; let controls auto-adjust; nothing special needed for now
return

GuiStart:
    StartOrResume()
return

GuiPause:
    PauseMonitoring()
return

GuiReset:
    ResetChain()
return

; -------------------------
; Control functions
; -------------------------
StartOrResume() {
    Global CurrentStepIndex, Mode

    if (Mode = "done") {
        CurrentStepIndex := 1
    }

    if (CurrentStepIndex < 1)
        CurrentStepIndex := 1

    Mode := "sending"
    UpdateLabels()
    RunCurrentStep()
}

ResetChain() {
    Global CurrentStepIndex, Mode
    SetTimer, MonitorOutput, Off
    CurrentStepIndex := 0
    Mode := "idle"
    UpdateLabels()
    UpdateStatus("Reset. Press Start or Ctrl+Alt+P to run the chain.")
}

PauseMonitoring() {
    Global Mode
    Mode := "paused"
    SetTimer, MonitorOutput, Off
    UpdateLabels()
    UpdateStatus("Paused.")
}

; -------------------------
; Step execution
; -------------------------
RunCurrentStep() {
    Global Steps, CurrentStepIndex, Mode
    Global StepFilesDir, LastClipboard, LastChangeTick
    Global IdleThresholdMs, MonitorIntervalMs

    total := Steps.MaxIndex()
    if (total < 1) {
        MsgBox, 16, Codex Chain Runner, No steps defined in script.
        Mode := "idle"
        UpdateLabels()
        return
    }

    if (CurrentStepIndex > total) {
        Mode := "done"
        UpdateLabels()
        UpdateStatus("Chain complete. All steps finished.")
        SoundBeep, 1000, 200
        return
    }

    step := Steps[CurrentStepIndex]
    filePath := StepFilesDir . "\" . step.file

    if !FileExist(filePath) {
        MsgBox, 16, Codex Chain Runner, Missing prompt file:`n%filePath%
        Mode := "paused"
        UpdateLabels()
        UpdateStatus("Error: Missing file for step " . CurrentStepIndex)
        return
    }

    FileRead, promptText, %filePath%

    Clipboard := ""
    Clipboard := promptText
    ClipWait, 1
    if (ErrorLevel) {
        MsgBox, 16, Codex Chain Runner, Failed to set clipboard for step %CurrentStepIndex%.
        Mode := "paused"
        UpdateLabels()
        UpdateStatus("Clipboard error on step " . CurrentStepIndex)
        return
    }

    Send, ^a
    Sleep, 120
    Send, {Backspace}
    Sleep, 120
    Send, ^v
    Sleep, 250
    Send, {Enter}

    LastClipboard := ""
    LastChangeTick := A_TickCount
    Mode := "waiting"
    UpdateLabels()
    UpdateStatus("Step " . CurrentStepIndex . " sent. Waiting for Codex output...")

    SetTimer, MonitorOutput, %MonitorIntervalMs%
}

; -------------------------
; Monitor Codex output
; -------------------------
MonitorOutput:
    Global Mode, LastClipboard, LastChangeTick, IdleThresholdMs
    Global CurrentStepIndex

    if (Mode != "waiting")
        return

    Send, ^a
    Sleep, 60
    Send, ^c
    ClipWait, 0.5
    current := Clipboard

    if (current != LastClipboard) {
        LastClipboard := current
        LastChangeTick := A_TickCount
        UpdateStatus("Step " . CurrentStepIndex . ": activity detected...")
        return
    }

    idle := A_TickCount - LastChangeTick
    if (idle < IdleThresholdMs)
        return

    Mode := "checking"
    UpdateLabels()
    SetTimer, MonitorOutput, Off
    CheckStepResult()
return

CheckStepResult() {
    Global Steps, CurrentStepIndex, Mode

    clip := Clipboard
    step := Steps[CurrentStepIndex]
    expected := step.marker

    if (InStr(clip, expected)) {
        UpdateStatus("Step " . CurrentStepIndex . " matched expected marker. Moving to next step.")
        SoundBeep, 900, 150
        CurrentStepIndex++
        Mode := "sending"
        UpdateLabels()
        Sleep, 200
        RunCurrentStep()
    } else {
        MsgText := "Expected marker NOT found in Codex output for step " . CurrentStepIndex . ".`n`n"
        MsgText .= "Marker:`n" . expected . "`n`n"
        MsgText .= "Yes = Wait longer and re-monitor.`n"
        MsgText .= "No  = Advance anyway.`n"
        MsgText .= "Cancel = Pause chain."

        MsgBox, 35, Codex Chain Runner, %MsgText%

        IfMsgBox Yes
        {
            Mode := "waiting"
            UpdateLabels()
            LastChangeTick := A_TickCount
            SetTimer, MonitorOutput, %MonitorIntervalMs%
        }
        IfMsgBox No
        {
            CurrentStepIndex++
            Mode := "sending"
            UpdateLabels()
            RunCurrentStep()
        }
        IfMsgBox Cancel
        {
            Mode := "paused"
            UpdateLabels()
            UpdateStatus("Paused on step " . CurrentStepIndex . ".")
        }
    }
}

; -------------------------
; GUI helpers
; -------------------------
UpdateStatus(text) {
    GuiControl,, StatusBox, %text%
}

UpdateLabels() {
    Global CurrentStepIndex, Mode, Steps
    total := Steps.MaxIndex()
    GuiControl,, StepLabel, % "Step: " . CurrentStepIndex . " / " . total
    GuiControl,, ModeLabel, % "Mode: " . Mode
}
