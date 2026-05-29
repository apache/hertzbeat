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
import org.junit.jupiter.api.Test;

/**
 * Source contract that keeps raw alert row lookup behind an alert evidence query boundary.
 */
class EntityAlertEvidenceQuerySourceOwnershipTest {

    private static final Path ENTITY_ALERT_EVIDENCE_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityAlertEvidenceReadModelService.java");
    private static final Path ENTITY_ALERT_EVIDENCE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityAlertEvidenceQueryService.java");

    @Test
    void alertEvidenceReadModelUsesQueryBoundaryForRawAlertLookup() throws Exception {
        String readModelSource = Files.readString(ENTITY_ALERT_EVIDENCE_READ_MODEL_SERVICE);
        String querySource = Files.readString(ENTITY_ALERT_EVIDENCE_QUERY_SERVICE);

        assertFalse(readModelSource.contains("import org.apache.hertzbeat.alert.dao.SingleAlertDao"),
                "Alert evidence read model should not import alert DAO directly");
        assertFalse(readModelSource.contains("private final SingleAlertDao singleAlertDao"),
                "Alert evidence read model should not own raw alert lookup");
        assertFalse(readModelSource.contains("singleAlertDao.findAll("));
        assertFalse(readModelSource.contains("Specification<SingleAlert>"));
        assertFalse(readModelSource.contains("EntityWorkspaceAccessService"),
                "Alert evidence read model should not own current request workspace lookup");
        assertFalse(readModelSource.contains("currentRequestWorkspaceId()"),
                "Alert evidence read model should delegate default request workspace lookup to the query boundary");
        assertFalse(readModelSource.contains("buildAlertSpecification("));
        assertFalse(readModelSource.contains("buildAlertWorkspacePredicate("));
        assertFalse(readModelSource.contains("matchesAlertRequestWorkspace("));
        assertFalse(readModelSource.contains("addJsonLikePredicate("));
        assertFalse(readModelSource.contains("addTextLikePredicate("));

        assertTrue(readModelSource.contains("private final EntityAlertEvidenceQueryService entityAlertEvidenceQueryService"));
        assertTrue(readModelSource.contains("entityAlertEvidenceQueryService.findActiveAlerts("));
        assertTrue(readModelSource.contains("entityAlertEvidenceQueryService.findAlerts("));
        assertTrue(readModelSource.contains("normalizeAlertSeverityFilter("));
        assertTrue(readModelSource.contains("severityPriority("));

        assertTrue(querySource.contains("import org.apache.hertzbeat.alert.dao.SingleAlertDao"));
        assertTrue(querySource.contains("private final SingleAlertDao singleAlertDao"));
        assertTrue(querySource.contains("private final EntityWorkspaceAccessService entityWorkspaceAccessService"));
        assertTrue(querySource.contains("public List<SingleAlert> findActiveAlerts("));
        assertTrue(querySource.contains("public List<SingleAlert> findAlerts("));
        assertTrue(querySource.contains("public List<SingleAlert> findAlerts(List<Monitor> monitors, String status)"));
        assertTrue(querySource.contains("entityWorkspaceAccessService.currentRequestWorkspaceId()"));
        assertTrue(querySource.contains("private Specification<SingleAlert> buildAlertSpecification("));
        assertTrue(querySource.contains("private boolean matchesAlertRequestWorkspace("));
        assertTrue(querySource.contains("AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(requestWorkspaceId)"));
    }
}
