#!/bin/sh

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

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <jvm-archive> <platform>" >&2
  exit 2
fi

archive=$1
platform=$2
extract_dir=$(mktemp -d)
trap 'chmod -R u+w "$extract_dir" 2>/dev/null || true; rm -rf "$extract_dir"' EXIT HUP INT TERM

python3 "$repo_root/script/ci/verify-hybrid-collector-release-content.py" --jvm "$archive"

case "$archive" in
  *.zip) unzip -q "$archive" -d "$extract_dir" ;;
  *.tar.gz) tar -xzf "$archive" -C "$extract_dir" ;;
  *) echo "unsupported JVM archive: $archive" >&2; exit 2 ;;
esac

roots=$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d -print)
if [ "$(printf '%s\n' "$roots" | sed '/^$/d' | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "JVM archive must contain exactly one root directory" >&2
  exit 1
fi
root=$roots

for required in config/application.yml README.md LICENSE NOTICE; do
  if [ ! -f "$root/$required" ]; then
    echo "JVM archive is missing root file: $required" >&2
    exit 1
  fi
done
application_jars=$(find "$root" -mindepth 1 -maxdepth 1 -type f \
  -name 'apache-hertzbeat-collector-*.jar' ! -name 'apache-hertzbeat-collector-native-*.jar' -print)
if [ "$(printf '%s\n' "$application_jars" | sed '/^$/d' | wc -l | tr -d ' ')" -ne 1 ]; then
  echo "JVM archive must contain exactly one Collector application jar" >&2
  exit 1
fi

python3 "$repo_root/script/ci/verify-hybrid-collector-jvm-runtime-assets.py" "$root" "$platform"

case "$platform" in
  windows-*)
    if [ ! -f "$root/bin/startup.bat" ] || [ ! -f "$root/bin/shutdown.bat" ]; then
      echo "JVM archive is missing its Windows startup or shutdown launcher" >&2
      exit 1
    fi
    ;;
  *)
    startup=$root/bin/startup.sh
    shutdown=$root/bin/shutdown.sh
    if [ ! -f "$startup" ] || [ ! -f "$shutdown" ]; then
      echo "JVM archive is missing its startup or shutdown launcher" >&2
      exit 1
    fi
    if [ ! -x "$startup" ] || [ ! -x "$shutdown" ]; then
      echo "JVM startup and shutdown launchers must be executable" >&2
      exit 1
    fi
    ;;
esac

echo "Hybrid Collector JVM package contract passed for $platform"
