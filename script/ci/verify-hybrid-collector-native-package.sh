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

if [ "$#" -ne 2 ]; then
  echo "usage: $0 <native-archive> <platform>" >&2
  exit 2
fi

archive=$1
platform=$2
listing=$(mktemp)
trap 'rm -f "$listing"' EXIT HUP INT TERM

case "$archive" in
  *.zip) unzip -Z1 "$archive" > "$listing" ;;
  *.tar.gz) tar -tzf "$archive" > "$listing" ;;
  *) echo "unsupported native archive: $archive" >&2; exit 2 ;;
esac

require_path() {
  if ! grep -Eq "$1" "$listing"; then
    echo "native archive is missing $2" >&2
    exit 1
  fi
}

require_path '/bin/foreground\.sh$|/bin/startup\.bat$' 'the foreground/native launcher'
require_path '/config/application\.yml$' 'the Collector configuration'
require_path '/LICENSE$' 'the Apache LICENSE'
require_path '/NOTICE$' 'the Apache NOTICE'
require_path "/runtime/$platform/hertzbeat-otel-runtime(\.exe)?$" 'the platform Go runtime'
require_path "/runtime/$platform/runtime-manifest\.json$" 'the runtime manifest'
require_path "/runtime/$platform/hertzbeat-collector\.cdx\.json$" 'the Collector compile/runtime CycloneDX SBOM'
require_path "/runtime/$platform/hertzbeat-otel-runtime\.cdx\.json$" 'the runtime CycloneDX SBOM'
require_path "/runtime/$platform/release-inventory\.json$" 'the SBOM release inventory'
require_path "/runtime/$platform/SHA512SUMS$" 'the runtime checksums'
require_path "/runtime/$platform/licenses/" 'the runtime dependency licenses'

case "$platform" in
  linux-*) require_path '/service/hertzbeat-collector\.service$' 'the systemd unit' ;;
  *)
    if grep -q '/service/hertzbeat-collector\.service$' "$listing"; then
      echo "non-Linux native archive must not contain a systemd unit" >&2
      exit 1
    fi
    ;;
esac

python3 "$repo_root/script/ci/verify-hybrid-collector-release-content.py" --native "$archive"

echo "Hybrid Collector native package contract passed for $platform"
