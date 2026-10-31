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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.util.Map;
import java.util.Set;

/**
 * Contracts are selected by name; every selected output still undergoes typed semantic validation.
 */
final class AgentNativeReadContracts {
    private static final Set<String> LOGS =
            Set.of(
                    "logs.repeated_errors.records",
                    "logs.live.snapshot",
                    "logs.list",
                    "logs.trace_coverage_stats",
                    "logs.trend_stats",
                    "logs.compare");
    private static final Set<String> TRACES =
            Set.of(
                    "traces.list",
                    "traces.spans",
                    "traces.histogram",
                    "traces.groups",
                    "traces.facet_values");
    private static final Set<String> INVESTIGATIONS =
            Set.of(
                    "monitor.investigation",
                    "alert.investigation",
                    "alert.group.evidence",
                    "alert.group.query",
                    "traces.detail");

    private AgentNativeReadContracts() {}

    static boolean supports(String tool) {
        return tool != null
                && (LOGS.contains(tool)
                        || TRACES.contains(tool)
                        || INVESTIGATIONS.contains(tool)
                        || AgentEntityEvidenceReadSemantics.supports(tool)
                        || AgentSignalDiscoveryReadSemantics.supports(tool)
                        || AgentInstrumentationReadSemantics.supports(tool)
                        || AgentMonitorBulkReadSemantics.supports(tool)
                        || AgentDefinitionReadSemantics.supports(tool)
                        || AgentGrafanaReadSemantics.supports(tool)
                        || AgentSharedConfigurationReadSemantics.supports(tool)
                        || AgentNotificationMetadataReadSemantics.supports(tool)
                        || AgentBusinessMetadataReadSemantics.supports(tool)
                        || AgentApplicationHelperReadSemantics.supports(tool)
                        || AgentAlertInhibitReadSemantics.supports(tool)
                        || AgentTelemetryIntakeReadSemantics.supports(tool)
                        || AgentApplicationCatalogReadSemantics.supports(tool));
    }

    static AgentReadObservationClassifier.Observation classify(
            AgentRuntimeToolCall call, String output) {
        try {
            var data =
                    AgentNativeReadContract.object(
                            AgentNativeReadContract.JSON.readValue(output, Map.class));
            var args = call.getArguments();
            if (AgentAlertInhibitReadSemantics.supports(call.getToolName()))
                return new AgentAlertInhibitReadSemantics().classify(call, data);
            if (AgentTelemetryIntakeReadSemantics.supports(call.getToolName()))
                return new AgentTelemetryIntakeReadSemantics().classify(call, data);
            if (AgentApplicationCatalogReadSemantics.supports(call.getToolName()))
                return new AgentApplicationCatalogReadSemantics().classify(call, data);
            if (AgentEntityEvidenceReadSemantics.supports(call.getToolName()))
                return new AgentEntityEvidenceReadSemantics().classify(call, data);
            if (AgentSignalDiscoveryReadSemantics.supports(call.getToolName()))
                return new AgentSignalDiscoveryReadSemantics().classify(call, data);
            if (AgentApplicationHelperReadSemantics.supports(call.getToolName())) {
                return new AgentApplicationHelperReadSemantics().classify(call, data);
            }
            if (AgentSharedConfigurationReadSemantics.supports(call.getToolName()))
                return new AgentSharedConfigurationReadSemantics().classify(call, data);
            if (AgentNotificationMetadataReadSemantics.supports(call.getToolName())) {
                return new AgentNotificationMetadataReadSemantics().classify(call, data);
            }
            if (AgentBusinessMetadataReadSemantics.supports(call.getToolName())) {
                return new AgentBusinessMetadataReadSemantics().classify(call, data);
            }
            if (AgentGrafanaReadSemantics.supports(call.getToolName()))
                return new AgentGrafanaReadSemantics().classify(call, data);
            if (AgentDefinitionReadSemantics.supports(call.getToolName())) {
                return new AgentDefinitionReadSemantics().classify(call, data);
            }
            if (AgentMonitorBulkReadSemantics.supports(call.getToolName())) {
                return new AgentMonitorBulkReadSemantics().classify(call, data);
            }
            if (AgentInstrumentationReadSemantics.supports(call.getToolName())) {
                return new AgentInstrumentationReadSemantics().classify(call, data);
            }
            if (LOGS.contains(call.getToolName())) {
                return new AgentNativeLogReadSemantics().classify(call.getToolName(), args, data);
            }
            if (TRACES.contains(call.getToolName())) {
                return new AgentNativeTraceReadSemantics().classify(call.getToolName(), args, data);
            }
            if (INVESTIGATIONS.contains(call.getToolName())) {
                return new AgentNativeInvestigationReadSemantics()
                        .classify(call.getToolName(), args, data);
            }
            return null;
        } catch (java.io.IOException
                | IllegalArgumentException
                | ArithmeticException
                | NullPointerException invalid) {
            return null;
        }
    }
}
