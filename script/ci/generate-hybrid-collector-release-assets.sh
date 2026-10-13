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
collector_sbom="$repo_root/hertzbeat-collector/hertzbeat-collector-collector/target/hertzbeat-collector.json"
build_tags=remove_all_sd
go_fqdn_module=github.com/Showmax/go-fqdn
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

"$repo_root/mvnw" -f "$repo_root/hertzbeat-collector/hertzbeat-collector-collector/pom.xml" \
  org.cyclonedx:cyclonedx-maven-plugin:2.9.1:makeBom \
  -DskipTests -DincludeCompileScope=true -DincludeRuntimeScope=true \
  -DincludeProvidedScope=false -DincludeSystemScope=false -DincludeTestScope=false \
  -DoutputFormat=json -DoutputName=hertzbeat-collector -DschemaVersion=1.6
python3 "$repo_root/script/ci/verify-hybrid-collector-release-content.py" \
  --collector-sbom "$collector_sbom"

(cd "$runtime_source" && GOFLAGS="-tags=$build_tags" \
  "$tools_dir/go-licenses$tool_suffix" check . \
  --ignore github.com/apache/hertzbeat --ignore "$go_fqdn_module")
(cd "$runtime_source" && "$tools_dir/govulncheck$tool_suffix" -tags "$build_tags" ./...)

rm -rf "$license_dir"
(cd "$runtime_source" && GOFLAGS="-tags=$build_tags" \
  "$tools_dir/go-licenses$tool_suffix" save . \
  --ignore github.com/apache/hertzbeat --ignore "$go_fqdn_module" \
  --save_path="$license_dir")

# go-licenses cannot classify this module's shortened Apache-2.0 text. The Go
# checksum database pins its content; verify and package the upstream license
# explicitly instead of silently omitting an unknown dependency.
go_fqdn_dir=$(cd "$runtime_source" && go list -m -f '{{.Dir}}' "$go_fqdn_module")
test -f "$go_fqdn_dir/LICENSE"
grep -Fq 'Licensed under the Apache License, Version 2.0' "$go_fqdn_dir/LICENSE"
mkdir -p "$license_dir/$go_fqdn_module"
cp "$go_fqdn_dir/LICENSE" "$license_dir/$go_fqdn_module/LICENSE"

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

sha512_digest() {
  sha512_file "$1" | awk '{print $1}'
}

platforms="macos-arm64 macos-amd64 linux-arm64 linux-amd64 windows-amd64"
for platform in $platforms; do
  target_dir="$runtime_dir/dist/$platform"
  binary=hertzbeat-otel-runtime
  case "$platform" in
    macos-arm64) target_goos=darwin; target_goarch=arm64 ;;
    macos-amd64) target_goos=darwin; target_goarch=amd64 ;;
    linux-arm64) target_goos=linux; target_goarch=arm64 ;;
    linux-amd64) target_goos=linux; target_goarch=amd64 ;;
    windows-amd64)
      target_goos=windows
      target_goarch=amd64
      binary=hertzbeat-otel-runtime.exe
      ;;
    *) echo "unsupported runtime release platform: $platform" >&2; exit 1 ;;
  esac
  if [ ! -f "$target_dir/$binary" ]; then
    echo "missing runtime binary for release assets: $platform/$binary" >&2
    exit 1
  fi

  GOOS="$target_goos" GOARCH="$target_goarch" \
    "$tools_dir/cyclonedx-gomod$tool_suffix" bin -json \
    -output "$target_dir/hertzbeat-otel-runtime.cdx.json" \
    -version "v$runtime_version" "$target_dir/$binary"
  python3 "$repo_root/script/ci/verify-otel-runtime-sbom-platform.py" "$target_dir"
  cp "$collector_sbom" "$target_dir/hertzbeat-collector.cdx.json"

  collector_sbom_sha512=$(sha512_digest "$target_dir/hertzbeat-collector.cdx.json")
  runtime_sbom_sha512=$(sha512_digest "$target_dir/hertzbeat-otel-runtime.cdx.json")
  cat > "$target_dir/release-inventory.json" <<EOF
{
  "schemaVersion": "1.0",
  "artifacts": [
    {"path": "hertzbeat-collector.cdx.json", "sha512": "$collector_sbom_sha512"},
    {"path": "hertzbeat-otel-runtime.cdx.json", "sha512": "$runtime_sbom_sha512"}
  ]
}
EOF

  rm -rf "$target_dir/runtime-licenses"
  mkdir -p "$target_dir/runtime-licenses"
  cp -R "$license_dir"/. "$target_dir/runtime-licenses/"
  (cd "$target_dir" && sha512_file "$binary" runtime-manifest.json \
    hertzbeat-collector.cdx.json hertzbeat-otel-runtime.cdx.json \
    release-inventory.json > SHA512SUMS)
done

echo "Hybrid Collector release assets generated"
