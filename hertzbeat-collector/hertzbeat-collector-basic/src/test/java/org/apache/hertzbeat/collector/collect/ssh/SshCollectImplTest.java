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

package org.apache.hertzbeat.collector.collect.ssh;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.List;
import org.apache.hertzbeat.collector.collect.common.ssh.SshHelper;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.sshd.client.channel.ChannelExec;
import org.apache.sshd.client.channel.ClientChannel;
import org.apache.sshd.client.future.OpenFuture;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.SshException;
import org.apache.sshd.common.future.CloseFuture;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;

/**
 * Test case for {@link SshCollectImpl}
 */
class SshCollectImplTest {
    private SshCollectImpl sshCollect;
    private CollectRep.MetricsData.Builder builder;

    @BeforeEach
    void setUp() {
        sshCollect = new SshCollectImpl();
        builder = CollectRep.MetricsData.newBuilder();
    }

    @Test
    void preCheck() {
        // metrics is null
        assertThrows(IllegalArgumentException.class, () -> {
            sshCollect.preCheck(null);
        });

        // ssh protocol is null
        assertThrows(IllegalArgumentException.class, () -> {
            Metrics metrics = Metrics.builder().build();
            sshCollect.preCheck(metrics);
        });

        // everything is ok
        assertDoesNotThrow(() -> {
            Metrics metrics = Metrics.builder().ssh(new SshProtocol()).build();
            sshCollect.preCheck(metrics);
        });
    }

    @Test
    void collect() {
        assertDoesNotThrow(() -> {
            Metrics metrics = Metrics.builder().ssh(new SshProtocol()).build();
            sshCollect.collect(builder, metrics);
            assertEquals(CollectRep.Code.FAIL, builder.getCode());
        });
    }

    @Test
    void supportProtocol() {
        assertEquals(DispatchConstants.PROTOCOL_SSH, sshCollect.supportProtocol());
    }

    @Test
    void closeChannelWaitsForGracefulClose() throws IOException {
        ClientChannel channel = mock(ClientChannel.class);
        CloseFuture closeFuture = mock(CloseFuture.class);
        when(channel.close(false)).thenReturn(closeFuture);
        when(closeFuture.await(1_000)).thenReturn(true);

        assertTrue(SshCollectImpl.closeChannel(channel, 1_000));
        verify(channel).close(false);
        verify(channel, never()).close(true);
    }

    @Test
    void closeChannelForcesCleanupAfterGracefulTimeout() throws IOException {
        ClientChannel channel = mock(ClientChannel.class);
        CloseFuture gracefulClose = mock(CloseFuture.class);
        CloseFuture immediateClose = mock(CloseFuture.class);
        when(channel.close(false)).thenReturn(gracefulClose);
        when(gracefulClose.await(1_000)).thenReturn(false);
        when(channel.close(true)).thenReturn(immediateClose);
        when(immediateClose.await(1_000)).thenReturn(true);

        assertTrue(SshCollectImpl.closeChannel(channel, 1_000));
        verify(channel).close(false);
        verify(channel).close(true);
    }

    @Test
    void closeChannelForcesCleanupAndPreservesInterrupt() throws IOException {
        ClientChannel channel = mock(ClientChannel.class);
        CloseFuture gracefulClose = mock(CloseFuture.class);
        when(channel.close(false)).thenReturn(gracefulClose);
        when(gracefulClose.await(1_000)).thenThrow(new InterruptedIOException("interrupted"));

        try {
            assertThrows(InterruptedIOException.class,
                    () -> SshCollectImpl.closeChannel(channel, 1_000));
            assertTrue(Thread.currentThread().isInterrupted());
            verify(channel).close(true);
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void closeChannelSkipsAlreadyClosedChannel() throws IOException {
        ClientChannel channel = mock(ClientChannel.class);
        when(channel.isClosed()).thenReturn(true);

        assertTrue(SshCollectImpl.closeChannel(channel, 1_000));
        verify(channel, never()).close(false);
        verify(channel, never()).close(true);
    }

    @Test
    void closeChannelSuppressesForcedCloseFailureAndPreservesInterrupt() throws IOException {
        ClientChannel channel = mock(ClientChannel.class);
        CloseFuture gracefulClose = mock(CloseFuture.class);
        InterruptedIOException interrupted = new InterruptedIOException("interrupted");
        IllegalStateException closeFailure = new IllegalStateException("force close failed");
        when(channel.close(false)).thenReturn(gracefulClose);
        when(gracefulClose.await(1_000)).thenThrow(interrupted);
        when(channel.close(true)).thenThrow(closeFailure);

        try {
            InterruptedIOException thrown = assertThrows(InterruptedIOException.class,
                    () -> SshCollectImpl.closeChannel(channel, 1_000));
            assertSame(interrupted, thrown);
            assertEquals(List.of(closeFailure), List.of(thrown.getSuppressed()));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
    }

    @Test
    void collectFinallyAwaitsGracefulChannelClose() throws Exception {
        int timeout = 1_000;
        SshProtocol protocol = protocol(timeout);
        Metrics metrics = Metrics.builder().ssh(protocol).build();
        ClientSession clientSession = mock(ClientSession.class);
        ChannelExec channel = mock(ChannelExec.class);
        OpenFuture openFuture = mock(OpenFuture.class);
        CloseFuture closeFuture = mock(CloseFuture.class);
        when(clientSession.createExecChannel("echo ok")).thenReturn(channel);
        when(channel.open()).thenReturn(openFuture);
        when(openFuture.verify(timeout)).thenThrow(new SshException("channel open failed"));
        when(channel.close(false)).thenReturn(closeFuture);
        when(closeFuture.await(timeout)).thenReturn(true);

        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(protocol, timeout, true, false))
                    .thenReturn(clientSession);

            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.UN_CONNECTABLE, builder.getCode());
        verify(channel).close(false);
        verify(closeFuture).await(timeout);
        verify(channel, never()).close(true);
        verify(clientSession, never()).close();
    }

    @Test
    void collectClosesExactSessionWhenChannelCannotClose() throws Exception {
        int timeout = 1_000;
        SshProtocol protocol = protocol(timeout);
        Metrics metrics = Metrics.builder().ssh(protocol).build();
        ClientSession clientSession = mock(ClientSession.class);
        ChannelExec channel = mock(ChannelExec.class);
        OpenFuture openFuture = mock(OpenFuture.class);
        CloseFuture gracefulClose = mock(CloseFuture.class);
        CloseFuture immediateClose = mock(CloseFuture.class);
        when(clientSession.createExecChannel("echo ok")).thenReturn(channel);
        when(channel.open()).thenReturn(openFuture);
        when(openFuture.verify(timeout)).thenThrow(new SshException("channel open failed"));
        when(channel.close(false)).thenReturn(gracefulClose);
        when(gracefulClose.await(timeout)).thenReturn(false);
        when(channel.close(true)).thenReturn(immediateClose);
        when(immediateClose.await(timeout)).thenReturn(false);

        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(protocol, timeout, true, false))
                    .thenReturn(clientSession);

            sshCollect.collect(builder, metrics);
        }

        verify(channel).close(false);
        verify(gracefulClose).await(timeout);
        verify(channel).close(true);
        verify(immediateClose).await(timeout);
        verify(clientSession).close();
    }

    private SshProtocol protocol(int timeout) {
        return SshProtocol.builder()
                .host("target.example.com")
                .port("22")
                .username("root")
                .password("password")
                .timeout(String.valueOf(timeout))
                .reuseConnection("true")
                .useProxy("false")
                .script("echo ok")
                .build();
    }
}
