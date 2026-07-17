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
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

set -eu

repo_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <release-directory> <empty-container-context>" >&2
  exit 2
fi

release_dir=$1
context_dir=$2

if [ ! -d "$release_dir" ]; then
  echo "native release directory is missing: $release_dir" >&2
  exit 1
fi
if [ -e "$context_dir" ] && [ -n "$(find "$context_dir" -mindepth 1 -print -quit 2>/dev/null)" ]; then
  echo "native container context must be absent or empty: $context_dir" >&2
  exit 1
fi

find_archive() {
  platform=$1
  first=$(find "$release_dir" -maxdepth 1 -type f -name "*-${platform}-bin.tar.gz" -print -quit)
  count=$(find "$release_dir" -maxdepth 1 -type f -name "*-${platform}-bin.tar.gz" -print | wc -l | tr -d ' ')
  if [ "$count" -ne 1 ] || [ -z "$first" ]; then
    echo "expected exactly one Native Collector archive for $platform in $release_dir" >&2
    exit 1
  fi
  printf '%s\n' "$first"
}

amd64_archive=$(find_archive linux-amd64)
arm64_archive=$(find_archive linux-arm64)

# Verify before creating the build context so rejected inputs can never be copied into it.
"$repo_root/script/ci/verify-hybrid-collector-native-package.sh" "$amd64_archive" linux-amd64
"$repo_root/script/ci/verify-hybrid-collector-native-package.sh" "$arm64_archive" linux-arm64

mkdir -p "$context_dir/script/ci"
cp "$amd64_archive" "$context_dir/collector-native-linux-amd64.tar.gz"
cp "$arm64_archive" "$context_dir/collector-native-linux-arm64.tar.gz"
cp "$repo_root/script/ci/verify-hybrid-collector-native-package.sh" "$context_dir/script/ci/"
cp "$repo_root/script/ci/verify-hybrid-collector-release-content.py" "$context_dir/script/ci/"

echo "Verified Hybrid Collector native container context prepared"
