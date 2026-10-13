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
first=$(mktemp)
second=$(mktemp)
trap 'rm -f "$first" "$second"' EXIT HUP INT TERM

hash_binaries() {
  if command -v sha256sum >/dev/null 2>&1; then
    find dist -type f -name 'hertzbeat-otel-runtime*' -print0 | sort -z | xargs -0 sha256sum
  else
    find dist -type f -name 'hertzbeat-otel-runtime*' -print0 | sort -z | xargs -0 shasum -a 256
  fi
}

make -C "$runtime_dir" build-platforms
(cd "$runtime_dir" && hash_binaries) > "$first"
make -C "$runtime_dir" build-platforms
(cd "$runtime_dir" && hash_binaries) > "$second"

if ! cmp -s "$first" "$second"; then
  echo "Go runtime binaries are not reproducible across identical builds" >&2
  diff -u "$first" "$second" >&2 || true
  exit 1
fi

echo "Hybrid Collector Go runtime reproducibility contract passed"
