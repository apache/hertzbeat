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

package org.apache.hertzbeat.ai.gateway.permission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import jakarta.persistence.EntityManagerFactory;

import org.apache.hertzbeat.ai.gateway.contract.GatewayEnvelope;
import org.apache.hertzbeat.ai.gateway.conversation.persistence.AgentSessionDao;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentApprovalActorVerifier;
import org.apache.hertzbeat.common.entity.agent.AgentSession;
import org.apache.hertzbeat.common.entity.agent.AgentSessionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import javax.sql.DataSource;

/** Real row locks and persistent audit; no current user's grant, model or business write. */
@SpringJUnitConfig(AgentPermissionModeH2IntegrationTest.Config.class)
class AgentPermissionModeH2IntegrationTest {
    @Autowired AgentPermissionModeService service;
    @Autowired AgentSessionDao sessions;
    @Autowired AgentPermissionStateDao states;
    @Autowired AgentPermissionAuditDao audits;
    @Autowired AgentPermissionModeServiceTest.MutableClock clock;
    @Autowired PlatformTransactionManager transactionManager;
    final AgentActor actor =
            AgentActor.builder().type("user").id("isolated-owner").roles(List.of("user")).build();
    final GatewayEnvelope envelope =
            GatewayEnvelope.builder()
                    .channelId("web-ui")
                    .workspaceId("permission-test")
                    .actor(actor)
                    .receivedAt(1L)
                    .build();
    String uid;

    @BeforeEach
    void setup() {
        clock.now = 10000;
        uid = "ags_" + UUID.randomUUID().toString().replace("-", "");
        sessions.saveAndFlush(
                AgentSession.builder()
                        .sessionUid(uid)
                        .sessionKey(uid)
                        .workspaceId("permission-test")
                        .channel("web-ui")
                        .originEntryType("USER_INPUT")
                        .conversationId(uid)
                        .actorType("user")
                        .actorId("isolated-owner")
                        .actorRoles("[\"user\"]")
                        .status(AgentSessionStatus.ACTIVE)
                        .title("Isolated permission test")
                        .build());
    }

