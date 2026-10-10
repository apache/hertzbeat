/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.common.observability.dto.handoff;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.entity.EntitySignalEvidenceBundle;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;
import org.apache.hertzbeat.common.observability.model.ObservedEntityContext;

/**
 * Request payload for building entity response handoffs.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntityResponseHandoffsRequest {

    private String returnTo;

    private String returnLabel;

    private String entityOwner;

    private String entitySystem;

    private String entityEnvironment;

    private String entitySource;

    private ObservedEntityContext entityContext;

    private List<SingleAlert> activeAlerts;

    private List<Monitor> monitors;

    private EntityLogSummaryInfo logSummary;

    private EntityTraceSummaryDto traceSummary;

    private List<MetricEvidence> metricEvidence;

    private List<LogEvidence> logEvidence;

    private List<TraceEvidence> traceEvidence;

    private List<EntityTraceQueryHintDto> traceQueryHints;

    private EntitySignalEvidenceBundle signalEvidence;

    private boolean ownerReady;

    private boolean runbookReady;

    private boolean relationReady;

    private boolean telemetryReady;

    public EntityResponseHandoffsRequest(String returnTo,
                                         String returnLabel,
                                         String entityOwner,
                                         String entitySystem,
                                         String entityEnvironment,
                                         String entitySource,
                                         ObservedEntityContext entityContext,
                                         List<SingleAlert> activeAlerts,
                                         List<Monitor> monitors,
                                         EntityLogSummaryInfo logSummary,
                                         EntityTraceSummaryDto traceSummary,
                                         List<MetricEvidence> metricEvidence,
                                         List<LogEvidence> logEvidence,
                                         List<TraceEvidence> traceEvidence,
                                         List<EntityTraceQueryHintDto> traceQueryHints,
                                         boolean ownerReady,
                                         boolean runbookReady,
                                         boolean relationReady,
                                         boolean telemetryReady) {
        this(returnTo, returnLabel, entityOwner, entitySystem, entityEnvironment, entitySource,
                entityContext, activeAlerts, monitors, logSummary, traceSummary, metricEvidence,
                logEvidence, traceEvidence, traceQueryHints, null, ownerReady, runbookReady,
                relationReady, telemetryReady);
    }
}
