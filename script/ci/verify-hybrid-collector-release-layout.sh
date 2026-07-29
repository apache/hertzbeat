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
jvm_dockerfile=script/docker/collector/Dockerfile
foreground=script/assembly/collector/bin-native/foreground.sh
systemd_unit=script/assembly/collector/systemd/hertzbeat-collector.service
systemd_installer=script/assembly/collector/systemd/install-systemd.sh
systemd_readme=script/assembly/collector/systemd/README-systemd.md
native_assembly=script/assembly/collector/assembly-native.xml
collector_pom=hertzbeat-collector/hertzbeat-collector-collector/pom.xml
release_assets=script/ci/generate-hybrid-collector-release-assets.sh
release_workflow=.github/workflows/hybrid-collector-release.yml
nightly_workflow=.github/workflows/nightly-build.yml
release_scanner=script/ci/verify-hybrid-collector-release-content.py
release_scanner_test=script/ci/test_verify_hybrid_collector_release_content.py
jvm_runtime_asset_verifier=script/ci/verify-hybrid-collector-jvm-runtime-assets.py
jvm_package_verifier_test=script/ci/test_verify_hybrid_collector_jvm_package.py
runtime_sbom_platform_verifier=script/ci/verify-otel-runtime-sbom-platform.py
runtime_sbom_platform_test=script/ci/test_verify_otel_runtime_sbom_platform.py
native_package_verifier=script/ci/verify-hybrid-collector-native-package.sh
jvm_package_verifier=script/ci/verify-hybrid-collector-jvm-package.sh
native_image_verifier=script/ci/verify-hybrid-collector-native-image.sh
native_container_context=script/ci/prepare-hybrid-collector-native-container-context.sh

for required in "$dockerfile" "$jvm_dockerfile" "$foreground" "$systemd_unit" "$systemd_installer" "$systemd_readme" \
  "$release_assets" "$release_workflow" "$nightly_workflow" \
  "$release_scanner" "$release_scanner_test" "$jvm_runtime_asset_verifier" "$jvm_package_verifier_test" \
  "$runtime_sbom_platform_verifier" "$runtime_sbom_platform_test" \
  "$native_package_verifier" "$jvm_package_verifier" "$native_image_verifier" \
  "$native_container_context"; do
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
grep -q 'ExecStart=/opt/hertzbeat-collector/current/bin/foreground.sh' "$systemd_unit"
grep -q 'WorkingDirectory=/opt/hertzbeat-collector/current' "$systemd_unit"
grep -q 'ReadWritePaths=/etc/hertzbeat /var/lib/hertzbeat-collector /var/log/hertzbeat-collector' "$systemd_unit"
grep -q 'Restart=on-failure' "$systemd_unit"
grep -q 'native.service.installer.include' "$native_assembly"
grep -q 'native.service.readme.include' "$native_assembly"
grep -q '<native.service.installer.include>install-systemd.sh' "$collector_pom"
grep -q '<native.service.readme.include>README-systemd.md' "$collector_pom"
grep -q 'test_hybrid_collector_systemd_install.py' "$release_workflow"
grep -q 'native.service.dir' "$native_assembly"
grep -q 'hertzbeat-otel-runtime.cdx.json' "$native_assembly"
grep -q 'hertzbeat-collector.cdx.json' "$native_assembly"
grep -q 'release-inventory.json' "$native_assembly"
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
grep -q 'cyclonedx-maven-plugin:2.9.1:makeBom' "$release_assets"
grep -q -- '--collector-sbom' "$release_assets"
grep -q 'GOOS="\$target_goos" GOARCH="\$target_goarch"' "$release_assets"
grep -q 'verify-otel-runtime-sbom-platform.py.*"\$target_dir"' "$release_assets"
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
grep -q 'test_verify_hybrid_collector_release_content.py' "$release_workflow"
grep -q 'test_verify_hybrid_collector_jvm_package.py' "$release_workflow"
grep -q 'test_verify_otel_runtime_sbom_platform.py' "$release_workflow"
grep -q 'test_prepare_hybrid_collector_native_container_context.py' "$release_workflow"
grep -q -- '--source' "$release_workflow"
grep -q -- '-Pruntime' "$release_workflow"
grep -q -- '--jvm' "$jvm_package_verifier"
grep -q 'verify-hybrid-collector-jvm-runtime-assets.py' "$jvm_package_verifier"
grep -q -- '--native' "$native_package_verifier"
grep -q 'verify-hybrid-collector-jvm-package.sh' "$release_workflow"
grep -q 'verify-hybrid-collector-jvm-package.sh.*"\$1".*linux-amd64' "$release_workflow"
grep -q 'verify-hybrid-collector-native-image.sh' "$release_workflow"
grep -q 'prepare-hybrid-collector-native-container-context.sh' "$release_workflow"
grep -q 'context: target/native-container-context' "$release_workflow"

