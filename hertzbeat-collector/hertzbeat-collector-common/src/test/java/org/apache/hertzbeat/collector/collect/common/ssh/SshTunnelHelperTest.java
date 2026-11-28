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

package org.apache.hertzbeat.collector.collect.common.ssh;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.util.UUID;
import org.apache.hertzbeat.common.entity.job.SshTunnel;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.client.session.forward.ExplicitPortForwardingTracker;
import org.apache.sshd.common.util.net.SshdSocketAddress;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

/**
 * Tests for {@link SshTunnelHelper}.
 */
class SshTunnelHelperTest {

    @Test
    void localPortForwardInvalidatesSharedSessionWhenForwardingFails() throws Exception {
        String host = UUID.randomUUID() + ".example.com";
        SshTunnel tunnel = SshTunnel.builder()
                .enable("true")
                .host(host)
                .port("22")
                .username("root")
                .password("password")
                .timeout("1000")
                .shareConnection("true")
                .build();

        ClientSession brokenSession = mock(ClientSession.class);
        when(brokenSession.createLocalPortForwardingTracker(any(SshdSocketAddress.class), any(SshdSocketAddress.class)))
                .thenThrow(new IOException("session dead"));

        ClientSession healthySession = mock(ClientSession.class);
        ExplicitPortForwardingTracker tracker = mock(ExplicitPortForwardingTracker.class);
        when(tracker.getLocalAddress()).thenReturn(new SshdSocketAddress("localhost", 12345));
        when(tracker.getRemoteAddress()).thenReturn(new SshdSocketAddress("db.internal", 3306));
        when(tracker.getClientSession()).thenReturn(healthySession);
        when(tracker.getSession()).thenReturn(healthySession);
        when(healthySession.getConnectAddress()).thenReturn(new InetSocketAddress("127.0.0.1", 22));
        when(healthySession.createLocalPortForwardingTracker(any(SshdSocketAddress.class), any(SshdSocketAddress.class)))
                .thenReturn(tracker);

        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(
                    host, "22", "root", "password", null, null, 1000, true))
                    .thenReturn(brokenSession, healthySession);

            assertThrows(IOException.class,
                    () -> SshTunnelHelper.localPortForward(tunnel, "db.internal", "3306"));
            sshHelper.verify(() -> SshHelper.invalidateConnectSession(
                    host, "22", "root", "password", null, null, brokenSession));

            int forwardedPort = SshTunnelHelper.localPortForward(tunnel, "db.internal", "3306");
            ArgumentCaptor<SshdSocketAddress> localCaptor = ArgumentCaptor.forClass(SshdSocketAddress.class);
            verify(healthySession).createLocalPortForwardingTracker(
                    localCaptor.capture(), any(SshdSocketAddress.class));
            assertTrue(forwardedPort > 0);
            assertEquals(localCaptor.getValue().getPort(), forwardedPort);
        }
    }
}
