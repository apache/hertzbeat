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

dockerfile=script/docker/collector/Dockerfile.native
foreground=script/assembly/collector/bin-native/foreground.sh
systemd_unit=script/assembly/collector/systemd/hertzbeat-collector.service
native_assembly=script/assembly/collector/assembly-native.xml
release_assets=script/ci/generate-hybrid-collector-release-assets.sh
release_workflow=.github/workflows/hybrid-collector-release.yml

for required in "$dockerfile" "$foreground" "$systemd_unit" "$release_assets" "$release_workflow"; do
  if [ ! -f "$required" ]; then
    echo "missing Hybrid Collector release file: $required" >&2
    exit 1
  fi
done

grep -q '^FROM debian:bookworm-slim' "$dockerfile"
grep -q 'ARG TARGETARCH' "$dockerfile"
grep -q 'USER hertzbeat' "$dockerfile"
if grep -Eq 'temurin|openjdk|JAVA_HOME|java-version: 21' "$dockerfile" "$release_workflow"; then
  echo "native Hybrid Collector release paths must not depend on a JVM or Java 21" >&2
  exit 1
fi

grep -q 'exec "$APP_PATH"' "$foreground"
grep -q 'ExecStart=/opt/hertzbeat-collector/bin/foreground.sh' "$systemd_unit"
grep -q 'Restart=on-failure' "$systemd_unit"
grep -q 'native.service.dir' "$native_assembly"
grep -q 'hertzbeat-otel-runtime.cdx.json' "$native_assembly"
grep -q 'runtime-licenses' "$native_assembly"
grep -q '^release-assets:' hertzbeat-otel-runtime/Makefile
tagged_builds=$(grep -c 'GOFLAGS=.*GO_BUILD_TAGS.*go build' hertzbeat-otel-runtime/Makefile)
if [ "$tagged_builds" -ne 5 ]; then
  echo "all five Go release binaries must use the trimmed component build tag" >&2
  exit 1
fi
stripped_builds=$(grep -c 'go build.*-ldflags=.*GO_LDFLAGS' hertzbeat-otel-runtime/Makefile)
if [ "$stripped_builds" -ne 5 ]; then
  echo "all five Go release binaries must omit non-runtime symbol and debug tables" >&2
  exit 1
fi
grep -q 'cyclonedx-gomod@v1.10.0' "$release_assets"
grep -q 'go-licenses/v2@v2.0.1' "$release_assets"
grep -q 'govulncheck@v1.6.0' "$release_assets"
grep -q 'govulncheck.*-tags.*build_tags' "$release_assets"
if grep -q 'govulncheck.*-mode binary' "$release_assets"; then
  echo "stripped Go binaries must use source call-graph vulnerability evidence" >&2
  exit 1
fi

grep -q 'workflow_dispatch:' "$release_workflow"
grep -q 'ubuntu-24.04-arm' "$release_workflow"
grep -q 'macos-15-intel' "$release_workflow"
grep -q 'windows-2025' "$release_workflow"
grep -q 'java-version: 25' "$release_workflow"

echo "Hybrid Collector release layout contract passed"
