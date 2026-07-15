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
cd "$repo_root"

./mvnw -pl hertzbeat-manager,hertzbeat-collector/hertzbeat-collector-collector -am \
  -Dtest='ManagedOtelRuntimeStatusTest,CollectServerTest,OtelRuntimeConfigTransactionTest,OtelRuntimeConfigurationTest,OtelRuntimeSupervisorTest,OtelRuntimeStatusProviderTest,CollectorRuntimeStatusRegistryTest,HeartbeatProcessorRuntimeStatusTest,CollectorServiceTest,ManageServerTest' \
  test -DskipITs -Dsurefire.failIfNoSpecifiedTests=false -DfailIfNoTests=false

./mvnw -pl hertzbeat-collector/hertzbeat-collector-collector -am \
  -Pnative -DskipTests prepare-package

echo "Hybrid Collector Java 25 and AOT verification passed"
