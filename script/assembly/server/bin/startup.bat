@title HertzBeat
@echo off 
setlocal enabledelayedexpansion

rem 项目名称
set SERVER_NAME=${project.artifactId}

rem jar名称
set JAR_NAME=${project.build.finalName}.jar

rem 进入bin目录
cd /d %~dp0
rem 返回到上一级项目根目录路径
cd ..
rem 打印项目安装根目录绝对路径
set DEPLOY_DIR=%~dp0..
echo %DEPLOY_DIR%  
rem 外部配置文件绝对目录,如果是目录需要/结尾，也可以直接指定文件
rem 如果指定的是目录,spring则会读取目录中的所有配置文件
set CONF_DIR=%DEPLOY_DIR%\config
echo %CONF_DIR%

rem 应用的端口号
set SERVER_PORT=1157

for /f "tokens=1-5" %%i in ('netstat -ano^|findstr "0.0.0.0:%SERVER_PORT%"') do (
    echo The HertzBeat %SERVER_NAME% port %SERVER_PORT% already used!
	echo exit!
    goto q
)


rem 项目日志输出绝对路径
set LOGS_DIR=%DEPLOY_DIR%\logs

rem JVM Configuration
set JAVA_OPTS= -Djava.awt.headless=true -Djava.net.preferIPv4Stack=true -Duser.timezone=Asia/Shanghai

set JAVA_MEM_OPTS= -server -Xms256m -Xmx1024m -XX:SurvivorRatio=2 -XX:+UseParallelGC

rem 加载外部log文件的配置
set LOGGING_CONFIG=-Dlogging.config=%CONF_DIR%\logback-spring.xml
rem 注意配置文件目录最后的后缀需为 / 而不是 windows \
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