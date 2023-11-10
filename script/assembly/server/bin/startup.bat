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

@title HertzBeat
@echo off
setlocal enabledelayedexpansion

set SERVER_NAME=${project.artifactId}

set JAR_NAME=${project.build.finalName}.jar

rem enter the bin directory
cd /d %~dp0

cd ..

set DEPLOY_DIR=%~dp0..
echo %DEPLOY_DIR%

set CONF_DIR=%DEPLOY_DIR%\config
echo %CONF_DIR%

set SERVER_PORT=1157

for /f "tokens=1-5" %%i in ('netstat -ano^|findstr "0.0.0.0:%SERVER_PORT%"') do (
    echo The HertzBeat %SERVER_NAME% port %SERVER_PORT% already used!
	echo exit!
    goto q
)

set LOGS_DIR=%DEPLOY_DIR%\logs

if not exist %LOGS_DIR% (
    mkdir %LOGS_DIR%
)

rem JVM Configuration

set JAVA_OPTS= -Duser.timezone=Asia/Shanghai -Doracle.jdbc.timezoneAsRegion=false

set JAVA_MEM_OPTS= -server -XX:SurvivorRatio=6 -XX:+UseParallelGC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=%LOGS_DIR%


set LOGGING_CONFIG=-Dlogging.config=%CONF_DIR%\logback-spring.xml

set CONFIG_FILES= -Dlogging.path=%LOGS_DIR% %LOGGING_CONFIG% -Dspring.config.location=%CONF_DIR%/
echo Starting the HertzBeat %SERVER_NAME% ...

set INNER_EXE=%DEPLOY_DIR%\java\bin\javaw.exe

if not exist %INNER_EXE% (
    echo "Use the system environment jdk to start"

    start javaw %JAVA_OPTS% %JAVA_MEM_OPTS% %CONFIG_FILES% -jar %DEPLOY_DIR%\%JAR_NAME%

) else (
    echo "Use the inner package jdk to start"

    start %INNER_EXE% %JAVA_OPTS% %JAVA_MEM_OPTS% %CONFIG_FILES% -jar %DEPLOY_DIR%\%JAR_NAME%
)

echo "Service Start Success!"
for /f "tokens=1-5" %%i in ('netstat -ano^|findstr ":%SERVER_PORT%"') do (
    echo Service PID: %%m , Port %SERVER_PORT%
    goto q
)

:q
pause
