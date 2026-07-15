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

./script/ci/verify-otel-runtime-layout.sh
make -C hertzbeat-otel-runtime validate
make -C hertzbeat-otel-runtime build-platforms
./script/ci/verify-otel-runtime-package-layout.sh

os=$(uname -s)
arch=$(uname -m)
case "$os-$arch" in
  Darwin-arm64) platform=macos-arm64 ;;
  Darwin-x86_64) platform=macos-amd64 ;;
  Linux-aarch64|Linux-arm64) platform=linux-arm64 ;;
  Linux-x86_64|Linux-amd64) platform=linux-amd64 ;;
  *)
    echo "unsupported integration-test platform: $os-$arch" >&2
    exit 1
    ;;
esac

runtime_binary="$repo_root/hertzbeat-otel-runtime/dist/$platform/hertzbeat-otel-runtime"
HERTZBEAT_OTEL_RUNTIME_BINARY="$runtime_binary" \
  ./mvnw -pl hertzbeat-collector/hertzbeat-collector-collector -am \
  -Dtest='*OtelRuntime*Test,OtelJavaAgentIntegrationTest' test -DskipITs \
  -Dsurefire.failIfNoSpecifiedTests=false -DfailIfNoTests=false

echo "Hybrid Collector Phase 0 focused verification passed"
