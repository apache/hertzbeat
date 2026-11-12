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

package org.apache.hertzbeat.ai.gateway.conversation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EntityManagerFactory;
import java.util.List;
import java.util.Map;
import javax.sql.DataSource;
import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentRunDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentTranscriptEntryDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.persistence.AgentToolCallDao;
import org.apache.hertzbeat.common.entity.agent.AgentRun;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.apache.hertzbeat.common.entity.agent.AgentToolCall;
import org.apache.hertzbeat.common.entity.agent.AgentTranscriptEntry;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.web.server.ResponseStatusException;

/** Real isolated H2 repository and transaction proof; never uses the development database. */
@SpringJUnitConfig(AgentSessionDeletionIntegrationTest.TestApplication.class)
class AgentSessionDeletionIntegrationTest {
    @Autowired private AgentSessionDeletionService service;
    @Autowired private AgentSessionDao sessions;
    @Autowired private AgentRunDao runs;
    @Autowired private AgentToolCallDao tools;
    @Autowired private AgentTranscriptEntryDao transcripts;

    @AfterEach
    void cleanup() {
        transcripts.deleteAll();
        tools.deleteAll();
        runs.deleteAll();
        sessions.deleteAll();
    }

    @Test
    void previewIsScopedByWorkspaceChannelActorAndOrigin() {
        seed("ags_1", "alice", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        seed("ags_2", "bob", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        seed("ags_3", "alice", "other", "web-ui", "USER_INPUT", "SUCCEEDED");
        seed("ags_4", "alice", "default", "system", "USER_INPUT", "SUCCEEDED");
        seed("ags_5", "alice", "default", "web-ui", "SCHEDULE_TRIGGER", "SUCCEEDED");
        assertEquals(List.of("ags_1"), service.preview(owner("alice")).sessionUids());
        assertEquals(0, service.preview(owner("alice")).activeCount());
    }

    @Test
    void deletesAllAssociatedRecordsAndPreservesOtherOwners() {
        seed("ags_1", "alice", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        seed("ags_2", "bob", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        var owned = sessions.findBySessionUid("ags_1").orElseThrow();
        var run = runs.findTopBySessionIdOrderByIdDesc(owned.getId()).orElseThrow();
        tools.saveAndFlush(AgentToolCall.builder().toolCallId("legacy").runId(run.getId()).toolName("logs.analysis")
                .status("SUCCEEDED").build());
        assertEquals(1, service.delete(owner("alice"), request("ags_1")).deletedCount());
        assertEquals(1, sessions.count());
        assertEquals(1, runs.count());
        assertEquals(1, tools.count());
        assertEquals(1, transcripts.count());
        assertTrue(sessions.findBySessionUid("ags_2").isPresent());
    }

    @Test
    void batchRejectsRunningSessionsAtomically() {
        seed("ags_1", "alice", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        seed("ags_2", "alice", "default", "web-ui", "USER_INPUT", "RUNNING");
        assertEquals(1, service.preview(owner("alice")).activeCount());
        var error = assertThrows(ResponseStatusException.class, () -> service.delete(owner("alice"), request("ags_1", "ags_2")));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        assertEquals(2, sessions.count());
        assertEquals(2, runs.count());
        assertEquals(2, tools.count());
        assertEquals(2, transcripts.count());
    }

    @Test
    void foreignSelectionCannotDeleteEvenWithAdministratorRole() {
        seed("ags_1", "alice", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        seed("ags_2", "bob", "default", "web-ui", "USER_INPUT", "SUCCEEDED");
        var error = assertThrows(ResponseStatusException.class, () -> service.delete(owner("alice"), request("ags_1", "ags_2")));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        assertEquals(2, sessions.count());
        assertEquals(2, tools.count());
    }

    @Test
    void requiresExplicitConfirmationUniqueSelectionAndWebUiIdentity() {
        for (var request : List.of(new AgentSessionDeletionService.Request(List.of("ags_1"), false),
                request(), request("ags_1", "ags_1"), request("invalid"))) {
            assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                    () -> service.delete(owner("alice"), request)).getStatusCode());
        }
        var invalid = owner("alice").toBuilder().channelId("system").build();
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class, () -> service.preview(invalid)).getStatusCode());
    }

    private AgentSessionDeletionService.Request request(String... ids) {
        return new AgentSessionDeletionService.Request(List.of(ids), true);
    }

    private GatewayEnvelope owner(String actor) {
        return GatewayEnvelope.builder().channelId("web-ui").workspaceId("default").receivedAt(1L)
                .actor(AgentActor.builder().type("user").id(actor).roles(List.of("admin")).build()).build();
    }

    private void seed(String uid, String actor, String workspace, String channel, String origin, String status) {
        var session = sessions.saveAndFlush(AgentSession.builder().sessionUid(uid).sessionKey(uid).workspaceId(workspace)
                .channel(channel).actorType("user").actorId(actor).originEntryType(origin).status(AgentSessionStatus.ACTIVE).build());
        var run = runs.saveAndFlush(AgentRun.builder().sessionId(session.getId()).runUid("run_" + uid)
                .messageId("message").entryType(origin).status(status).build());
        tools.saveAndFlush(AgentToolCall.builder().sessionId(session.getId()).runId(run.getId()).toolCallId("tool")
                .toolName("logs.analysis").status("SUCCEEDED").build());
        transcripts.saveAndFlush(AgentTranscriptEntry.builder().sessionId(session.getId()).runId(run.getId())
                .sessionSequence(1L).messageRole("user").payloadJson("{\"role\":\"user\"}").build());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableJpaRepositories(basePackageClasses = {AgentSessionDao.class, AgentToolCallDao.class})
    @EnableTransactionManagement
    @Import({AgentSessionDeletionService.class, AgentSessionService.class, AgentSessionKeyBuilder.class})
    static class TestApplication {
        @Bean DataSource dataSource() {
            var source = new DriverManagerDataSource();
            source.setDriverClassName("org.h2.Driver");
            source.setUrl("jdbc:h2:mem:session-deletion-only;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000");
            source.setUsername("sa");
            return source;
        }

        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan("org.apache.hertzbeat.common.entity.agent");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) { return new JpaTransactionManager(factory); }
    }
}
