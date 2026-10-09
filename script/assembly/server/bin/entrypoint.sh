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

set -eu

JAR_NAME="${project.build.finalName}.jar"
cd "$(dirname "$0")/.."
DEPLOY_DIR=$(pwd)
CONF_DIR="$DEPLOY_DIR/config"
LOGS_DIR="$DEPLOY_DIR/logs"
MAIN_CLASS="org.apache.hertzbeat.startup.HertzBeatApplication"
LIB_PATH="$DEPLOY_DIR/lib"
EXT_LIB_PATH="$DEPLOY_DIR/ext-lib"
CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"
mkdir -p "$LOGS_DIR"
# Preserve supplied JVM flags while keeping the Arrow access required by Java 25.
JAVA_OPTS="${JAVA_OPTS:-} -Dfile.encoding=UTF-8 -Doracle.jdbc.timezoneAsRegion=false --add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED"
JAVA_MEM_OPTS="${JAVA_MEM_OPTS:--server -XX:SurvivorRatio=6 -XX:+UseParallelGC -XX:+HeapDumpOnOutOfMemoryError}"
if [ -f "$CONF_DIR/logback-spring.xml" ]; then
    set -- "--logging.config=$CONF_DIR/logback-spring.xml" "$@"
fi
echo "Starting HertzBeat; logs: $LOGS_DIR"
# Options are intentionally whitespace-separated; the Java process owns container signals.
exec java $JAVA_OPTS $JAVA_MEM_OPTS "-XX:HeapDumpPath=$LOGS_DIR" \
    "-Dlogging.path=$LOGS_DIR" "-Dspring.config.location=$CONF_DIR/" \
    -cp "$CLASSPATH" "$MAIN_CLASS" --spring.profiles.active=prod "$@"
