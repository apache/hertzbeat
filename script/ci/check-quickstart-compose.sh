#!/bin/sh

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
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
compose_file="${repository_root}/script/docker-compose/hertzbeat-postgresql-greptimedb/docker-compose.yaml"
default_config=$(mktemp)
override_config=$(mktemp)
trap 'rm -f "$default_config" "$override_config"' EXIT HUP INT TERM

docker compose -f "$compose_file" config --format json > "$default_config"
HERTZBEAT_BIND_ADDRESS=192.0.2.10 \
  docker compose -f "$compose_file" config --format json > "$override_config"

assert_binding() {
  config_file=$1
  service=$2
  target=$3
  published=$4
  host_ip=$5

  jq -e \
    --arg service "$service" \
    --argjson target "$target" \
    --arg published "$published" \
    --arg host_ip "$host_ip" \
    '.services[$service].ports
      | any(.target == $target
        and .published == $published
        and .host_ip == $host_ip)' \
    "$config_file" > /dev/null
}

for service_port in 1157 1158; do
  assert_binding "$default_config" hertzbeat "$service_port" "$service_port" 127.0.0.1
  assert_binding "$override_config" hertzbeat "$service_port" "$service_port" 192.0.2.10
done

assert_binding "$default_config" postgres 5432 15432 127.0.0.1
for datastore_port in 4000 4001 4002 4003; do
  assert_binding "$default_config" greptime "$datastore_port" "1${datastore_port}" 127.0.0.1
done

echo "Quick-start Compose listener bindings are valid."
