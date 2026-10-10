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

package org.apache.hertzbeat.common.entity.metric;

import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * Authoritative HertzBeat-owned identity carried beside one native metric sample.
 * Missing optional authority remains {@code null}; it is never converted to a fake zero or unknown value.
 */
public record NativeMetricSystemContext(
        String workspaceId,
        Long entityId,
        String entityType,
        Long monitorId,
        String collectorId,
        String instance) {

    public NativeMetricSystemContext {
        workspaceId = trimToNull(workspaceId);
        entityId = positiveOrNull(entityId);
        entityType = trimToNull(entityType);
        monitorId = positiveOrNull(monitorId);
        collectorId = trimToNull(collectorId);
        instance = trimToNull(instance);
    }

    /**
     * Resolve the context that is intrinsic to a Collector response before manager entity enrichment.
     *
     * @param metricsData native metric response
     * @return intrinsic system context
     */
    public static NativeMetricSystemContext from(CollectRep.MetricsData metricsData) {
        if (metricsData == null) {
            return new NativeMetricSystemContext(null, null, null, null, null, null);
        }
        return new NativeMetricSystemContext(
                null,
                null,
                null,
                metricsData.getId(),
                metricsData.getMetadataValue(MetricDataConstants.COLLECTOR_ID),
                metricsData.getInstance());
    }

    /**
     * Return the fixed Greptime tag values in {@link NativeMetricSystemDimensions#TAG_NAMES} order.
     *
     * @return fixed-order tag values
     */
    public Object[] tagValues() {
        return new Object[] {
                workspaceId,
                entityId == null ? null : String.valueOf(entityId),
                entityType,
                monitorId == null ? null : String.valueOf(monitorId),
                collectorId,
                instance
        };
    }

    private static Long positiveOrNull(Long value) {
        return value != null && value > 0 ? value : null;
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
