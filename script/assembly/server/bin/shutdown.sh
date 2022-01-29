#!/bin/bash

# 项目名称
APPLICATION="${project.artifactId}"

# 项目启动jar包名称
APPLICATION_JAR="${project.build.finalName}.jar"

# 通过项目名称查找到PI，然后kill -9 pid
PID=$(ps -ef | grep "${APPLICATION_JAR}" | grep -v grep | awk '{ print $2 }')
if [[ -z "$PID" ]]
then
    echo ${APPLICATION} is already stopped
else
    echo kill  ${PID}
    kill -9 ${PID}
    echo ${APPLICATION} stopped successfully
fi