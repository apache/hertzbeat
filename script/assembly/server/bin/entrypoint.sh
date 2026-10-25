#!/bin/bash

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

BIN_DIR="$(cd -- "$(dirname -- "$0")" && pwd -P)" || exit 1
DEPLOY_DIR="$(cd -- "$BIN_DIR/.." && pwd -P)" || exit 1
cd -- "$DEPLOY_DIR" || exit 1
mkdir -p -- "$DEPLOY_DIR/logs" || exit 1
JAVA=java
[ ! -x "$DEPLOY_DIR/java/bin/java" ] || JAVA="$DEPLOY_DIR/java/bin/java"
# JAVA_OPTS follows the established whitespace-separated JVM option convention.
JAVA_OPTS="${JAVA_OPTS:-}"
read -r -a USER_JAVA_OPTS <<< "${JAVA_OPTS//$'\n'/ }"
LOGGING_CONFIG=()
[ ! -f "$DEPLOY_DIR/config/logback-spring.xml" ] || LOGGING_CONFIG=("-Dlogging.config=$DEPLOY_DIR/config/logback-spring.xml")
exec "$JAVA" "${USER_JAVA_OPTS[@]}" \
    -Dfile.encoding=UTF-8 -Doracle.jdbc.timezoneAsRegion=false \
    --add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED \
    -server -XX:SurvivorRatio=6 -XX:+UseParallelGC -XX:+HeapDumpOnOutOfMemoryError \
    "-XX:HeapDumpPath=$DEPLOY_DIR/logs" "-Dlogging.path=$DEPLOY_DIR/logs" \
    "${LOGGING_CONFIG[@]}" "-Dspring.config.location=$DEPLOY_DIR/config/" \
    -cp "$DEPLOY_DIR/${project.build.finalName}.jar:$DEPLOY_DIR/lib/*:$DEPLOY_DIR/ext-lib/*" \
    org.apache.hertzbeat.startup.HertzBeatApplication --spring.profiles.active=prod "$@"
