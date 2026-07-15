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

required_files="
$runtime_dir/go.mod
$runtime_dir/builder-config.yaml
$runtime_dir/config/collector-config.test.yaml
$runtime_dir/runtime-manifest.json
$runtime_dir/Makefile
$runtime_dir/README.md
"

for required_file in $required_files; do
  if [ ! -f "$required_file" ]; then
    echo "missing Hybrid Collector runtime file: $required_file" >&2
    exit 1
  fi
done

if grep -R "hertzbeat-collector-go" "$runtime_dir" >/dev/null 2>&1; then
  echo "the new runtime must not reference the retired hertzbeat-collector-go project" >&2
  exit 1
fi

for component in hostmetricsreceiver prometheusreceiver filelogreceiver otlpreceiver \
    memorylimiterprocessor resourceprocessor batchprocessor otlphttpexporter \
    healthcheckextension filestorage; do
  if ! grep -q "$component" "$runtime_dir/builder-config.yaml"; then
    echo "missing required Phase 0 component: $component" >&2
    exit 1
  fi
done

for pipeline_component in hostmetrics prometheus filelog otlp memory_limiter resource \
    batch otlphttp health_check file_storage traces; do
  if ! grep -q "$pipeline_component" "$runtime_dir/config/collector-config.test.yaml"; then
    echo "missing required Phase 0 pipeline configuration: $pipeline_component" >&2
    exit 1
  fi
done

echo "Hybrid Collector runtime layout contract passed"