nightly_runtime_build_line=$(grep -n 'make -C hertzbeat-otel-runtime release-assets' \
  "$nightly_workflow" | head -1 | cut -d: -f1)
nightly_no_cgo_verify_line=$(grep -n 'verify-otel-runtime-package-layout.sh' \
  "$nightly_workflow" | head -1 | cut -d: -f1)
nightly_amd64_verify_line=$(grep -n 'verify-hybrid-collector-jvm-package.sh.*linux-amd64' \
  "$nightly_workflow" | head -1 | cut -d: -f1)
nightly_arm64_verify_line=$(grep -n 'verify-hybrid-collector-jvm-package.sh.*linux-arm64' \
  "$nightly_workflow" | head -1 | cut -d: -f1)
nightly_backend_build_line=$(grep -n 'name: Build the Backend' "$nightly_workflow" \
  | head -1 | cut -d: -f1)
nightly_collector_image_line=$(grep -n 'name: Build and Push Collector' "$nightly_workflow" \
  | head -1 | cut -d: -f1)
if [ -z "$nightly_runtime_build_line" ] || [ -z "$nightly_no_cgo_verify_line" ] \
    || [ -z "$nightly_backend_build_line" ] || [ -z "$nightly_amd64_verify_line" ] \
    || [ -z "$nightly_arm64_verify_line" ] \
    || [ -z "$nightly_collector_image_line" ] \
    || [ "$nightly_runtime_build_line" -ge "$nightly_no_cgo_verify_line" ] \
    || [ "$nightly_no_cgo_verify_line" -ge "$nightly_backend_build_line" ] \
    || [ "$nightly_backend_build_line" -ge "$nightly_amd64_verify_line" ] \
    || [ "$nightly_backend_build_line" -ge "$nightly_arm64_verify_line" ] \
    || [ "$nightly_amd64_verify_line" -ge "$nightly_collector_image_line" ] \
    || [ "$nightly_arm64_verify_line" -ge "$nightly_collector_image_line" ]; then
  echo "nightly Collector must verify no-CGO runtimes and both Linux JVM Hybrid packages before publication" >&2
  exit 1
fi
grep -q 'java-version: 25' "$nightly_workflow"
grep -q -- '-Pruntime' "$nightly_workflow"
grep -Fq 'dist/apache-hertzbeat-collector-*-bin-linux_amd64.tar.gz' "$nightly_workflow"
grep -Fq 'dist/apache-hertzbeat-collector-*-bin-linux_arm64.tar.gz' "$nightly_workflow"
if grep -q 'verify-hybrid-collector-jvm-package.sh.*generic' "$nightly_workflow"; then
  echo "nightly Collector publication must not verify or publish the generic JVM-only package" >&2
  exit 1
fi

required_java=$(sed -n 's:.*<java.version>\([0-9][0-9]*\)</java.version>.*:\1:p' pom.xml | head -1)
jvm_runtime_java=$(sed -n 's#^FROM eclipse-temurin:\([0-9][0-9]*\)-.*#\1#p' "$jvm_dockerfile" | head -1)
if [ -z "$required_java" ] || [ "$required_java" != "25" ] \
    || [ "$jvm_runtime_java" != "$required_java" ]; then
  echo "JVM Hybrid Collector image runtime must match the repository Java 25 target" >&2
  exit 1
