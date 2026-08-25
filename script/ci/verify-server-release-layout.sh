#!/usr/bin/env sh

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

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$repo_root"

dockerfile=script/docker/server/Dockerfile
workflow=.github/workflows/backend-build-test.yml
startup_pom=hertzbeat-startup/pom.xml
collector_config=hertzbeat-collector/hertzbeat-collector-collector/src/main/resources/application.yml
startup_script=script/assembly/server/bin/startup.sh
startup_windows=script/assembly/server/bin/startup.bat
entrypoint_script=script/assembly/server/bin/entrypoint.sh
shutdown_script=script/assembly/server/bin/shutdown.sh
assembly_descriptors="
script/assembly/server/assembly.xml
script/assembly/server/assembly-docker.xml
script/assembly/server/assembly-linux-amd64.xml
script/assembly/server/assembly-linux-arm64.xml
script/assembly/server/assembly-macos-amd64.xml
script/assembly/server/assembly-macos-arm64.xml
script/assembly/server/assembly-windows-64.xml
"
failed=0

required_java=$(sed -n 's:.*<java.version>\([0-9][0-9]*\)</java.version>.*:\1:p' pom.xml | head -1)
runtime_java=$(sed -n 's#^FROM eclipse-temurin:\([0-9][0-9]*\)-.*#\1#p' "$dockerfile" | head -1)
release_version=$(sed -n 's:.*<hzb.version>\([^<][^<]*\)</hzb.version>.*:\1:p' pom.xml | head -1)

if [ "$release_version" != "2.0.0" ]; then
  echo "the frozen community-preview distribution version must be 2.0.0" >&2
  failed=1
fi

if ! grep -Fq 'version: ${COLLECTOR_VERSION:2.0.0}' "$collector_config"; then
  echo "the Collector runtime default must match the 2.0.0 distribution" >&2
  failed=1
fi

if grep -R -n -E 'apache/hertzbeat:1\.8\.0|HERTZBEAT_RELEASE_VERSION:-1\.8\.0' \
  script/docker-compose >/dev/null; then
  echo "Docker Compose release inputs must not retain the 1.8.0 Server image" >&2
  failed=1
fi

if [ -z "$required_java" ] || [ -z "$runtime_java" ] || [ "$runtime_java" -lt "$required_java" ]; then
  echo "server image Java runtime must be compatible with the root Java compiler target" >&2
  failed=1
fi

if [ -n "$required_java" ]; then
  for module_pom in hertzbeat-*/pom.xml hertzbeat-*/*/pom.xml; do
    [ -f "$module_pom" ] || continue
    module_java=$(sed -n 's:.*<java.version>\([0-9][0-9]*\)</java.version>.*:\1:p' "$module_pom" | head -1)
    if [ -n "$module_java" ] && [ "$module_java" -lt "$required_java" ]; then
      echo "$module_pom must not lower the root Java compiler target" >&2
      failed=1
    fi
  done
fi

startup_boot_plugin=$(sed -n '/<artifactId>spring-boot-maven-plugin<\/artifactId>/,/<\/plugin>/p' "$startup_pom")
if ! echo "$startup_boot_plugin" | grep -q '<skip>true</skip>'; then
  echo "server release must keep a thin startup JAR for the packaged classpath launchers" >&2
  failed=1
fi

if ! grep -Fq 'LIB_PATH="$DEPLOY_DIR/lib"' "$startup_script" \
  || ! grep -Fq 'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"' "$startup_script" \
  || ! grep -Fq 'LIB_PATH="$DEPLOY_DIR/lib"' "$entrypoint_script" \
  || ! grep -Fq 'CLASSPATH="$DEPLOY_DIR/$JAR_NAME:$LIB_PATH/*:$EXT_LIB_PATH/*"' "$entrypoint_script" \
  || ! grep -Fq 'set LIB_PATH=%DEPLOY_DIR%\lib' "$startup_windows" \
  || ! grep -Fq 'set CLASSPATH=%DEPLOY_DIR%\%JAR_NAME%;%LIB_PATH%\*;%EXT_LIB_PATH%\*' "$startup_windows"; then
  echo "server launchers must load the thin root JAR plus packaged lib and ext-lib dependencies" >&2
  failed=1
fi

for descriptor in $assembly_descriptors; do
  if ! grep -Fq '<useProjectArtifact>false</useProjectArtifact>' "$descriptor"; then
    echo "$descriptor must not duplicate the Server application JAR in lib" >&2
    failed=1
  fi
  if ! grep -Fq '<include>${project.build.finalName}.jar</include>' "$descriptor" \
    || grep -Fq '<include>*.jar</include>' "$descriptor"; then
    echo "$descriptor must include only the current Server application JAR" >&2
    failed=1
  fi
done

if grep -Eq 'kill[[:space:]]+-9' "$shutdown_script" \
  || ! grep -q 'CONF_DIR=' "$shutdown_script" \
  || ! grep -q 'STOP_TIMEOUT=' "$shutdown_script"; then
  echo "server shutdown must target its deployment and allow graceful termination" >&2
  failed=1
fi

ignored_paths=$(awk '
  /^[[:space:]]+paths-ignore:[[:space:]]*$/ { in_paths_ignore = 1; next }
  in_paths_ignore && /^[[:space:]]+- / { print; next }
  in_paths_ignore { in_paths_ignore = 0 }
' "$workflow")
if echo "$ignored_paths" | grep -Eq "^[[:space:]]+- '?(web-app|script)/\\*\\*'?[[:space:]]*$"; then
  echo "backend release CI must run for web-app and script changes" >&2
  failed=1
fi

toolchain_line=$(grep -n 'corepack prepare pnpm@10.9.0 --activate' "$workflow" | head -1 | cut -d: -f1 || true)
install_line=$(grep -n 'pnpm install --frozen-lockfile' "$workflow" | head -1 | cut -d: -f1 || true)
build_line=$(grep -n 'pnpm build' "$workflow" | head -1 | cut -d: -f1 || true)
package_line=$(grep -n 'mvnd clean -B package -Prelease' "$workflow" | head -1 | cut -d: -f1 || true)
package_verify_line=$(grep -n 'verify-server-release-package.py' "$workflow" | head -1 | cut -d: -f1 || true)

if [ -z "$toolchain_line" ] || [ -z "$install_line" ] || [ -z "$build_line" ] || [ -z "$package_line" ] \
  || [ "$toolchain_line" -ge "$install_line" ] || [ "$install_line" -ge "$build_line" ] \
  || [ "$build_line" -ge "$package_line" ]; then
  echo "backend release CI must install and build web-app before Maven release assembly" >&2
  failed=1
fi

if [ -z "$package_verify_line" ] || [ -z "$package_line" ] \
  || [ "$package_verify_line" -le "$package_line" ]; then
  echo "backend release CI must verify the assembled Server archive after Maven packaging" >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "Server release layout verification passed"
