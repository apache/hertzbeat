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

service_name=hertzbeat-collector.service
root_prefix=${HERTZBEAT_SYSTEMD_ROOT:-}
systemctl_command=${HERTZBEAT_SYSTEMCTL:-systemctl}
service_user=${HERTZBEAT_SYSTEMD_USER:-hertzbeat}
service_group=${HERTZBEAT_SYSTEMD_GROUP:-hertzbeat}

root_path() {
  printf '%s%s\n' "$root_prefix" "$1"
}

app_root=$(root_path /opt/hertzbeat-collector)
releases_dir=$app_root/releases
current_link=$app_root/current
config_root=$(root_path /etc/hertzbeat)
config_dir=$config_root/config
environment_file=$config_root/collector.env
data_dir=$(root_path /var/lib/hertzbeat-collector)
log_dir=$(root_path /var/log/hertzbeat-collector)
unit_file=$(root_path /etc/systemd/system/$service_name)
script_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
default_source=$(CDPATH= cd "$script_dir/.." && pwd)

usage() {
  echo "usage: $0 {install|upgrade} [native-package-directory]" >&2
  echo "       $0 {uninstall|purge}" >&2
  exit 2
}

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

require_root() {
  if [ -z "$root_prefix" ] && [ "$(id -u)" -ne 0 ]; then
    fail "systemd installation must run as root"
  fi
}

systemctl_run() {
  "$systemctl_command" "$@"
}

ensure_service_account() {
  if [ -n "$root_prefix" ]; then
    return
  fi
  if ! getent group "$service_group" >/dev/null 2>&1; then
    groupadd --system "$service_group"
  fi
  if ! id "$service_user" >/dev/null 2>&1; then
    useradd --system --gid "$service_group" --home-dir "$data_dir" \
      --no-create-home --shell /usr/sbin/nologin "$service_user"
  fi
}

secure_persistent_paths() {
  mkdir -p "$config_dir" "$data_dir" "$log_dir"
  chmod 0750 "$config_root" "$config_dir" "$data_dir" "$log_dir"
  if [ ! -e "$environment_file" ]; then
    : > "$environment_file"
  fi
  chmod 0600 "$environment_file"
  find "$config_dir" -type d -exec chmod 0750 {} \;
  find "$config_dir" -type f -exec chmod 0640 {} \;
  if [ -z "$root_prefix" ]; then
    chown root:"$service_group" "$config_root" "$config_dir" "$environment_file"
    find "$config_dir" -exec chown root:"$service_group" {} \;
    chown -R "$service_user":"$service_group" "$data_dir" "$log_dir"
  fi
}

validate_source() {
  source_dir=$1
  unit_source=$source_dir/service/$service_name
  [ -d "$source_dir" ] || fail "native package directory does not exist"
  [ -x "$source_dir/bin/foreground.sh" ] || fail "native package launcher is missing or not executable"
  [ -f "$source_dir/config/application.yml" ] || fail "native package configuration is missing"
  [ -f "$unit_source" ] || fail "systemd unit is missing beside the installer"

  native_count=0
  native_binary=
  for candidate in "$source_dir"/apache-hertzbeat-collector-native*; do
    if [ -f "$candidate" ] && [ -x "$candidate" ]; then
      native_count=$((native_count + 1))
      native_binary=$candidate
    fi
  done
  [ "$native_count" -eq 1 ] || fail "native package must contain exactly one executable Collector binary"

  runtime_count=0
  for runtime in "$source_dir"/runtime/linux-*/hertzbeat-otel-runtime; do
    if [ -f "$runtime" ] && [ -x "$runtime" ]; then
      runtime_count=$((runtime_count + 1))
    fi
  done
  [ "$runtime_count" -eq 1 ] || fail "native package must contain exactly one executable Linux telemetry runtime"
}

release_name() {
  source_dir=$1
  source_base=$(printf '%s' "$(basename "$source_dir")" | tr -c 'A-Za-z0-9._-' '-')
  binary_checksum=$(cksum "$native_binary" | awk '{print $1 "-" $2}')
  printf '%s-%s\n' "$source_base" "$binary_checksum"
}

