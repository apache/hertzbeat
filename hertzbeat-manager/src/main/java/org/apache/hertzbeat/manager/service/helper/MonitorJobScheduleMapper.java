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

package org.apache.hertzbeat.manager.service.helper;

import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.util.StringUtils;

/** Maps the persisted monitor schedule contract to a dispatched collection job. */
public final class MonitorJobScheduleMapper {

    private static final String INTERVAL_SCHEDULE = "interval";

    private MonitorJobScheduleMapper() {
    }

    public static void apply(Monitor monitor, Job job) {
        job.setDefaultInterval(monitor.getIntervals());
        if (StringUtils.hasText(monitor.getScheduleType())) {
            job.setScheduleType(monitor.getScheduleType());
            job.setCronExpression(monitor.getCronExpression());
        } else {
            job.setScheduleType(INTERVAL_SCHEDULE);
            job.setCronExpression(null);
        }
    }
}
