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

BINARY_NAME="${native.executable.packageName}"

cd "$(dirname "$0")/.."
DEPLOY_DIR=$(pwd)
APP_PATH="$DEPLOY_DIR/$BINARY_NAME"
CONF_DIR="$DEPLOY_DIR/config"
: "${HERTZBEAT_HOME:=$DEPLOY_DIR}"
export HERTZBEAT_HOME

if [ ! -x "$APP_PATH" ]; then
  echo "ERROR: native executable not found: $APP_PATH" >&2
  exit 1
fi

mkdir -p "$DEPLOY_DIR/data" "$DEPLOY_DIR/logs"
exec "$APP_PATH" --spring.config.location="$CONF_DIR/" "$@"
