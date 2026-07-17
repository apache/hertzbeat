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

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "usage: $0 <image> [platform]" >&2
  exit 2
fi

image=$1
platform=${2:-linux/amd64}
container="hertzbeat-native-image-$$"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

docker image inspect "$image" >/dev/null

image_user=$(docker image inspect --format '{{.Config.User}}' "$image")
case "$image_user" in
  ''|0|0:*|root|root:*)
    echo "native Collector image must declare a non-root user" >&2
    exit 1
    ;;
esac

entrypoint=$(docker image inspect --format '{{json .Config.Entrypoint}}' "$image")
if [ "$entrypoint" != '["./bin/foreground.sh"]' ]; then
  echo "native Collector image must start the foreground launcher directly" >&2
  exit 1
fi

docker run --rm --platform "$platform" --entrypoint sh "$image" -ec '
  test "$(id -u)" -ne 0
  ! command -v java >/dev/null 2>&1
  test -x ./bin/foreground.sh
  native_executable=
  for candidate in ./apache-hertzbeat-collector-native-*; do
    if [ -x "$candidate" ]; then
      native_executable=$candidate
      break
    fi
  done
  test -n "$native_executable"
  test -w ./data
  test -w ./logs
  marker="image-write-proof-$$"
  : > "./data/$marker"
  : > "./logs/$marker"
  rm -f "./data/$marker" "./logs/$marker"
'

docker run --detach --name "$container" --platform "$platform" \
  --env IDENTITY=native-image-proof \
  --env MANAGER_HOST=127.0.0.1 \
  --env MANAGER_PORT=1 \
  --env HERTZBEAT_OTEL_RUNTIME_ENABLED=true \
  --env HERTZBEAT_OTLP_TOKEN=native-image-proof-token \
  --env HERTZBEAT_OTLP_HTTP_ENDPOINT=http://127.0.0.1:1/api/otlp \
  "$image" --server.port=0 >/dev/null

attempt=0
while [ "$attempt" -lt 45 ]; do
  if [ "$(docker inspect --format '{{.State.Running}}' "$container")" != true ]; then
    echo "native Collector image stopped before its managed Runtime became ready" >&2
    exit 1
  fi
  if docker exec "$container" sh -ec '
      test "$(awk "/^Uid:/{print \$2}" /proc/1/status)" -ne 0
      tr "\000" " " < /proc/1/cmdline | grep -q "hertzbeat-collector-native"
      for status in /proc/[0-9]*/status; do
        cmdline=${status%/status}/cmdline
        if [ "$cmdline" = "/proc/$$/cmdline" ]; then
          continue
        fi
        if [ -r "$cmdline" ] && tr "\000" " " < "$cmdline" | grep -q "hertzbeat-otel-runtime"; then
          test "$(awk "/^PPid:/{print \$2}" "$status")" -eq 1
          exit 0
        fi
      done
      exit 1
    ' 2>/dev/null; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done

if [ "$attempt" -ge 45 ]; then
  echo "native Collector image did not supervise its bundled Runtime child" >&2
  exit 1
fi

docker stop --time 35 "$container" >/dev/null
if [ "$(docker inspect --format '{{.State.Running}}' "$container")" != false ]; then
  echo "native Collector image did not stop after SIGTERM" >&2
  exit 1
fi
docker rm "$container" >/dev/null
trap - EXIT HUP INT TERM

echo "Hybrid Collector native image runtime contract passed"
