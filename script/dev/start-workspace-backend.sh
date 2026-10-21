#!/usr/bin/env bash

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

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROFILE="${SPRING_PROFILES_ACTIVE:-local}"
JVM_ADD_OPENS="${JVM_ADD_OPENS:---add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED}"

resolve_mapped_port() {
  local container_port="$1"
  local fallback_port="$2"

  if command -v docker >/dev/null 2>&1; then
    local mapping mapped_port
    mapping="$(docker port compose-greptimedb "${container_port}/tcp" 2>/dev/null | head -n 1 || true)"
    mapped_port="${mapping##*:}"
    if [[ -n "${mapped_port}" && "${mapped_port}" != "${mapping}" ]]; then
      printf '%s\n' "${mapped_port}"
      return
    fi
  fi

  printf '%s\n' "${fallback_port}"
}

GREPTIME_HTTP_PORT="${GREPTIME_HTTP_PORT:-$(resolve_mapped_port 4000 4000)}"
GREPTIME_GRPC_PORT="${GREPTIME_GRPC_PORT:-$(resolve_mapped_port 4001 4001)}"

export WAREHOUSE_STORE_DUCKDB_ENABLED="${WAREHOUSE_STORE_DUCKDB_ENABLED:-false}"
export WAREHOUSE_STORE_GREPTIME_ENABLED="${WAREHOUSE_STORE_GREPTIME_ENABLED:-true}"
export WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT="${WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT:-http://127.0.0.1:${GREPTIME_HTTP_PORT}}"
export WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS="${WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS:-127.0.0.1:${GREPTIME_GRPC_PORT}}"
export WAREHOUSE_STORE_GREPTIME_EXPIRE_TIME="${WAREHOUSE_STORE_GREPTIME_EXPIRE_TIME:-1d}"

require_greptime() {
  local health_endpoint="${WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT%/}/health"
  local max_attempts="${GREPTIME_HEALTH_ATTEMPTS:-20}"
  local attempt

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time 2 "${health_endpoint}" >/dev/null; then
      return
    fi
    sleep 0.5
  done

  printf 'workspace backend requires a healthy GreptimeDB at %s\n' "${health_endpoint}" >&2
  return 1
}

printf 'workspace backend Greptime HTTP endpoint: %s\n' "${WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT}"
printf 'workspace backend Greptime gRPC endpoints: %s\n' "${WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS}"
printf 'workspace backend Greptime expire time: %s\n' "${WAREHOUSE_STORE_GREPTIME_EXPIRE_TIME}"

require_greptime

cd "${ROOT_DIR}"

./mvnw \
  -pl hertzbeat-startup \
  -am \
  -DskipTests \
  -Dcheckstyle.skip=true \
  install

exec ./mvnw \
  -f "${ROOT_DIR}/hertzbeat-startup/pom.xml" \
  -DskipTests \
  -Dcheckstyle.skip=true \
  -Dspring-boot.run.profiles="${PROFILE}" \
  -Dspring-boot.run.jvmArguments="${JVM_ADD_OPENS}" \
  spring-boot:run
