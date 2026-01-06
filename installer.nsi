; RT News Intelligence Installer Script
; NSIS Installer for Windows

!include "MUI2.nsh"

; General
Name "RT News Intelligence"
OutFile "RT-News-Intelligence-Setup.exe"
InstallDir "$PROGRAMFILES\RT News Intelligence"
InstallDirRegKey HKLM "Software\RT News Intelligence" "Install_Dir"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "..\public\icon.ico"
!define MUI_UNICON "..\public\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "..\public\installer-banner.bmp"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "..\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "RT News Intelligence" SecMain
  SetOutPath "$INSTDIR"
  
  ; Copy all files
  File /r "..\dist\*.*"
  File "..\electron\main.js"
  File "..\electron\preload.js"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\RT News Intelligence"
  CreateShortcut "$SMPROGRAMS\RT News Intelligence\RT News Intelligence.lnk" "$INSTDIR\RT News Intelligence.exe"
  CreateShortcut "$SMPROGRAMS\RT News Intelligence\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  CreateShortcut "$DESKTOP\RT News Intelligence.lnk" "$INSTDIR\RT News Intelligence.exe"
  
  ; Write registry keys
  WriteRegStr HKLM "Software\RT News Intelligence" "Install_Dir" "$INSTDIR"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "DisplayName" "RT News Intelligence"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "DisplayIcon" "$INSTDIR\RT News Intelligence.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "Publisher" "RT News"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "DisplayVersion" "2.0.0"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence" "NoRepair" 1
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
  ; Remove files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\RT News Intelligence\*.*"
  RMDir "$SMPROGRAMS\RT News Intelligence"
  Delete "$DESKTOP\RT News Intelligence.lnk"
  
  ; Remove registry keys
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\RT News Intelligence"
  DeleteRegKey HKLM "Software\RT News Intelligence"
SectionEnd
