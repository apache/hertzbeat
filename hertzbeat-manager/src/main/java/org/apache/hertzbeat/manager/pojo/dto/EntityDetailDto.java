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

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.observability.dto.entity.EntityAlertSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityEvidenceSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityMonitorSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityNextActionInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityOpsSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntitySignalEvidenceBundle;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusPageSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityStatusInfo;
import org.apache.hertzbeat.common.observability.dto.entity.EntityTriageRecommendation;
import org.apache.hertzbeat.common.observability.dto.entity.EntityUnifiedEvidenceSummary;
import org.apache.hertzbeat.common.observability.dto.entity.MonitorInfo;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.handoff.EntityResponseHandoffsInfo;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;

/**
 * Entity detail workspace payload.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class EntityDetailDto {

    private EntityDto entity;

    private EntityStatusInfo status;

    private EntityEvidenceSummaryInfo evidenceSummary;

    private EntityAlertSummaryInfo alertSummary;

    private EntityMonitorSummaryInfo monitorSummary;

    private EntityLogSummaryInfo logSummary;

    private EntityTraceSummaryDto traceSummary;

    private List<MetricEvidence> metricEvidence;

    private List<LogEvidence> logEvidence;

    private List<TraceEvidence> traceEvidence;

    private EntitySignalEvidenceBundle signalEvidence;

    private EntityUnifiedEvidenceSummary unifiedEvidenceSummary;

    private EntityTriageRecommendation triageRecommendation;

    private EntityOpsSummaryInfo opsSummary;

    private List<EntityNextActionInfo> nextActions;

    private EntityStatusPageSummaryInfo statusPageSummary;

    private EntityResponseHandoffsInfo responseHandoffs;

    private EntityNoiseControlSummaryInfo noiseControlSummary;

    private List<MonitorInfo> boundMonitors;

    private List<SingleAlert> activeAlerts;

    private List<EntityLogQueryHint> logQueryHints;

    private List<EntityTraceQueryHintDto> traceQueryHints;

    private List<EntityDefinitionActivityInfo> definitionActivities;

    /**
     * Read-only summary of active silence and inhibit rules that currently match the entity context.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class EntityNoiseControlSummaryInfo {
        private int activeSilenceCount;
        private int matchingInhibitCount;
        private List<EntityNoiseControlRuleInfo> activeSilences;
        private List<EntityNoiseControlRuleInfo> matchingInhibits;
        private boolean possibleAlertSuppression;
    }

    /**
     * Lightweight preview of a silence or inhibit rule that matches the entity context.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class EntityNoiseControlRuleInfo {
        private Long id;
        private String name;
        private String type;
        private boolean global;
        private List<String> matchedLabels;
        private Long updatedAt;
    }
}