prepare_release() {
  source_dir=$1
  release_id=$(release_name "$source_dir")
  release_dir=$releases_dir/$release_id
  if [ -d "$release_dir" ]; then
    return
  fi

  mkdir -p "$releases_dir"
  stage_dir=$releases_dir/.${release_id}.stage.$$
  rm -rf "$stage_dir"
  mkdir -p "$stage_dir"
  if ! cp -Rp "$source_dir/." "$stage_dir/"; then
    rm -rf "$stage_dir"
    fail "could not stage the native package"
  fi
  rm -rf "$stage_dir/config" "$stage_dir/data" "$stage_dir/logs"
  ln -s "$config_dir" "$stage_dir/config"
  ln -s "$data_dir" "$stage_dir/data"
  ln -s "$log_dir" "$stage_dir/logs"
  if [ -z "$root_prefix" ]; then
    chown -R root:"$service_group" "$stage_dir"
  fi
  mv "$stage_dir" "$release_dir"
}

switch_current() {
  target=$1
  next_link=$app_root/.current.$$
  rm -f "$next_link"
  ln -s "$target" "$next_link"
  rm -f "$current_link"
  mv "$next_link" "$current_link"
}

install_unit() {
  unit_parent=$(dirname "$unit_file")
  mkdir -p "$unit_parent"
  unit_stage=$unit_parent/.${service_name}.$$
  cp "$unit_source" "$unit_stage"
  chmod 0644 "$unit_stage"
  mv "$unit_stage" "$unit_file"
  systemctl_run daemon-reload
  systemctl_run enable "$service_name"
}

install_or_upgrade() {
  action=$1
  source_dir=$2
  validate_source "$source_dir"
  if [ "$action" = upgrade ] && [ ! -L "$current_link" ]; then
    fail "upgrade requires an existing installation"
  fi

  ensure_service_account
  mkdir -p "$app_root"
  if [ ! -f "$config_dir/application.yml" ]; then
    mkdir -p "$config_dir"
    cp -Rp "$source_dir/config/." "$config_dir/"
  fi
  secure_persistent_paths
  prepare_release "$source_dir"
  install_unit

  previous_release=
  if [ -L "$current_link" ]; then
    previous_release=$(readlink "$current_link")
  fi
  if [ "$previous_release" = "$release_dir" ]; then
    systemctl_run start "$service_name"
    echo "Hybrid Collector is installed at $current_link"
    return
  fi

  if [ -n "$previous_release" ]; then
    systemctl_run stop "$service_name"
  fi
  switch_current "$release_dir"
  if systemctl_run start "$service_name"; then
    echo "Hybrid Collector is installed at $current_link"
    return
  fi

  if [ -n "$previous_release" ]; then
    switch_current "$previous_release"
    if ! systemctl_run start "$service_name"; then
      echo "ERROR: new release failed and the previous release could not be restarted" >&2
      exit 1
    fi
    echo "ERROR: new release failed; restored the previous release" >&2
    exit 1
  fi
  rm -f "$current_link"
  fail "Collector failed to start"
}

uninstall() {
  systemctl_run disable --now "$service_name" >/dev/null 2>&1 || true
  rm -f "$unit_file"
  systemctl_run daemon-reload >/dev/null 2>&1 || true
  rm -rf "$app_root"
  echo "Hybrid Collector binaries were removed; configuration and runtime state were preserved"
}

purge() {
  uninstall
  rm -rf "$config_root" "$data_dir" "$log_dir"
  echo "Hybrid Collector configuration and runtime state were removed"
}

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
require_root
action=$1
case "$action" in
  install|upgrade)
    [ "$#" -le 2 ] || usage
    install_or_upgrade "$action" "${2:-$default_source}"
    ;;
  uninstall)
    [ "$#" -eq 1 ] || usage
    uninstall
    ;;
  purge)
    [ "$#" -eq 1 ] || usage
    purge
    ;;
  *) usage ;;
esac
