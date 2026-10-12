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

package org.apache.hertzbeat.manager.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.provider.SurenessAccountProvider;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.apache.hertzbeat.manager.setup.identity.AccountCredentialVerifier;
import org.apache.hertzbeat.manager.setup.identity.IdentityPasswordPolicy;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ManagedTokenRevocationConsistencyTest {
    private static final String TOKEN = "synthetic-revocation-fixture";

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void externalRevocationIsObservedByBothPreviouslyUsedInstances(int mode) {
        var storage = mock(AuthTokenDao.class);
        var active = new AtomicBoolean(true);
        stubReads(storage, active);
        var first = service(storage);
        var second = service(storage);
        assertThat(check(first, mode)).isNull();
        assertThat(check(second, mode)).isNull();
        active.set(false);
        assertThat(check(first, mode)).isEqualTo("Token has been revoked");
        assertThat(check(second, mode)).isEqualTo("Token has been revoked");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void eachStatusCheckReadsCurrentStorageRatherThanRetainingNegativeState(int mode) {
        var storage = mock(AuthTokenDao.class);
        var active = new AtomicBoolean(false);
        stubReads(storage, active);
        var account = service(storage);
        assertThat(check(account, mode)).isEqualTo("Token has been revoked");
        active.set(true);
        assertThat(check(account, mode)).isNull();
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void oldInFlightReadCannotPublishActiveStateForSubsequentChecks(int mode) throws Exception {
        var storage = mock(AuthTokenDao.class);
        var active = new AtomicBoolean(true);
        var firstRead = new AtomicBoolean(true);
        var loaded = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        org.mockito.stubbing.Answer<Boolean> answer = invocation -> {
            boolean observed = active.get();
            if (firstRead.compareAndSet(true, false)) {
                loaded.countDown();
                if (!release.await(5, TimeUnit.SECONDS)) {
                    throw new IllegalStateException("Fixture read was not released");
                }
            }
            return observed;
        };
        when(storage.existsByTokenHashAndStatus(any(String.class), eq((byte) 0))).thenAnswer(answer);
        when(storage.existsByTokenHashAndStatusAndTokenScopeIn(any(String.class), eq((byte) 0), anyCollection()))
                .thenAnswer(answer);
        when(storage.existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                any(String.class), eq((byte) 0), anyCollection(), eq("default"))).thenAnswer(answer);
        var account = service(storage);
        try (var executor = Executors.newSingleThreadExecutor()) {
            var inFlight = executor.submit(() -> check(account, mode));
            try {
                assertThat(loaded.await(5, TimeUnit.SECONDS)).isTrue();
                active.set(false);
            } finally {
                release.countDown();
            }
            // A read which observed active before revocation may complete; it must not affect later reads.
            assertThat(inFlight.get(5, TimeUnit.SECONDS)).isNull();
            assertThat(check(account, mode)).isEqualTo("Token has been revoked");
        }
    }

    private static void stubReads(AuthTokenDao storage, AtomicBoolean active) {
        when(storage.existsByTokenHashAndStatus(any(String.class), eq((byte) 0)))
                .thenAnswer(invocation -> active.get());
        when(storage.existsByTokenHashAndStatusAndTokenScopeIn(any(String.class), eq((byte) 0), anyCollection()))
                .thenAnswer(invocation -> active.get());
        when(storage.existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                any(String.class), eq((byte) 0), anyCollection(), eq("default")))
                .thenAnswer(invocation -> active.get());
    }

    private static AccountServiceImpl service(AuthTokenDao storage) {
        return new AccountServiceImpl(mock(SurenessAccountProvider.class), storage,
                new AccountCredentialVerifier(new IdentityPasswordPolicy()));
    }

    private static String check(AccountService account, int mode) {
        return switch (mode) {
            case 0 -> account.checkTokenStatus(TOKEN);
            case 1 -> account.checkTokenStatus(TOKEN, AuthTokenScopes.READONLY_QUERY);
            case 2 -> account.checkTokenStatus(TOKEN, AuthTokenScopes.READONLY_QUERY, "default");
            default -> throw new IllegalArgumentException("Unknown fixture mode");
        };
    }
}
