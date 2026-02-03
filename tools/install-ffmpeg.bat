@echo off
REM FFmpeg Installation Script for Windows
REM Downloads and installs FFmpeg binaries to the tools/ directory

setlocal enabledelayedexpansion

echo ========================================
echo   FFmpeg Installation Script
echo ========================================
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "TOOLS_DIR=%SCRIPT_DIR%"
set "PROJECT_ROOT=%SCRIPT_DIR%..\"

REM Change to project root
cd /d "%PROJECT_ROOT%"

REM Check if tools directory exists
if not exist "tools" (
    echo [INFO] Creating tools directory...
    mkdir tools
)

cd tools

REM Check if ffmpeg.exe already exists
if exist "ffmpeg.exe" (
    echo [INFO] FFmpeg already exists in tools directory.
    echo [INFO] Verifying installation...
    ffmpeg.exe -version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] FFmpeg is already installed and working!
        ffmpeg.exe -version | findstr /C:"ffmpeg version"
        echo.
        echo [INFO] To reinstall, delete tools\ffmpeg.exe and run this script again.
        pause
        exit /b 0
    ) else (
        echo [WARNING] ffmpeg.exe exists but appears to be corrupted or incompatible.
        echo [INFO] Removing existing file and reinstalling...
        del /f /q ffmpeg.exe 2>nul
    )
)

echo [INFO] Downloading FFmpeg for Windows...
echo [INFO] This may take a few minutes depending on your internet connection...
echo.

REM Create temporary directory
set "TEMP_DIR=%TEMP%\ffmpeg_install_%RANDOM%"
mkdir "%TEMP_DIR%" 2>nul

REM Download FFmpeg using PowerShell
REM Using BtbN builds (reliable, static builds, no external dependencies)
set "FFMPEG_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
set "ZIP_FILE=%TEMP_DIR%\ffmpeg.zip"

echo [INFO] Fetching FFmpeg from GitHub releases...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ProgressPreference = 'SilentlyContinue'; ^
     try { ^
         Invoke-WebRequest -Uri '%FFMPEG_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing; ^
         Write-Host '[SUCCESS] Download completed.'; ^
         exit 0; ^
     } catch { ^
         Write-Host '[ERROR] Download failed:' $_.Exception.Message; ^
         exit 1; ^
     }"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to download FFmpeg.
    echo [INFO] Please check your internet connection and try again.
    echo [INFO] You can also manually download FFmpeg from:
    echo [INFO] https://github.com/BtbN/FFmpeg-Builds/releases
    echo [INFO] Extract ffmpeg.exe to the tools\ directory.
    rmdir /s /q "%TEMP_DIR%" 2>nul
    pause
    exit /b 1
)

echo [INFO] Extracting FFmpeg...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { ^
         Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%TEMP_DIR%' -Force; ^
         Write-Host '[SUCCESS] Extraction completed.'; ^
         exit 0; ^
     } catch { ^
         Write-Host '[ERROR] Extraction failed:' $_.Exception.Message; ^
         exit 1; ^
     }"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to extract FFmpeg archive.
    rmdir /s /q "%TEMP_DIR%" 2>nul
    pause
    exit /b 1
)

REM Find ffmpeg.exe in the extracted files
set "FFMPEG_EXE="
for /r "%TEMP_DIR%" %%F in (ffmpeg.exe) do (
    set "FFMPEG_EXE=%%F"
    goto :found
)

:found
if not defined FFMPEG_EXE (
    echo [ERROR] Could not find ffmpeg.exe in the downloaded archive.
    echo [INFO] The archive structure may have changed.
    rmdir /s /q "%TEMP_DIR%" 2>nul
    pause
    exit /b 1
)

echo [INFO] Copying ffmpeg.exe to tools directory...
copy /Y "%FFMPEG_EXE%" "%TOOLS_DIR%ffmpeg.exe" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to copy ffmpeg.exe to tools directory.
    rmdir /s /q "%TEMP_DIR%" 2>nul
    pause
    exit /b 1
)

REM Clean up temporary files
echo [INFO] Cleaning up temporary files...
rmdir /s /q "%TEMP_DIR%" 2>nul

REM Verify installation
echo [INFO] Verifying installation...
cd /d "%TOOLS_DIR%"
ffmpeg.exe -version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] FFmpeg installed successfully!
    echo.
    ffmpeg.exe -version | findstr /C:"ffmpeg version"
    echo.
    echo [INFO] FFmpeg is now available at: %TOOLS_DIR%ffmpeg.exe
    echo [INFO] The pixel-purge tool will automatically detect and use it.
) else (
    echo [ERROR] FFmpeg installation verification failed.
    echo [INFO] Please check that ffmpeg.exe exists in the tools directory.
    pause
    exit /b 1
)

echo.
echo [INFO] Installation complete!
pause
