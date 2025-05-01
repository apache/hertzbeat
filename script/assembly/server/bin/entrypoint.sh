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

# project name
SERVER_NAME="${project.build.finalName}"

# jar name
JAR_NAME="${project.build.finalName}.jar"

# cd bin
cd `dirname $0`
# bin dir
BIN_DIR=`pwd`
# return root
cd ..
# root path dir
DEPLOY_DIR=`pwd`

# config dir
# absolute directory of external configuration files, if it is a directory, it should end with '/'，you can also directly specify a file.
# if a directory is specified, spring will read all configuration files in the directory
CONF_DIR=$DEPLOY_DIR/config
MAIN_CLASS="org.apache.hertzbeat.manager.Manager"
EXT_LIB_PATH="$DEPLOY_DIR/ext-lib"
CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$EXT_LIB_PATH/*"
# log dir
LOGS_DIR=$DEPLOY_DIR/logs
# create logs dir when not exist
if [ ! -d $LOGS_DIR ]; then
    mkdir $LOGS_DIR
fi

# JVM Configuration
if [ -z "$JAVA_OPTS" ]; then
  JAVA_OPTS=" -Dfile.encoding=UTF-8 -Doracle.jdbc.timezoneAsRegion=false --add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED"
else
  JAVA_OPTS="${JAVA_OPTS} -Dfile.encoding=UTF-8 -Doracle.jdbc.timezoneAsRegion=false"
fi

# JVM Configuration
JAVA_MEM_OPTS=" -server -XX:SurvivorRatio=6 -XX:+UseParallelGC -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=$LOGS_DIR"

# load logback config
LOG_IMPL_FILE=logback-spring.xml
LOGGING_CONFIG=""
if [ -f "$CONF_DIR/$LOG_IMPL_FILE" ]
then
    LOGGING_CONFIG="-Dlogging.config=$CONF_DIR/$LOG_IMPL_FILE"
fi
CONFIG_FILES=" -Dlogging.path=$LOGS_DIR $LOGGING_CONFIG -Dspring.config.location=$CONF_DIR/ "
echo -e "Starting the HertzBeat $SERVER_NAME ..."
java $JAVA_OPTS $JAVA_MEM_OPTS $CONFIG_FILES -cp $CLASSPATH $MAIN_CLASS --spring.profiles.active=prod
