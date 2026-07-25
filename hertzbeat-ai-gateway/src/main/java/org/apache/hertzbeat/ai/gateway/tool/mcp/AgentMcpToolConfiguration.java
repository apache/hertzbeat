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

package org.apache.hertzbeat.ai.gateway.tool.mcp;

import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertRuleToolService;
import org.apache.hertzbeat.ai.gateway.tool.alert.AgentAlertToolService;
import org.apache.hertzbeat.ai.gateway.tool.database.AgentDatabaseDiagnosticService;
import org.apache.hertzbeat.ai.gateway.tool.metrics.AgentMetricsToolService;
import org.apache.hertzbeat.ai.gateway.tool.monitor.AgentMonitorToolService;
import org.apache.hertzbeat.ai.gateway.tool.collector.AgentCollectorToolService;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Exposes context-free HertzBeat tools directly through the MCP server transport.
 */
@Configuration(proxyBeanMethods = false)
public class AgentMcpToolConfiguration {

    @Bean
    public ToolCallbackProvider hertzbeatMcpTools(AgentMonitorToolService monitorTools,
                                                  AgentAlertToolService alertTools,
                                                  AgentAlertRuleToolService alertRuleTools,
                                                  AgentMetricsToolService metricsTools,
                                                  AgentDatabaseDiagnosticService databaseTools,
                                                  AgentCollectorToolService collectorTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(monitorTools, alertTools, alertRuleTools,
                        metricsTools, databaseTools, collectorTools)
                .build();
    }
}
