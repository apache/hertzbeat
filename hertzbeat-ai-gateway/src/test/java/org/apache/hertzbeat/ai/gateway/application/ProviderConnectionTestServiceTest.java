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

package org.apache.hertzbeat.ai.gateway.application;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Category;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest.Request;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderOption;
import org.apache.hertzbeat.ai.gateway.runtime.provider.AgentModelProviderRegistry;
import org.apache.hertzbeat.ai.gateway.runtime.provider.ProviderProbeDestinationPolicy;
import org.apache.hertzbeat.ai.gateway.runtime.provider.ProviderProbeTransport;
import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;
import org.apache.hertzbeat.manager.service.ModelProviderConfigurationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;

class ProviderConnectionTestServiceTest {
    private final ModelProviderConfigurationService configurations = mock(ModelProviderConfigurationService.class);
    private final AgentModelProviderRegistry providers = mock(AgentModelProviderRegistry.class);
    private final ProviderProbeDestinationPolicy destinations = mock(ProviderProbeDestinationPolicy.class);
    private final ProviderProbeTransport transport = mock(ProviderProbeTransport.class);
    private ProviderConnectionTestService service;

    @BeforeEach
    void setup() throws Exception {
        when(providers.options()).thenReturn(List.of(new AgentModelProviderOption("openai-compatible", "custom", "Fixture", null, null, List.of())));
        when(destinations.resolve(anyString(), anyString())).thenReturn(new ProviderProbeDestinationPolicy.Destination(
                URI.create("https://fixture.invalid/v1/responses")));
        when(transport.execute(any(), anyString(), anyString(), any(), any())).thenReturn(new ProviderProbeTransport.Outcome(Category.OK, 200));
        service = new ProviderConnectionTestService(configurations, providers, destinations, transport);
    }

    @AfterEach
    void close() {
        service.close();
    }

    private ModelProviderConfig form() {
        var config = new ModelProviderConfig();
        config.setType("openai-compatible");
        config.setCode("custom");
        config.setBaseUrl("https://fixture.invalid/v1");
        config.setModel("unsaved-model");
        config.setProtocol("responses");
        return config;
    }

    private Request request(ModelProviderConfig config) {
        return new Request(UUID.randomUUID().toString(), config);
    }

    @Test
    void testsUnsavedValuesWithoutSavingOrActivatingAndKeepsStoredKeyServerSide() throws Exception {
        var saved = form();
        saved.setApiKey("synthetic-saved-key");
        saved.setModel("saved-model");
        when(configurations.getConfiguration("saved")).thenReturn(saved);
        var input = form();
        input.setUid("saved");
        var result = service.test("admin", request(input));
        assertEquals(Category.OK, result.category());
        assertEquals("responses", result.protocol());
        assertEquals("unsaved-model", result.model());
        verify(transport).execute(any(), eq("responses"), eq("unsaved-model"), eq("synthetic-saved-key"), any());
        verify(configurations).getConfiguration("saved");
        verifyNoMoreInteractions(configurations);
        assertEquals("synthetic-saved-key", saved.getApiKey());
        assertNull(input.getApiKey());
        assertFalse(result.toString().contains("synthetic-saved-key"));
    }

    @Test
    void refusesToReuseSavedKeyForDifferentOriginButAcceptsAnExplicitNewKey() throws Exception {
        var saved = form();
        saved.setApiKey("synthetic-saved-key");
        when(configurations.getConfiguration("saved")).thenReturn(saved);
        var input = form();
        input.setUid("saved");
        input.setBaseUrl("https://other.invalid/v1");
        assertEquals(Category.CREDENTIAL_REQUIRED, service.test("admin", request(input)).category());
        verifyNoInteractions(transport);
        input.setApiKey("synthetic-new-key");
        assertEquals(Category.OK, service.test("admin", request(input)).category());
        verify(transport).execute(any(), anyString(), anyString(), eq("synthetic-new-key"), any());
    }

    @Test
    void completedProbeReleasesAdmissionBeforeReturning() throws Exception {
        var cleanupEntered = new CountDownLatch(1);
        var releaseCleanup = new CountDownLatch(1);
        var permits = new Semaphore(1) {
            private static final long serialVersionUID = 1L;

            @Override
            public void release() {
                cleanupEntered.countDown();
                try {
                    assertTrue(releaseCleanup.await(3, TimeUnit.SECONDS));
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError(interrupted);
                } finally {
                    super.release();
                }
            }
        };
        service.close();
        service = new ProviderConnectionTestService(configurations, providers, destinations, transport, permits);
        var first = CompletableFuture.supplyAsync(() -> service.test("admin", request(form())));
        try {
            assertTrue(cleanupEntered.await(3, TimeUnit.SECONDS));
            assertThrows(TimeoutException.class, () -> first.get(100, TimeUnit.MILLISECONDS));
            releaseCleanup.countDown();
            assertEquals(Category.OK, first.get(3, TimeUnit.SECONDS).category());
            assertEquals(Category.OK, service.test("admin", request(form())).category());
            assertEquals(1, permits.availablePermits());
        } finally {
            releaseCleanup.countDown();
        }
    }

