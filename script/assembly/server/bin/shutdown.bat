@title HertzBeat
@echo off 
setlocal enabledelayedexpansion

set SERVER_NAME="${project.artifactId}"


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