#!/usr/bin/env bash

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

export WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT="${WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT:-http://127.0.0.1:${GREPTIME_HTTP_PORT}}"
export WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS="${WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS:-127.0.0.1:${GREPTIME_GRPC_PORT}}"
export WAREHOUSE_STORE_GREPTIME_EXPIRE_TIME="${WAREHOUSE_STORE_GREPTIME_EXPIRE_TIME:-1d}"

printf 'workspace backend Greptime HTTP endpoint: %s\n' "${WAREHOUSE_STORE_GREPTIME_HTTP_ENDPOINT}"
printf 'workspace backend Greptime gRPC endpoints: %s\n' "${WAREHOUSE_STORE_GREPTIME_GRPC_ENDPOINTS}"
printf 'workspace backend Greptime expire time: %s\n' "${WAREHOUSE_STORE_GREPTIME_EXPIRE_TIME}"

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
