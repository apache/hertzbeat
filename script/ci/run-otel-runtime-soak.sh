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

if [ -z "${HERTZBEAT_OTEL_RUNTIME_BINARY:-}" ]; then
    echo "HERTZBEAT_OTEL_RUNTIME_BINARY is required" >&2
    exit 2
fi

SCRIPT_DIRECTORY=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIRECTORY/../.." && pwd)
SOAK_DURATION=${HERTZBEAT_OTEL_SOAK_DURATION:-PT24H}
SOAK_INTERVAL=${HERTZBEAT_OTEL_SOAK_INTERVAL:-PT30M}

cd "$REPOSITORY_ROOT"
exec ./mvnw \
    -pl hertzbeat-collector/hertzbeat-collector-collector \
    -am \
    -Dtest=OtelRuntimeSoakIt \
    -DskipITs \
    -Dsurefire.failIfNoSpecifiedTests=false \
    -DfailIfNoTests=false \
    -DforkCount=1 \
    -DreuseForks=false \
    -Dhertzbeat.otel.soak.duration="$SOAK_DURATION" \
    -Dhertzbeat.otel.soak.interval="$SOAK_INTERVAL" \
    test
