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
temporary_directory=$(mktemp -d)
trap 'rm -f "$temporary_directory"/*.json; rmdir "$temporary_directory"' EXIT HUP INT TERM

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

assert_all_bindings() {
  config_file=$1
  expected_host=$2

  jq -e \
    --arg expected_host "$expected_host" \
    '[.services[]?.ports[]?] | length > 0 and all(.host_ip == $expected_host)' \
    "$config_file" > /dev/null
}

assert_non_hertzbeat_bindings() {
  config_file=$1
  expected_host=$2

  jq -e \
    --arg expected_host "$expected_host" \
    '[.services | to_entries[] | select(.key != "hertzbeat") | .value.ports[]?]
      | all(.host_ip == $expected_host)' \
    "$config_file" > /dev/null
}

for variant in \
  hertzbeat-mysql-iotdb \
  hertzbeat-mysql-tdengine \
  hertzbeat-mysql-victoria-metrics \
  hertzbeat-postgresql-greptimedb \
  hertzbeat-postgresql-victoria-metrics
do
  compose_file="${repository_root}/script/docker-compose/${variant}/docker-compose.yaml"
  default_config="${temporary_directory}/${variant}-default.json"
  override_config="${temporary_directory}/${variant}-override.json"

  unset HERTZBEAT_BIND_ADDRESS HERTZBEAT_OTLP_BIND_ADDRESS
  POSTGRES_PASSWORD=compose-config-test \
    docker compose -f "$compose_file" config --format json > "$default_config"
  HERTZBEAT_BIND_ADDRESS=192.0.2.10 \
  HERTZBEAT_OTLP_BIND_ADDRESS=192.0.2.20 \
  POSTGRES_PASSWORD=compose-config-test \
    docker compose -f "$compose_file" config --format json > "$override_config"

  assert_all_bindings "$default_config" 127.0.0.1
  for service_port in 1157 1158; do
    assert_binding "$override_config" hertzbeat "$service_port" "$service_port" 192.0.2.10
  done
  assert_binding "$override_config" hertzbeat 14317 14317 192.0.2.20
  assert_non_hertzbeat_bindings "$override_config" 127.0.0.1
done

echo "Quick-start Compose listener bindings are valid."
