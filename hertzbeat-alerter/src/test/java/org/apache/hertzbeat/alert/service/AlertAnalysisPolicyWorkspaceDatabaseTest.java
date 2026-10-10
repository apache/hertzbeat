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

package org.apache.hertzbeat.alert.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.apache.hertzbeat.alert.dao.AlertAnalysisPolicyDao;
import org.apache.hertzbeat.common.entity.alerter.AlertAnalysisPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Real database proof that policy identity and mutations are workspace scoped. */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@EntityScan(basePackages = "org.apache.hertzbeat.common.entity")
@EnableJpaRepositories(basePackageClasses = AlertAnalysisPolicyDao.class)
@Import(AlertAnalysisPolicyService.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class AlertAnalysisPolicyWorkspaceDatabaseTest {

    @Autowired
    private AlertAnalysisPolicyService policyService;

    @Autowired
    private AlertAnalysisPolicyDao policyDao;

    @MockitoBean
    private AgentClientAvailability agentClientAvailability;

    @BeforeEach
    void cleanDatabase() {
        policyDao.deleteAll();
    }

    @Test
    void foreignListToggleAndDeleteAreIndistinguishableFromMissing() {
        AlertAnalysisPolicy teamA = policyDao.saveAndFlush(AlertAnalysisPolicy.builder()
                .workspaceId("team-a")
                .name("policy")
                .enabled(true)
                .matchLabels(java.util.Map.of())
                .groupByLabels(List.of("instance"))
                .windowSeconds(300L)
                .minimumAlertCount(2)
                .cooldownSeconds(1800L)
                .build());

        assertEquals(List.of(), policyService.findAll("team-b"));
        assertThrows(IllegalArgumentException.class,
                () -> policyService.toggle("team-b", teamA.getId(), false));
        assertThrows(IllegalArgumentException.class,
                () -> policyService.delete("team-b", teamA.getId()));

        assertEquals("team-a", policyDao.findById(teamA.getId()).orElseThrow().getWorkspaceId());
    }

    @SpringBootConfiguration(proxyBeanMethods = false)
    static class TestApplication {
    }
}
