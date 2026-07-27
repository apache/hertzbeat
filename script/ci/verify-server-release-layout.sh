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
failed=0

required_java=$(sed -n 's:.*<java.version>\([0-9][0-9]*\)</java.version>.*:\1:p' pom.xml | head -1)
runtime_java=$(sed -n 's#^FROM eclipse-temurin:\([0-9][0-9]*\)-.*#\1#p' "$dockerfile" | head -1)

if [ -z "$required_java" ] || [ -z "$runtime_java" ] || [ "$runtime_java" -lt "$required_java" ]; then
  echo "server image Java runtime must be compatible with the root Java compiler target" >&2
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

if [ -z "$toolchain_line" ] || [ -z "$install_line" ] || [ -z "$build_line" ] || [ -z "$package_line" ] \
  || [ "$toolchain_line" -ge "$install_line" ] || [ "$install_line" -ge "$build_line" ] \
  || [ "$build_line" -ge "$package_line" ]; then
  echo "backend release CI must install and build web-app before Maven release assembly" >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "Server release layout verification passed"
