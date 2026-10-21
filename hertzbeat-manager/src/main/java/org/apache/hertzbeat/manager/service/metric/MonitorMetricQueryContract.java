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

package org.apache.hertzbeat.manager.service.metric;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.util.StringUtils;

/** Shared authoritative bounds and routing rules for exact monitor metric queries. */
public final class MonitorMetricQueryContract {

    public static final long MAX_EXACT_DURATION_MILLIS = 12L * 7 * 24 * 60 * 60 * 1_000;

    private MonitorMetricQueryContract() {
    }

    public static long exactDurationMillis(Long start, Long end) {
        return start == null || end == null || start <= 0 || end <= start ? -1 : end - start;
    }

    public static boolean isExactWindowAllowed(Long start, Long end) {
        long duration = exactDurationMillis(start, end);
        return duration > 0 && duration <= MAX_EXACT_DURATION_MILLIS;
    }

    public static boolean isStaticScrape(String scrape) {
        return !StringUtils.hasText(scrape) || CommonConstants.SCRAPE_STATIC.equalsIgnoreCase(scrape);
    }

    public static String definitionSource(Monitor monitor) {
        return isStaticScrape(monitor.getScrape()) ? monitor.getApp() : monitor.getScrape();
    }

    public static String historyApp(Monitor monitor) {
        return CommonConstants.PROMETHEUS.equalsIgnoreCase(monitor.getApp())
                ? CommonConstants.PROMETHEUS_APP_PREFIX + monitor.getName() : definitionSource(monitor);
    }
}
