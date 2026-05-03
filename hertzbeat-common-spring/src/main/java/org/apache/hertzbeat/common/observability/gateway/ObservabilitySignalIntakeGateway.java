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

package org.apache.hertzbeat.common.observability.gateway;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.observability.dto.binding.TelemetryIdentitySnapshot;
import org.apache.hertzbeat.common.observability.dto.trace.TraceListItemDto;

/**
 * Observability signal intake and recent context gateway.
 */
public interface ObservabilitySignalIntakeGateway {

    void recordOtlpMetricIntake(Map<String, String> resourceAttributes,
                                Long observedAt,
                                String metricName,
                                String metricType,
                                String unit,
                                Double value,
                                Map<String, String> attributes);

    void recordOtlpLogIntake(Map<String, String> resourceAttributes,
                             Long observedAt,
                             String body,
                             String severityText,
                             String traceId,
                             String spanId,
                             Map<String, String> attributes);

    void recordOtlpTraceIntake(Map<String, String> resourceAttributes,
                               Long observedAt,
                               String traceId,
                               String spanId,
                               String spanName,
                               String errorState,
                               Map<String, String> spanAttributes);

    List<TelemetryIdentitySnapshot> collectRecentIdentitySnapshots(List<LogEntry> logs,
                                                                   List<TraceListItemDto> traces,
                                                                   List<Monitor> monitors);

    List<TelemetryIdentitySnapshot> collectRecentExternalIdentitySnapshots(List<LogEntry> logs,
                                                                          List<TraceListItemDto> traces,
                                                                          List<Monitor> monitors);

    TelemetryIdentitySnapshot resolveRecentOtlpMetricContext(String serviceName,
                                                             String serviceNamespace,
                                                             String environment);

    List<TelemetryIdentitySnapshot> collectRecentOtlpMetricContexts(int limit);

    List<String> collectRecentOtlpMetricNames(String serviceName,
                                              String serviceNamespace,
                                              String environment,
                                              int limit);
}
