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

package org.apache.hertzbeat.common.observability.dto.entity;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.hertzbeat.common.observability.dto.evidence.LogEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.MetricEvidence;
import org.apache.hertzbeat.common.observability.dto.evidence.TraceEvidence;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogQueryHint;
import org.apache.hertzbeat.common.observability.dto.log.EntityLogSummaryInfo;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceQueryHintDto;
import org.apache.hertzbeat.common.observability.dto.trace.EntityTraceSummaryDto;

/**
 * Aggregated observability detail computed for an entity troubleshooting view.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EntityObservabilityDetailBundle {

    private EntityTraceSummaryDto traceSummary;

    private List<EntityTraceQueryHintDto> traceQueryHints;

    private EntityLogSummaryInfo logSummary;

    private List<EntityLogQueryHint> logQueryHints;

    private List<MetricEvidence> metricEvidence;

    private List<LogEvidence> logEvidence;

    private List<TraceEvidence> traceEvidence;

    private EntityUnifiedEvidenceSummary unifiedEvidenceSummary;

    private EntityTriageRecommendation triageRecommendation;
}