fi
grep -q '^ARG TARGETARCH$' "$jvm_dockerfile"
grep -Fq 'apache-hertzbeat-collector-*-bin-linux_${TARGETARCH}.tar.gz' "$jvm_dockerfile"
grep -Fq 'WORKDIR /opt/hertzbeat-collector' "$jvm_dockerfile"
if grep -Fq 'apache-hertzbeat-collector-*-bin.tar.gz' "$jvm_dockerfile"; then
  echo "JVM Hybrid Collector image must not consume the generic JVM-only package" >&2
  exit 1
fi

for release_path in \
  "'pom.xml'" \
  "'.github/workflows/nightly-build.yml'" \
  "'hertzbeat-observability/**'" \
  "'hertzbeat-otel/**'" \
  "'hertzbeat-startup/**'"; do
  if ! grep -Fq -- "- $release_path" "$release_workflow"; then
    echo "Hybrid Collector release workflow does not watch $release_path" >&2
    exit 1
  fi
done

grep -q '^COPY collector-native-linux-${TARGETARCH}\.tar\.gz ' "$dockerfile"
grep -q 'verify-hybrid-collector-release-content.py' "$dockerfile"
if grep -q '^ADD ' "$dockerfile"; then
  echo "native image must not auto-extract an unverified archive with ADD" >&2
  exit 1
fi
verify_line=$(grep -n 'sh ./script/ci/verify-hybrid-collector-native-package.sh' "$dockerfile" | head -1 | cut -d: -f1)
extract_line=$(grep -n 'tar -xzf' "$dockerfile" | head -1 | cut -d: -f1)
if [ -z "$verify_line" ] || [ -z "$extract_line" ] || [ "$verify_line" -ge "$extract_line" ]; then
  echo "native image must verify its archive before explicit extraction" >&2
  exit 1
fi

for descriptor in script/assembly/collector/assembly.xml \
  script/assembly/collector/assembly-macos-arm64.xml \
  script/assembly/collector/assembly-macos-amd64.xml \
  script/assembly/collector/assembly-linux-arm64.xml \
  script/assembly/collector/assembly-linux-amd64.xml \
  script/assembly/collector/assembly-windows-64.xml; do
  if [ "$(grep -Fc '<include>${project.build.finalName}.jar</include>' "$descriptor")" -ne 1 ]; then
    echo "JVM descriptor must select exactly the application build artifact: $descriptor" >&2
    exit 1
  fi
  if grep -Fq '<include>*.jar</include>' "$descriptor"; then
    echo "JVM descriptor must not select arbitrary target JARs: $descriptor" >&2
    exit 1
  fi
done

for descriptor in script/assembly/collector/assembly-macos-arm64.xml \
  script/assembly/collector/assembly-macos-amd64.xml \
  script/assembly/collector/assembly-linux-arm64.xml \
  script/assembly/collector/assembly-linux-amd64.xml \
  script/assembly/collector/assembly-windows-64.xml; do
  grep -Fq '<directory>../../script/assembly/collector/bin</directory>' "$descriptor"
  grep -Fq '<directory>../../jdk/' "$descriptor"
  grep -Fq '<directory>../../script/ext-lib</directory>' "$descriptor"
  grep -Fq '<directory>../../</directory>' "$descriptor"
  grep -Fq '<directory>../../material/licenses/collector</directory>' "$descriptor"
  for runtime_asset in runtime-manifest.json hertzbeat-collector.cdx.json \
      hertzbeat-otel-runtime.cdx.json release-inventory.json SHA512SUMS; do
    if [ "$(grep -Fc "<include>$runtime_asset</include>" "$descriptor")" -ne 1 ]; then
      echo "platform JVM descriptor must package $runtime_asset exactly once: $descriptor" >&2
      exit 1
    fi
  done
  if [ "$(grep -Fc 'runtime-licenses</directory>' "$descriptor")" -ne 1 ]; then
    echo "platform JVM descriptor must package runtime licenses exactly once: $descriptor" >&2
    exit 1
  fi
  if grep -Eq '<directory>\.\./[^.]' "$descriptor"; then
    echo "platform JVM descriptor contains a stale module-relative input: $descriptor" >&2
    exit 1
  fi
done

echo "Hybrid Collector release layout contract passed"
