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
 * Source contract that keeps alert silence/inhibit rule lookup behind a query boundary.
 */
class EntityNoiseControlRuleQuerySourceOwnershipTest {

    private static final Path ENTITY_NOISE_CONTROL_READ_MODEL_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityNoiseControlReadModelService.java");
    private static final Path ENTITY_NOISE_CONTROL_RULE_QUERY_SERVICE = Path.of(
            "src/main/java/org/apache/hertzbeat/manager/service/entity/EntityNoiseControlRuleQueryService.java");

    @Test
    void noiseControlReadModelUsesRuleQueryBoundaryForAlertRuleLookup() throws Exception {
        String readModelSource = Files.readString(ENTITY_NOISE_CONTROL_READ_MODEL_SERVICE);
        String ruleQuerySource = Files.readString(ENTITY_NOISE_CONTROL_RULE_QUERY_SERVICE);

        assertFalse(readModelSource.contains("import org.apache.hertzbeat.alert.dao.AlertSilenceDao"),
                "Noise-control read model should not import alert silence DAO directly");
        assertFalse(readModelSource.contains("import org.apache.hertzbeat.alert.dao.AlertInhibitDao"),
                "Noise-control read model should not import alert inhibit DAO directly");
        assertFalse(readModelSource.contains("private final AlertSilenceDao alertSilenceDao"),
                "Noise-control read model should not own silence rule lookup");
        assertFalse(readModelSource.contains("private final AlertInhibitDao alertInhibitDao"),
                "Noise-control read model should not own inhibit rule lookup");
        assertFalse(readModelSource.contains("alertSilenceDao.findAll()"));
        assertFalse(readModelSource.contains("alertInhibitDao.findAll()"));
        assertFalse(readModelSource.contains("matchesSilenceRuleRequestWorkspace("));
        assertFalse(readModelSource.contains("matchesInhibitRuleRequestWorkspace("));
        assertFalse(readModelSource.contains("matchesNoiseControlRuleRequestWorkspace("));

        assertTrue(readModelSource.contains("private final EntityNoiseControlRuleQueryService entityNoiseControlRuleQueryService"));
        assertTrue(readModelSource.contains("entityNoiseControlRuleQueryService.findEnabledSilences(requestWorkspaceId)"));
        assertTrue(readModelSource.contains("entityNoiseControlRuleQueryService.findEnabledInhibits(requestWorkspaceId)"));

        assertTrue(ruleQuerySource.contains("import org.apache.hertzbeat.alert.dao.AlertSilenceDao"));
        assertTrue(ruleQuerySource.contains("import org.apache.hertzbeat.alert.dao.AlertInhibitDao"));
        assertTrue(ruleQuerySource.contains("public List<AlertSilence> findEnabledSilences(String requestWorkspaceId)"));
        assertTrue(ruleQuerySource.contains("public List<AlertInhibit> findEnabledInhibits(String requestWorkspaceId)"));
        assertFalse(ruleQuerySource.contains("alertSilenceDao.findAll()"),
                "Entity detail should not scan every silence rule before workspace and enable filtering");
        assertFalse(ruleQuerySource.contains("alertInhibitDao.findAll()"),
                "Entity detail should not scan every inhibit rule before workspace and enable filtering");
        assertTrue(ruleQuerySource.contains("alertSilenceDao.findAlertSilencesByEnableTrue()"));
        assertTrue(ruleQuerySource.contains("alertInhibitDao.findAlertInhibitsByEnableIsTrue()"));
        assertTrue(ruleQuerySource.contains("matchesNoiseControlRuleRequestWorkspace("));
        assertTrue(ruleQuerySource.contains("AuthTokenScopes.DEFAULT_WORKSPACE_ID.equals(normalizedRequestWorkspaceId)"));
    }
}
