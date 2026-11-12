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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class AgentApplicationMutationAuthorityTest {
    @Test
    void newTaskContractsDoNotExpandExistingFullModeConsent() {
        for (String tool :
                java.util.List.of(
                        "dashboard.upsert_signal_dashboard", "saved_query.upsert_signal_saved_view", "alert_rule.create_configured",
                        "notice.receiver_create",
                        "notice.receiver_update_metadata",
                        "label.create",
                        "label.update",
                        "label.delete",
                        "notice.rule_create",
                        "notice.template_update",
                        "notice.rule_delete")) {
            assertTrue(AgentApplicationMutationAuthority.hasBoundContract(tool));
            assertFalse(AgentApplicationMutationAuthority.allowsFullMode(tool));
        }
        assertTrue(AgentApplicationMutationAuthority.allowsFullMode("monitor.create"));
        assertTrue(AgentApplicationMutationAuthority.allowsFullMode("monitor.definition_create"));
        assertFalse(AgentApplicationMutationAuthority.hasBoundContract("unknown.write"));
    }
}
