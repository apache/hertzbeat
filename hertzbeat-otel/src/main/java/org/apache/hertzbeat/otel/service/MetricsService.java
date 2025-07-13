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

package org.apache.hertzbeat.otel.service;

import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.Meter;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

/**
 * Service for collecting and exporting HertzBeat's internal metrics using OpenTelemetry.
 */
@Service
public class MetricsService {

    private static final String STATUS_SUCCESS = "success";
    private static final String STATUS_FAIL = "fail";
    private static final String LABEL_STATUS = "status";
    private static final String LABEL_MONITOR_TYPE = "monitor_type";
    private static final String LABEL_MONITOR_ID = "monitor_id";
    private static final String LABEL_MONITOR_NAME = "monitor_name";
    private static final String LABEL_MONITOR_TARGET = "monitor_target";

    private final LongCounter collectTotalCounter;
    private final DoubleHistogram collectDurationHistogram;

    public MetricsService(Meter meter) {
        this.collectTotalCounter = meter.counterBuilder("hertzbeat_collect_total")
                .setDescription("The total number of collection tasks executed.")
                .build();

        this.collectDurationHistogram = meter.histogramBuilder("hertzbeat_collect_duration_seconds")
                .setDescription("The duration of collection task executions, in seconds.")
                .setUnit("s")
                .build();
    }

    /**
     * Records a successful collection task.
     *
     * @param monitor   The monitor instance.
     * @param duration  The duration of the collection in milliseconds.
     */
    public void recordCollect(Monitor monitor, long duration) {
        Attributes attributes = buildAttributes(monitor, STATUS_SUCCESS);
        collectTotalCounter.add(1, attributes);
        collectDurationHistogram.record(TimeUnit.MILLISECONDS.toSeconds(duration), attributes);
    }

    /**
     * Records a failed collection task.
     *
     * @param monitor   The monitor instance.
     * @param duration  The duration of the collection in milliseconds.
     */
    public void recordCollect(Monitor monitor, long duration, Throwable throwable) {
        Attributes attributes = buildAttributes(monitor, STATUS_FAIL);
        collectTotalCounter.add(1, attributes);
        collectDurationHistogram.record(TimeUnit.MILLISECONDS.toSeconds(duration), attributes);
    }

    private Attributes buildAttributes(Monitor monitor, String status) {
        return Attributes.builder()
                .put(LABEL_STATUS, status)
                .put(LABEL_MONITOR_ID, String.valueOf(monitor.getId()))
                .put(LABEL_MONITOR_NAME, monitor.getName())
                .put(LABEL_MONITOR_TYPE, monitor.getApp())
                .put(LABEL_MONITOR_TARGET, monitor.getHost())
                .build();
    }
}