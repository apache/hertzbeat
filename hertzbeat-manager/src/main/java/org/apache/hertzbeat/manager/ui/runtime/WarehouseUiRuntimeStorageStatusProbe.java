/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.ui.runtime;

import org.apache.hertzbeat.warehouse.service.MetricsDataService;
import org.apache.hertzbeat.warehouse.store.history.tsdb.greptime.GreptimeProperties;
import org.springframework.stereotype.Component;

/** Adapts the established Warehouse server health boundary for UI aggregation. */
@Component
final class WarehouseUiRuntimeStorageStatusProbe implements UiRuntimeStorageStatusProbe {

    private final MetricsDataService metricsDataService;
    private final GreptimeProperties greptimeProperties;

    WarehouseUiRuntimeStorageStatusProbe(
            MetricsDataService metricsDataService,
            GreptimeProperties greptimeProperties) {
        this.metricsDataService = metricsDataService;
        this.greptimeProperties = greptimeProperties;
    }

    @Override
    public boolean isAvailable() {
        // The public v1 contract names Greptime explicitly; another healthy
        // Warehouse implementation must not satisfy this Greptime status.
        if (!greptimeProperties.enabled()) {
            return false;
        }
        return Boolean.TRUE.equals(metricsDataService.getWarehouseStorageServerStatus());
    }
}
