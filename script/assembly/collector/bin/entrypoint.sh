#!/bin/sh

# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# 项目名称
SERVER_NAME="${project.build.finalName}"

# jar名称
JAR_NAME="${project.build.finalName}.jar"

# 进入bin目录
cd `dirname $0`
# bin目录绝对路径
BIN_DIR=`pwd`
# 返回到上一级项目根目录路径
cd ..
# 打印项目根目录绝对路径
# `pwd` 执行系统命令并获得结果
DEPLOY_DIR=`pwd`

# 外部配置文件绝对目录,如果是目录需要/结尾，也可以直接指定文件
# 如果指定的是目录,spring则会读取目录中的所有配置文件
CONF_DIR=$DEPLOY_DIR/config

# 项目日志输出绝对路径
LOGS_DIR=$DEPLOY_DIR/logs
# 如果logs文件夹不存在,则创建文件夹
if [ ! -d $LOGS_DIR ]; then
    mkdir $LOGS_DIR
fi

# JVM Configuration
JAVA_OPTS=" -Doracle.jdbc.timezoneAsRegion=false"

# JVM Configuration
JAVA_MEM_OPTS=" -server -XX:SurvivorRatio=6 -XX:+UseParallelGC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=$LOGS_DIR"

# 加载外部log文件的配置
LOG_IMPL_FILE=logback-spring.xml
LOGGING_CONFIG=""
if [ -f "$CONF_DIR/$LOG_IMPL_FILE" ]
then
    LOGGING_CONFIG="-Dlogging.config=$CONF_DIR/$LOG_IMPL_FILE"
fi
CONFIG_FILES=" -Dlogging.path=$LOGS_DIR $LOGGING_CONFIG -Dspring.config.location=$CONF_DIR/ "
echo -e "Starting the HertzBeat $SERVER_NAME ..."
java $JAVA_OPTS $JAVA_MEM_OPTS $CONFIG_FILES -jar $DEPLOY_DIR/$JAR_NAME --spring.profiles.active=cluster
