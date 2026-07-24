#!/usr/bin/env sh

# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$repo_root"

collector_pom=hertzbeat-collector/hertzbeat-collector-collector/pom.xml
native_assembly=script/assembly/collector/assembly-native.xml
native_foreground=script/assembly/collector/bin-native/foreground.sh
native_startup=script/assembly/collector/bin-native/startup.sh

grep -q '<java.version>25</java.version>' pom.xml
grep -q '<id>native</id>' "$collector_pom"
grep -q '<artifactId>native-maven-plugin</artifactId>' "$collector_pom"
grep -q '<directory>src/native/resources</directory>' "$collector_pom"
grep -q 'CollectorRuntimeHintsRegistrar' \
  hertzbeat-collector/hertzbeat-collector-collector/src/main/java/org/apache/hertzbeat/collector/Collector.java
grep -q 'hertzbeat-otel-runtime/dist/${native.target.platform}' "$native_assembly"
grep -q 'runtime/${native.target.platform}' "$native_assembly"
grep -q 'OtelRuntimeConfiguration' \
  hertzbeat-collector/hertzbeat-collector-collector/src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports

for launcher in "$native_foreground" "$native_startup"; do
  if ! grep -Fq 'HERTZBEAT_HOME="${HERTZBEAT_HOME:-$DEPLOY_DIR}"' "$launcher" \
      || ! grep -Fq 'export HERTZBEAT_HOME' "$launcher"; then
    echo "$launcher must resolve the managed Runtime from the release root" >&2
    exit 1
  fi
done

if grep -R '<maven.compiler.\(source\|target\)>17</maven.compiler.' \
  hertzbeat-collector/*/pom.xml >/dev/null 2>&1; then
  echo "collector modules must inherit the Java 25 release instead of pinning Java 17" >&2
  exit 1
fi

echo "Hybrid Collector native layout contract passed"
