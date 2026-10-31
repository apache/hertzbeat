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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.ai.gateway.tool.application.AgentGrafanaDraft;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

class AgentGrafanaMutationContractTest {
    private Map<String, Object> args() {
        var args =
                new HashMap<String, Object>(
                        Map.of(
                                "operation",
                                "create",
                                "monitorId",
                                7L,
                                "dashboardJson",
                                "{\"title\":\"AI fixture\",\"panels\":[]}"));
        args.put(
                "previewHash",
                AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args).previewHash());
        return args;
    }

    private AgentTaskAssessment.Goal goal(long id, String title) {
        return new AgentTaskAssessment.Goal(
                AgentTaskAssessment.Type.CHANGE,
                AgentTaskAssessment.Operation.CREATE,
                "grafana_dashboard",
                1,
                List.of(id),
                Map.of("title", title));
    }

    @Test
    void exactBindingTitleOperationAndPreviewHashAreMandatory() {
        var args = args();
        assertTrue(
                AgentGrafanaMutationSemantics.permits(
                        goal(7, "AI fixture"), "grafana.dashboard_save", args));
        assertFalse(
                AgentGrafanaMutationSemantics.permits(
                        goal(8, "AI fixture"), "grafana.dashboard_save", args));
        assertFalse(
                AgentGrafanaMutationSemantics.permits(
                        goal(7, "other"), "grafana.dashboard_save", args));
        args.put("previewHash", "forged");
        assertFalse(
                AgentGrafanaMutationSemantics.permits(
                        goal(7, "AI fixture"), "grafana.dashboard_save", args));
    }

    @Test
    void unknownFieldsCredentialsRemoteIdentityAndCallerUrlsAreRejected() {
        var args = args();
        args.put("url", "https://unrelated.invalid");
        assertFalse(
                AgentGrafanaMutationSemantics.permits(
                        goal(7, "AI fixture"), "grafana.dashboard_save", args));
        args = args();
        args.put("dashboardJson", "{\"title\":\"AI fixture\",\"panels\":[],\"uid\":\"other\"}");
        var wrongIdentity = args;
        assertThrows(
                IllegalArgumentException.class,
                () -> AgentGrafanaDraft.fromArguments("grafana.dashboard_save", wrongIdentity));
        args = args();
        args.put(
                "dashboardJson",
                "{\"title\":\"AI fixture\",\"panels\":[],\"token\":\"private-sentinel\"}");
        var secret = args;
        assertThrows(
                IllegalArgumentException.class,
                () -> AgentGrafanaDraft.fromArguments("grafana.dashboard_save", secret));
    }

    @Test
    void deleteCannotBeRenamedToSaveOrExpandBindings() {
        var args =
                Map.<String, Object>of(
                        "monitorId", 7L, "expectedUid", "bound-uid", "expectedVersion", 3L);
        var hash = AgentGrafanaDraft.fromArguments("grafana.dashboard_delete", args).previewHash();
        var input = new HashMap<>(args);
        input.put("previewHash", hash);
        var goal =
                new AgentTaskAssessment.Goal(
                        AgentTaskAssessment.Type.CHANGE,
                        AgentTaskAssessment.Operation.DELETE,
                        "grafana_dashboard",
                        1,
                        List.of(7L),
                        Map.of("uid", "bound-uid", "version", 3L));
        assertTrue(AgentGrafanaMutationSemantics.permits(goal, "grafana.dashboard_delete", input));
        assertFalse(AgentGrafanaMutationSemantics.permits(goal, "grafana.dashboard_save", input));
        input.put("expectedVersion", 4L);
        assertFalse(AgentGrafanaMutationSemantics.permits(goal, "grafana.dashboard_delete", input));
    }

    @Test
    void operationCaseDoesNotChangeTheApprovedTargetOrContent() {
        var args = args();
        args.put("operation", "CREATE");
        assertTrue(
                AgentGrafanaMutationSemantics.permits(
                        goal(7, "AI fixture"), "grafana.dashboard_save", args));
    }

    @Test
    void serverOwnedTenantAndPermissionFieldsCannotExpandTheApprovedBinding() {
        for (String field : List.of("orgId", "folderId", "folderUid", "permissions")) {
            var args = args();
            args.put(
                    "dashboardJson",
                    "{\"title\":\"AI fixture\",\"panels\":[],\"" + field + "\":1}");
            assertThrows(
                    IllegalArgumentException.class,
                    () -> AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args));
        }
    }

    @Test
    void dashboardCannotSmuggleNotificationOrSecureConfiguration() {
        for (String json :
                List.of(
                        "{\"title\":\"AI"
                                + " fixture\",\"panels\":[{\"alert\":{\"name\":\"unexpected\"}}]}",
                        "{\"title\":\"AI"
                            + " fixture\",\"panels\":[],\"secureJsonData\":{\"httpHeaderValue1\":\"private-sentinel\"}}")) {
            var args = args();
            args.put("dashboardJson", json);
            assertThrows(
                    IllegalArgumentException.class,
                    () -> AgentGrafanaDraft.fromArguments("grafana.dashboard_save", args));
        }
    }
}
