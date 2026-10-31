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

package org.apache.hertzbeat.ai.gateway.tool.collector;

import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk;
import org.apache.hertzbeat.common.entity.dto.ManagedOtelRuntimeConfig;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementRequest;
import org.apache.hertzbeat.manager.instrumentation.intake.CollectorIntakeAdvertisementService;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.manager.scheduler.runtime.CollectorRuntimeConfigService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Service;

/** Versioned Collector contracts; no installation commands, tokens or secret values. */
@Service
public class AgentCollectorRuntimeToolService {
    private final CollectorRuntimeConfigService runtime;
    private final CollectorIntakeAdvertisementService intake;

    public AgentCollectorRuntimeToolService(CollectorRuntimeConfigService runtime, CollectorIntakeAdvertisementService intake) {
        this.runtime = runtime;
        this.intake = intake;
    }

    @Tool(name = "collector.runtime_get", description = "Get non-secret Collector runtime configuration; secret references remain references.")
    @AgentToolPolicy(exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public ManagedOtelRuntimeConfig runtimeGet(@ToolParam(description = "Registered Collector name.") String collector) {
        name(collector);
        return runtime.current(collector).orElseThrow(() -> new IllegalArgumentException("Collector not found"));
    }

    @Tool(name = "collector.runtime_update", description = "Save schema version 3 runtime intent with an increasing revision. Does not deploy or install a Collector.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public ManagedOtelRuntimeConfig runtimeUpdate(@ToolParam(description = "Registered Collector name.") String collector,
                                                  @ToolParam(description = "Version 3 configuration; references only, never credential values.") ManagedOtelRuntimeConfig config) {
        name(collector);
        if (config == null) {
            throw new IllegalArgumentException("Runtime configuration is required");
        }
        runtime.update(collector, config);
        return runtimeGet(collector);
    }

    @Tool(name = "collector.intake_update", description = "Persist a versioned non-secret instrumentation intake advertisement using native endpoint validation.")
    @AgentToolPolicy(access = AgentToolAccess.USER, risk = AgentToolRisk.CHANGE, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public CollectorInstrumentationIntake intakeUpdate(@ToolParam(description = "Registered Collector name.") String collector,
                                                       @ToolParam(description = "Safe versioned advertisement with no credentials.") CollectorIntakeAdvertisementRequest request) {
        name(collector);
        if (request == null) {
            throw new IllegalArgumentException("Intake advertisement is required");
        }
        return intake.update(collector, request);
    }

    @Tool(name = "collector.intake_clear", description = "Clear an instrumentation intake advertisement, without stopping or uninstalling the Collector.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, risk = AgentToolRisk.DANGEROUS, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public CollectorInstrumentationIntake intakeClear(@ToolParam(description = "Registered Collector name.") String collector) {
        name(collector);
        return intake.clear(collector);
    }

    private static void name(String name) {
        if (name == null || name.isBlank() || name.length() > 100) {
            throw new IllegalArgumentException("A bounded Collector name is required");
        }
    }
}
