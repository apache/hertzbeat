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

package org.apache.hertzbeat.manager.service.entity;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps mutation-time status refresh orchestration out of the large entity service.
 */
class EntityStatusRefreshSourceOwnershipTest {

    private static final Path OBSERVE_ENTITY_SERVICE_IMPL = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/impl/ObserveEntityServiceImpl.java");
    private static final Path ENTITY_MUTATION_WORKFLOW_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityMutationWorkflowService.java");
    private static final Path ENTITY_STATUS_REFRESH_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityStatusRefreshService.java");
    private static final Path ENTITY_ALERT_EVIDENCE_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityAlertEvidenceReadModelService.java");
    private static final Path ENTITY_ALERT_EVIDENCE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityAlertEvidenceQueryService.java");

    @Test
    void observeEntityServiceImplDelegatesStatusRefreshEvidenceCollection() throws Exception {
        String source = Files.readString(OBSERVE_ENTITY_SERVICE_IMPL);
        String mutationWorkflowSource = Files.readString(ENTITY_MUTATION_WORKFLOW_SERVICE);
        String statusRefreshSource = Files.readString(ENTITY_STATUS_REFRESH_SERVICE);
        String alertEvidenceSource = Files.readString(ENTITY_ALERT_EVIDENCE_READ_MODEL_SERVICE);
        String alertQuerySource = Files.readString(ENTITY_ALERT_EVIDENCE_QUERY_SERVICE);

        assertTrue(source.contains("EntityMutationWorkflowService"));
        assertFalse(source.contains("EntityStatusRefreshService"));
        assertTrue(mutationWorkflowSource.contains("EntityStatusRefreshService"));
        assertTrue(mutationWorkflowSource.contains("entityStatusRefreshService.refreshEntityStatus(entity)"));
        assertFalse(statusRefreshSource.contains("EntityWorkspaceAccessService"),
                "Status refresh should not own current request workspace lookup for active alert evidence");
        assertFalse(statusRefreshSource.contains("currentRequestWorkspaceId()"),
                "Status refresh should delegate default active-alert workspace lookup to the alert query boundary");
        assertTrue(statusRefreshSource.contains("return refreshEntityStatusWithEvidence(entity).statusInfo()"));
        assertTrue(statusRefreshSource.contains("entityAlertEvidenceReadModelService.queryActiveAlerts(monitors, ACTIVE_ALERT_LIMIT)"));
        assertTrue(alertEvidenceSource.contains("public List<SingleAlert> queryActiveAlerts(List<Monitor> monitors, "
                + "int limit)"));
        assertTrue(alertQuerySource.contains("public List<SingleAlert> findActiveAlerts(List<Monitor> monitors, "
                + "int limit)"));
        assertFalse(source.contains("queryActiveAlerts("),
                "ObserveEntityServiceImpl should not collect active alert evidence for status refresh");
        assertFalse(Pattern.compile("\\n\\s*private\\s+EntityStatusInfo\\s+refreshEntityStatus\\s*\\(")
                        .matcher(source).find(),
                "ObserveEntityServiceImpl should not own status refresh helper methods");
    }
}
