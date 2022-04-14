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

rem JVM Configuration
set JAVA_OPTS= -Duser.timezone=Asia/Shanghai

set JAVA_MEM_OPTS= -server -XX:SurvivorRatio=6 -XX:+UseParallelGC


set LOGGING_CONFIG=-Dlogging.config=%CONF_DIR%\logback-spring.xml

set CONFIG_FILES= -Dlogging.path=%LOGS_DIR% %LOGGING_CONFIG% -Dspring.config.location=%CONF_DIR%/
echo Starting the %SERVER_NAME% ...

start javaw %JAVA_OPTS% %JAVA_MEM_OPTS% %CONFIG_FILES% -jar %DEPLOY_DIR%\%JAR_NAME%

echo "Service starting OK!"
for /f "tokens=1-5" %%i in ('netstat -ano^|findstr ":%SERVER_PORT%"') do (
    echo Service PID: %%m , Port %SERVER_PORT%  
    goto q
)

:q
pause