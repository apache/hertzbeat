@rem
@rem Licensed to the Apache Software Foundation (ASF) under one or more
@rem contributor license agreements.  See the NOTICE file distributed with
@rem this work for additional information regarding copyright ownership.
@rem The ASF licenses this file to You under the Apache License, Version 2.0
@rem (the "License"); you may not use this file except in compliance with
@rem the License.  You may obtain a copy of the License at
@rem
@rem     http://www.apache.org/licenses/LICENSE-2.0
@rem
@rem Unless required by applicable law or agreed to in writing, software
@rem distributed under the License is distributed on an "AS IS" BASIS,
@rem WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@rem See the License for the specific language governing permissions and
@rem limitations under the License.
@rem

@echo off
setlocal

set SERVER_NAME=${project.artifactId}
set BINARY_NAME=${native.executable.packageName}

cd /d %~dp0
cd ..
set DEPLOY_DIR=%CD%
set CONF_DIR=%DEPLOY_DIR%\config
set LOGS_DIR=%DEPLOY_DIR%\logs
set PID_FILE=%LOGS_DIR%\%SERVER_NAME%.pid
set APP_PATH=%DEPLOY_DIR%\%BINARY_NAME%
set SERVER_PORT=1159
set STDOUT_LOG=%LOGS_DIR%\startup.out.log
set STDERR_LOG=%LOGS_DIR%\startup.err.log

if "%1"=="status" goto status

if not exist "%APP_PATH%" (
    echo ERROR: native executable not found: %APP_PATH%
    exit /b 1
)

if not exist "%LOGS_DIR%" (
    mkdir "%LOGS_DIR%"
)

if exist "%PID_FILE%" (
    set /p RUNNING_PID=<"%PID_FILE%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Process -Id %RUNNING_PID% -ErrorAction SilentlyContinue) { exit 0 } exit 1"
    if not errorlevel 1 (
        echo ERROR: The HertzBeat %SERVER_NAME% already started!
        echo PID: %RUNNING_PID%
        exit /b 1
    )
    del /q "%PID_FILE%" >nul 2>&1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$portInUse = Get-NetTCPConnection -State Listen -LocalPort %SERVER_PORT% -ErrorAction SilentlyContinue; if ($portInUse) { exit 0 } exit 1"
if not errorlevel 1 (
    echo ERROR: The HertzBeat %SERVER_NAME% port %SERVER_PORT% is already used!
    exit /b 1
)

echo You can review logs at hertzbeat\logs
echo Starting the HertzBeat %SERVER_NAME% ...

for /f %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Start-Process -FilePath ''%APP_PATH%'' -ArgumentList ''--spring.config.location=%CONF_DIR%\'' -RedirectStandardOutput ''%STDOUT_LOG%'' -RedirectStandardError ''%STDERR_LOG%'' -PassThru; $p.Id"') do set APP_PID=%%i

if not defined APP_PID (
    echo ERROR: Service start failed, check %STDOUT_LOG% and %STDERR_LOG%
    exit /b 1
)

>"%PID_FILE%" echo %APP_PID%

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(30); do { Start-Sleep -Seconds 1; if (-not (Get-Process -Id %APP_PID% -ErrorAction SilentlyContinue)) { exit 1 } $listening = Get-NetTCPConnection -LocalPort %SERVER_PORT% -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq %APP_PID% }; if ($listening) { exit 0 } } while ((Get-Date) -lt $deadline); exit 0"
if errorlevel 1 (
    echo ERROR: Service start failed, check %STDOUT_LOG% and %STDERR_LOG%
    del /q "%PID_FILE%" >nul 2>&1
    exit /b 1
)

echo Service Start Success!
echo Service PID: %APP_PID%
exit /b 0

:status
if not exist "%PID_FILE%" (
    echo The HertzBeat %SERVER_NAME% is stopped
    exit /b 0
)

set /p RUNNING_PID=<"%PID_FILE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Process -Id %RUNNING_PID% -ErrorAction SilentlyContinue) { exit 0 } exit 1"
if errorlevel 1 (
    echo The HertzBeat %SERVER_NAME% is stopped
    del /q "%PID_FILE%" >nul 2>&1
    exit /b 0
)

echo The HertzBeat %SERVER_NAME% is running...!
echo PID: %RUNNING_PID%
exit /b 0
