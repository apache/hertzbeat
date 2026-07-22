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

package org.apache.hertzbeat.manager.pojo.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import lombok.Builder;
import lombok.Data;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeStatus;

/**
 * Collector summary view.
 */
@Data
@Builder
@Schema(description = "collector summary")
public class CollectorSummary {

    @Schema(description = "the collector info")
    private CollectorInfo collector;

    @Schema(description = "the number of monitors pinned in this collector")
    private int pinMonitorNum;

    @Schema(description = "the number of monitors dispatched in this collector")
    private int dispatchMonitorNum;

    @Schema(description = "fresh status of the optional managed telemetry runtime")
    private ManagedOtelRuntimeStatus runtimeStatus;

    @Schema(description = "manager receive time of the runtime status")
    private Instant runtimeStatusReportedAt;

    @Schema(description = "safe application-instrumentation intake advertisement")
    private CollectorInstrumentationIntake instrumentationIntake;

    public CollectorSummary() {
        instrumentationIntake = CollectorInstrumentationIntake.notAdvertised("unknown");
    }

    public CollectorSummary(CollectorInfo collector, int pinMonitorNum, int dispatchMonitorNum,
                            ManagedOtelRuntimeStatus runtimeStatus, Instant runtimeStatusReportedAt,
                            CollectorInstrumentationIntake instrumentationIntake) {
        this.collector = collector;
        this.pinMonitorNum = pinMonitorNum;
        this.dispatchMonitorNum = dispatchMonitorNum;
        this.runtimeStatus = runtimeStatus;
        this.runtimeStatusReportedAt = runtimeStatusReportedAt;
        this.instrumentationIntake = instrumentationIntake == null
                ? CollectorInstrumentationIntake.notAdvertised(collectorIdOrUnknown(collector))
                : instrumentationIntake;
    }

    public void setInstrumentationIntake(CollectorInstrumentationIntake instrumentationIntake) {
        this.instrumentationIntake = instrumentationIntake == null
                ? CollectorInstrumentationIntake.notAdvertised(collectorIdOrUnknown(collector))
                : instrumentationIntake;
    }

    private static String collectorIdOrUnknown(CollectorInfo collector) {
        return collector == null || collector.getName() == null || collector.getName().isBlank()
                ? "unknown"
                : collector.getName();
    }

    /** Ensures Lombok-built summaries retain the mandatory intake object and its Collector identity. */
    public static class CollectorSummaryBuilder {

        public CollectorSummary build() {
            if (instrumentationIntake == null) {
                instrumentationIntake = CollectorInstrumentationIntake.notAdvertised(collectorIdOrUnknown(collector));
            }
            return new CollectorSummary(
                    collector,
                    pinMonitorNum,
                    dispatchMonitorNum,
                    runtimeStatus,
                    runtimeStatusReportedAt,
                    instrumentationIntake);
        }
    }
}
