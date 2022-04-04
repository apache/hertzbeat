@title HertzBeat
@echo off 
setlocal enabledelayedexpansion

rem 项目名称
set SERVER_NAME="${project.artifactId}"


rem 应用的端口号
set SERVER_PORT=1157

echo Start shutdown HertzBeat %SERVER_NAME% 

for /f "tokens=1-5" %%i in ('netstat -ano^|findstr ":%SERVER_PORT%"') do (
    echo kill the process %%m who use the port 
    taskkill /pid %%m -t -f
    echo Shutdown HertzBeat %SERVER_NAME% Success!  
    goto q
)
echo Faild shutdown HertzBeat %SERVER_NAME%  

:q
pause