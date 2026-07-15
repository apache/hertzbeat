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
runtime_dir="$repo_root/hertzbeat-otel-runtime"
assembly_dir="$repo_root/script/assembly/collector"

if command -v sha256sum >/dev/null 2>&1; then
  inventory_sha=$(sha256sum "$runtime_dir/builder-config.yaml" | awk '{print $1}')
else
  inventory_sha=$(shasum -a 256 "$runtime_dir/builder-config.yaml" | awk '{print $1}')
fi

if ! grep -q "$inventory_sha" "$runtime_dir/runtime-manifest.json"; then
  echo "runtime manifest component inventory checksum is stale" >&2
  exit 1
fi

packages="
assembly-macos-arm64.xml:macos-arm64:hertzbeat-otel-runtime
assembly-macos-amd64.xml:macos-amd64:hertzbeat-otel-runtime
assembly-linux-arm64.xml:linux-arm64:hertzbeat-otel-runtime
assembly-linux-amd64.xml:linux-amd64:hertzbeat-otel-runtime
assembly-windows-64.xml:windows-amd64:hertzbeat-otel-runtime.exe
"

for package in $packages; do
  descriptor=${package%%:*}
  remainder=${package#*:}
  platform=${remainder%%:*}
  binary=${remainder#*:}
  source="../../hertzbeat-otel-runtime/dist/$platform"
  destination="runtime/$platform"
  if ! grep -q "<directory>$source</directory>" "$assembly_dir/$descriptor"; then
    echo "$descriptor does not package the $platform runtime" >&2
    exit 1
  fi
  if ! grep -q "<outputDirectory>$destination</outputDirectory>" "$assembly_dir/$descriptor"; then
    echo "$descriptor does not use the expected runtime layout" >&2
    exit 1
  fi
  if ! grep -q '<include>hertzbeat-otel-runtime.cdx.json</include>' "$assembly_dir/$descriptor" \
      || ! grep -q '<include>SHA512SUMS</include>' "$assembly_dir/$descriptor" \
      || ! grep -q "dist/$platform/runtime-licenses" "$assembly_dir/$descriptor"; then
    echo "$descriptor does not package runtime release metadata" >&2
    exit 1
  fi
  if [ ! -f "$runtime_dir/dist/$platform/$binary" ]; then
    echo "missing generated runtime artifact: $platform/$binary" >&2
    exit 1
  fi
  if ! cmp -s "$runtime_dir/runtime-manifest.json" "$runtime_dir/dist/$platform/runtime-manifest.json"; then
    echo "runtime manifest mismatch for $platform" >&2
    exit 1
  fi
  if ! go version -m "$runtime_dir/dist/$platform/$binary" | grep -q 'CGO_ENABLED=0'; then
    echo "$platform runtime must be built without CGO" >&2
    exit 1
  fi
done

echo "Hybrid Collector package layout contract passed"
