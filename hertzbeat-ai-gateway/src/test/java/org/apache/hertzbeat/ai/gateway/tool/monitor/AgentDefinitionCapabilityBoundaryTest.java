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

package org.apache.hertzbeat.ai.gateway.tool.monitor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

/** Non-executing proof that an API template cannot smuggle generic execution to a collector. */
class AgentDefinitionCapabilityBoundaryTest {
    @Test
    void monitorCreationRejectsExecutableParametersBeforeCatalogOrNativeServiceAccess() {
        var service = new AgentMonitorToolService(null, null, null);
        for (String field :
                java.util.List.of("scriptCommand", "scriptPath", "sql", "sqlQuery", "command")) {
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            service.createMonitor(
                                    "boundary-test",
                                    "custom",
                                    600,
                                    java.util.Map.of(field, "placeholder"),
                                    null,
                                    null,
                                    null,
                                    null));
        }
    }

    @Test
    void scriptSqlExpressionsAndNonReadOnlyHttpAreRejectedBeforeAnyNativeCall() {
        for (String fragment :
                java.util.List.of(
                        "protocol: script",
                        "protocol: ssh",
                        "protocol: jdbc",
                        "scriptCommand: harmless-placeholder",
                        "scriptPath: placeholder",
                        "sql: placeholder",
                        "calculates: [placeholder]",
                        "method: POST",
                        "method: DELETE")) {
            assertThrows(
                    IllegalArgumentException.class,
                    () ->
                            AgentMonitorDefinitionDraft.inspect(
                                    "app: boundary-test\nmetrics:\n  - " + fragment + "\n"));
        }
        assertEquals(
                "boundary-test",
                AgentMonitorDefinitionDraft.inspect(
                                "app: boundary-test\n"
                                    + "metrics:\n"
                                    + "  - protocol: http\n"
                                    + "    http: {method: GET}\n")
                        .app());
    }
}
