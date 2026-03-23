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

cd /d %~dp0
cd ..
set DEPLOY_DIR=%CD%
set LOGS_DIR=%DEPLOY_DIR%\logs
set PID_FILE=%LOGS_DIR%\%SERVER_NAME%.pid
set SERVER_PORT=1159

set PID=
if exist "%PID_FILE%" (
    set /p PID=<"%PID_FILE%"
)

if not defined PID (
    for /f %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$conn = Get-NetTCPConnection -LocalPort %SERVER_PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($conn) { $conn.OwningProcess }"') do set PID=%%i
)

if not defined PID (
    echo Apache HertzBeat %SERVER_NAME% is already stopped
    del /q "%PID_FILE%" >nul 2>&1
    exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-Process -Id %PID% -ErrorAction SilentlyContinue) { Stop-Process -Id %PID% -Force; exit 0 } exit 1"
del /q "%PID_FILE%" >nul 2>&1

echo Shutdown Apache HertzBeat %SERVER_NAME% Success!
exit /b 0
