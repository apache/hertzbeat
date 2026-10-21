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

package org.apache.hertzbeat.manager.component.status;

import java.util.List;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.StatusPageHistory;

/**
 * Read-only reduction of raw samples and already aggregated history.
 */
public final class StatusPageHistorySummary {

    private StatusPageHistorySummary() {
    }

    public static StatusPageHistory summarize(List<StatusPageHistory> histories, long componentId,
                                              long timestamp, int interval, byte emptyState) {
        int normal = 0;
        int abnormal = 0;
        int unknown = 0;
        for (StatusPageHistory history : histories) {
            int savedNormal = value(history.getNormal());
            int savedAbnormal = value(history.getAbnormal());
            int savedUnknown = value(history.getUnknowing());
            if (savedNormal + savedAbnormal + savedUnknown > 0) {
                normal += savedNormal;
                abnormal += savedAbnormal;
                unknown += savedUnknown;
            } else if (history.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL) {
                abnormal += interval;
            } else if (history.getState() == CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN) {
                unknown += interval;
            } else {
                normal += interval;
            }
        }
        double total = (double) normal + abnormal + unknown;
        byte state = emptyState;
        if (!histories.isEmpty()) {
            state = abnormal > 0 ? CommonConstants.STATUS_PAGE_COMPONENT_STATE_ABNORMAL
                    : normal > 0 ? CommonConstants.STATUS_PAGE_COMPONENT_STATE_NORMAL
                    : CommonConstants.STATUS_PAGE_COMPONENT_STATE_UNKNOWN;
        }
        return StatusPageHistory.builder().componentId(componentId).timestamp(timestamp)
                .normal(normal).abnormal(abnormal).unknowing(unknown)
                .uptime(total > 0 ? normal / total : 0).state(state).build();
    }

    private static int value(Integer value) {
        return value == null ? 0 : value;
    }
}