    @Test
    void simultaneousConfirmationAndRevocationAreSerializedAndAuditedOnce() throws Exception {
        var challenge = service.challenge(envelope, uid);
        clock.now += 5000;
        var command =
                new AgentPermissionModeService.Confirm(
                        challenge.challengeId(), challenge.generation(), 1, true);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var start = new CountDownLatch(1);
            var first =
                    pool.submit(
                            () -> {
                                start.await();
                                return service.confirm(envelope, uid, command);
                            });
            var second =
                    pool.submit(
                            () -> {
                                start.await();
                                return service.confirm(envelope, uid, command);
                            });
            start.countDown();
            assertEquals(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS));
        }
        assertEquals(
                1,
                audits.findAll().stream()
                        .filter(
                                e ->
                                        e.getSessionUid().equals(uid)
                                                && e.getAction().equals("FULL_CONFIRMED"))
                        .count());
        assertEquals("FULL", service.status(envelope, uid).mode());
        service.revoke(envelope, uid);
        service.revoke(envelope, uid);
        assertEquals("MANUAL", service.status(envelope, uid).mode());
        assertThrows(IllegalArgumentException.class, () -> service.confirm(envelope, uid, command));
        assertEquals(
                1,
                audits.findAll().stream()
                        .filter(
                                e ->
                                        e.getSessionUid().equals(uid)
                                                && e.getAction().equals("MANUAL_RESTORED"))
                        .count());
    }

    @Test
    void challengeExpiryAndCrossOwnerSelectionCannotEnableAnything() {
        var challenge = service.challenge(envelope, uid);
        clock.now = challenge.expiresAt();
        assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.confirm(
                                envelope,
                                uid,
                                new AgentPermissionModeService.Confirm(
                                        challenge.challengeId(), challenge.generation(), 1, true)));
        assertEquals("MANUAL", service.status(envelope, uid).mode());
        var outsider =
                envelope.toBuilder()
                        .actor(
                                AgentActor.builder()
                                        .type("user")
                                        .id("outsider")
                                        .roles(List.of("admin"))
                                        .build())
                        .build();
        assertThrows(IllegalArgumentException.class, () -> service.challenge(outsider, uid));
        assertThrows(IllegalArgumentException.class, () -> service.revoke(outsider, uid));
        assertFalse(
                audits.findAll().stream()
                        .anyMatch(
                                e ->
                                        e.getSessionUid().equals(uid)
                                                && e.getAction().equals("FULL_CONFIRMED")));
    }

    @Test
    void revocationIsSeenEvenWhenTheCallingPersistenceContextStillCachesFullMode()
            throws Exception {
        var challenge = service.challenge(envelope, uid);
        clock.now += 5000;
        service.confirm(
                envelope,
                uid,
                new AgentPermissionModeService.Confirm(
                        challenge.challengeId(), challenge.generation(), 1, true));
        var session = sessions.findBySessionUid(uid).orElseThrow();
        var request =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExecutionRequest.builder()
                        .sessionUid(uid)
                        .runSessionId(session.getId())
                        .runId(10L)
                        .runUid("run-permission-cache")
                        .workspaceId("permission-test")
                        .actor(actor)
                        .entryType(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentRuntimeEntryType
                                        .USER_INPUT)
                        .approvalHandling(
                                org.apache.hertzbeat.ai.gateway.runtime.AgentApprovalHandling
                                        .WAIT_FOR_DECISION)
                        .toolName("monitor.create_batch")
                        .toolCallId("call")
                        .arguments(Map.of())
                        .build();
        var descriptor =
                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolDescriptor.builder()
                        .name("monitor.create_batch")
                        .description("test")
                        .inputSchema("{}")
                        .namespace("monitor")
                        .risk(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolRisk.CHANGE)
                        .access(org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess.USER)
                        .exposure(
                                org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure
                                        .MODEL_ON_DEMAND)
                        .build();
        var admitted =
                service.apply(
                        request,
                        descriptor,
                        new org.apache.hertzbeat.ai.gateway.tool.core.AgentPolicyService()
                                .decide(actor, descriptor));
        new org.springframework.transaction.support.TransactionTemplate(transactionManager)
                .executeWithoutResult(
                        status -> {
                            var cached =
                                    states.findAll().stream()
                                            .filter(row -> uid.equals(row.getSessionUid()))
                                            .findFirst()
                                            .orElseThrow();
                            assertEquals("FULL", cached.getMode());
                            try (var executor = Executors.newSingleThreadExecutor()) {
                                executor.submit(() -> service.revoke(envelope, uid))
                                        .get(10, TimeUnit.SECONDS);
                            } catch (Exception failure) {
                                throw new AssertionError(failure);
                            }
                            assertEquals(
                                    "FULL",
                                    states.findById(cached.getId()).orElseThrow().getMode());
                            assertFalse(admitted.request().getExecutionGuard().getAsBoolean());
                        });
        assertEquals("MANUAL", service.status(envelope, uid).mode());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @EnableJpaRepositories(
            basePackageClasses = {AgentSessionDao.class, AgentPermissionStateDao.class})
    static class Config {
        @Bean
        DataSource dataSource() {
            var source = new DriverManagerDataSource();
            source.setDriverClassName("org.h2.Driver");
            source.setUrl(
                    "jdbc:h2:mem:permission-mode;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000");
            source.setUsername("sa");
            return source;
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource source) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(source);
            factory.setPackagesToScan(
                    "org.apache.hertzbeat.common.entity.agent",
                    "org.apache.hertzbeat.ai.gateway.permission");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(
                    Map.of(
                            "hibernate.hbm2ddl.auto",
                            "create-drop",
                            "hibernate.dialect",
                            "org.hibernate.dialect.H2Dialect"));
            return factory;
        }

        @Bean
        PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }

        @Bean
        AgentPermissionModeServiceTest.MutableClock clock() {
            return new AgentPermissionModeServiceTest.MutableClock();
        }

        @Bean
        AgentApprovalActorVerifier verifier() {
            var verifier = mock(AgentApprovalActorVerifier.class);
            when(verifier.isCurrent(any())).thenReturn(true);
            return verifier;
        }

        @Bean
        AgentPermissionModeService service(
                AgentSessionDao sessions,
                AgentPermissionStateDao states,
                AgentPermissionAuditDao audits,
                AgentApprovalActorVerifier verifier,
                AgentPermissionModeServiceTest.MutableClock clock) {
            return new AgentPermissionModeService(sessions, states, audits, verifier, clock);
        }
    }
}