    @Test
    void cancellationTombstonePreventsOutboundAndCannotCancelAnotherOwner() throws Exception {
        var request = request(form());
        service.cancel("admin-a", request.requestId());
        assertEquals(Category.CANCELLED, service.test("admin-a", request).category());
        verifyNoInteractions(transport);
        assertEquals(Category.OK, service.test("admin-b", request).category());
    }

    @Test
    void rejectsDuplicateOwnerAndCancelsRegisteredCall() throws Exception {
        var entered = new CountDownLatch(1);
        var released = new CountDownLatch(1);
        var call = mock(okhttp3.Call.class);
        doAnswer(invocation -> {
            released.countDown();
            return null;
        }).when(call).cancel();
        when(transport.execute(any(), anyString(), anyString(), any(), any())).thenAnswer(invocation -> {
            java.util.function.Consumer<okhttp3.Call> register = invocation.getArgument(4);
            register.accept(call);
            entered.countDown();
            released.await(3, TimeUnit.SECONDS);
            return new ProviderProbeTransport.Outcome(Category.NETWORK, null);
        });
        var request = request(form());
        var running = CompletableFuture.supplyAsync(() -> service.test("admin", request));
        assertTrue(entered.await(3, TimeUnit.SECONDS));
        assertEquals(Category.BUSY, service.test("admin", request(form())).category());
        service.cancel("other", request.requestId());
        verify(call, never()).cancel();
        service.cancel("admin", request.requestId());
        assertEquals(Category.CANCELLED, running.get(3, TimeUnit.SECONDS).category());
        verify(call).cancel();
    }

    @Test
    void cancellationKeepsOwnerAndGlobalAdmissionUntilUncooperativeTransportSettles() throws Exception {
        assertStoppedProbeKeepsAdmission(Category.CANCELLED);
    }

    @Test
    void timeoutKeepsOwnerAndGlobalAdmissionUntilUncooperativeTransportSettles() throws Exception {
        assertStoppedProbeKeepsAdmission(Category.TIMEOUT);
    }

    private void assertStoppedProbeKeepsAdmission(Category expected) throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var call = mock(okhttp3.Call.class);
        var permits = new Semaphore(1);
        service.close();
        service = new ProviderConnectionTestService(configurations, providers, destinations, transport, permits);
        when(transport.execute(any(), anyString(), anyString(), any(), any())).thenAnswer(invocation -> {
            java.util.function.Consumer<okhttp3.Call> register = invocation.getArgument(4);
            register.accept(call);
            entered.countDown();
            assertTrue(release.await(20, TimeUnit.SECONDS));
            return new ProviderProbeTransport.Outcome(Category.NETWORK, null);
        });
        var request = request(form());
        var running = CompletableFuture.supplyAsync(() -> service.test("admin", request));
        try {
            assertTrue(entered.await(3, TimeUnit.SECONDS));
            if (expected == Category.CANCELLED) service.cancel("admin", request.requestId());
            assertEquals(expected, running.get(15, TimeUnit.SECONDS).category());
            assertEquals(0, permits.availablePermits());
            assertEquals(Category.BUSY, service.test("admin", request(form())).category());
            assertEquals(Category.BUSY, service.test("other", request(form())).category());
            verify(call).cancel();
            verify(transport).execute(any(), anyString(), anyString(), any(), any());
            verifyNoInteractions(configurations);
        } finally {
            release.countDown();
        }
    }

    @Test
    void malformedUrlNeverSendsOrPersists() {
        var input = form();
        input.setBaseUrl("file:///tmp/fixture");
        assertEquals(Category.CONFIGURATION, service.test("admin", request(input)).category());
        verifyNoInteractions(transport, configurations);
    }

    @Test
    void realTransportFailuresRemainRedactedResultsRatherThanAddressClassifications() {
        when(transport.execute(any(), anyString(), anyString(), any(), any()))
                .thenReturn(new ProviderProbeTransport.Outcome(Category.NETWORK, null));
        assertEquals(Category.NETWORK, service.test("admin", request(form())).category());
        verifyNoInteractions(configurations);
    }
}
