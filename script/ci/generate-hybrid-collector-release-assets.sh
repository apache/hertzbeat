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
runtime_source="$runtime_dir/_build/otelcol-hertzbeat"
tools_dir="$runtime_dir/_build/tools"
release_dir="$runtime_dir/_build/release"
license_dir="$release_dir/runtime-licenses"
build_tags=remove_all_sd
tool_suffix=
case "$(uname -s)" in
  CYGWIN*|MINGW*|MSYS*) tool_suffix=.exe ;;
esac

if [ ! -f "$runtime_source/go.mod" ]; then
  echo "generated runtime source is missing; run make build-platforms first" >&2
  exit 1
fi

mkdir -p "$tools_dir" "$release_dir"
GOBIN="$tools_dir" go install github.com/CycloneDX/cyclonedx-gomod/cmd/cyclonedx-gomod@v1.10.0
GOBIN="$tools_dir" go install github.com/google/go-licenses/v2@v2.0.1
GOBIN="$tools_dir" go install golang.org/x/vuln/cmd/govulncheck@v1.6.0

(cd "$runtime_source" && GOFLAGS="-tags=$build_tags" \
  "$tools_dir/go-licenses$tool_suffix" check . --ignore github.com/apache/hertzbeat)
(cd "$runtime_source" && "$tools_dir/govulncheck$tool_suffix" -tags "$build_tags" ./...)

rm -rf "$license_dir"
(cd "$runtime_source" && GOFLAGS="-tags=$build_tags" \
  "$tools_dir/go-licenses$tool_suffix" save . --ignore github.com/apache/hertzbeat \
  --save_path="$license_dir")

runtime_version=$(sed -n 's/.*"runtimeVersion": "\([^"]*\)".*/\1/p' "$runtime_dir/runtime-manifest.json")
if [ -z "$runtime_version" ]; then
  echo "runtimeVersion is missing from runtime-manifest.json" >&2
  exit 1
fi

sha512_file() {
  if command -v sha512sum >/dev/null 2>&1; then
    sha512sum "$@"
  else
    shasum -a 512 "$@"
  fi
}

platforms="macos-arm64 macos-amd64 linux-arm64 linux-amd64 windows-amd64"
for platform in $platforms; do
  target_dir="$runtime_dir/dist/$platform"
  binary=hertzbeat-otel-runtime
  if [ "$platform" = windows-amd64 ]; then
    binary=hertzbeat-otel-runtime.exe
  fi
  if [ ! -f "$target_dir/$binary" ]; then
    echo "missing runtime binary for release assets: $platform/$binary" >&2
    exit 1
  fi

  "$tools_dir/cyclonedx-gomod$tool_suffix" bin -json \
    -output "$target_dir/hertzbeat-otel-runtime.cdx.json" \
    -version "v$runtime_version" "$target_dir/$binary"

  rm -rf "$target_dir/runtime-licenses"
  mkdir -p "$target_dir/runtime-licenses"
  cp -R "$license_dir"/. "$target_dir/runtime-licenses/"
  (cd "$target_dir" && sha512_file "$binary" runtime-manifest.json \
    hertzbeat-otel-runtime.cdx.json > SHA512SUMS)
done

echo "Hybrid Collector release assets generated"
