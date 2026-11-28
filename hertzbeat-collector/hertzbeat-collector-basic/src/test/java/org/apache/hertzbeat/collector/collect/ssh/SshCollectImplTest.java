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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.io.InterruptedIOException;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.apache.hertzbeat.collector.collect.common.ssh.CommonSshClient;
import org.apache.hertzbeat.collector.collect.common.ssh.SshHelper;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ChannelExec;
import org.apache.sshd.client.channel.ClientChannel;
import org.apache.sshd.client.channel.ClientChannelEvent;
import org.apache.sshd.client.future.AuthFuture;
import org.apache.sshd.client.future.ConnectFuture;
import org.apache.sshd.client.future.OpenFuture;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.common.SshException;
import org.apache.sshd.common.channel.exception.SshChannelOpenException;
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

    @Test
    void collectPadsPartialOneRowOutput() throws Exception {
        ChannelExec channel = oneRowChannel("52\n35.8033\n5%", "", 0);
        Metrics metrics = Metrics.builder().ssh(oneRowProtocol()).build();
        metrics.setAliasFields(List.of("cpu", "memory", "disk", "nfs_mount"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(1, builder.getValuesCount());
        assertEquals("52", builder.getValues(0).getColumns(0));
        assertEquals("35.8033", builder.getValues(0).getColumns(1));
        assertEquals("5%", builder.getValues(0).getColumns(2));
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(3));
    }

    @Test
    void collectTreatsSilentEmptyOneRowOutputAsEmptyRow() throws Exception {
        ChannelExec channel = oneRowChannel("", "", 1);
        Metrics metrics = Metrics.builder().ssh(oneRowProtocol()).build();
        metrics.setAliasFields(List.of("nfs_mount"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(0));
    }

    @Test
    void collectFailsOnEmptyOutputWithStderr() throws Exception {
        ChannelExec channel = oneRowChannel("", "boom: permission denied", 1);
        Metrics metrics = Metrics.builder().ssh(oneRowProtocol()).build();
        metrics.setAliasFields(List.of("nfs_mount"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.FAIL, builder.getCode());
        assertEquals("boom: permission denied", builder.getMsg());
    }

    @Test
    void collectDecodesOutputWithConfiguredCharset() throws Exception {
        ChannelExec channel = oneRowChannel("挂载正常".getBytes(Charset.forName("GBK")), new byte[0], 0);
        SshProtocol protocol = oneRowProtocol();
        protocol.setCharset("GBK");
        Metrics metrics = Metrics.builder().ssh(protocol).build();
        metrics.setAliasFields(List.of("nfs_mount"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals("挂载正常", builder.getValues(0).getColumns(0));
    }

    @Test
    void collectParsesMultiRowWithAlignedAndTabSeparatedColumns() throws Exception {
        // header and rows mix multiple spaces, tabs and leading/trailing padding; a literal
        // single-space split shifted the columns, so every projected field must stay aligned
        String stdout = "  NAME\t   SIZE     USED \n"
                + "disk1\t40G   15G \n"
                + "  disk2  20G\t5G";
        ChannelExec channel = oneRowChannel(stdout, "", 0);
        Metrics metrics = Metrics.builder().ssh(multiRowProtocol()).build();
        metrics.setAliasFields(List.of("name", "size", "used"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(2, builder.getValuesCount());
        assertEquals("disk1", builder.getValues(0).getColumns(0));
        assertEquals("40G", builder.getValues(0).getColumns(1));
        assertEquals("15G", builder.getValues(0).getColumns(2));
        assertEquals("disk2", builder.getValues(1).getColumns(0));
        assertEquals("20G", builder.getValues(1).getColumns(1));
        assertEquals("5G", builder.getValues(1).getColumns(2));
    }

    @Test
    void collectParsesMultiRowWithSingleSpaceColumns() throws Exception {
        String stdout = "name size used\ndisk1 40G 15G";
        ChannelExec channel = oneRowChannel(stdout, "", 0);
        Metrics metrics = Metrics.builder().ssh(multiRowProtocol()).build();
        metrics.setAliasFields(List.of("name", "size", "used"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(1, builder.getValuesCount());
        assertEquals("disk1", builder.getValues(0).getColumns(0));
        assertEquals("40G", builder.getValues(0).getColumns(1));
        assertEquals("15G", builder.getValues(0).getColumns(2));
    }

    @Test
    void collectParsesMultiRowProjectsColumnsByHeaderAlias() throws Exception {
        // alias order differs from the header order: values must follow the header name mapping
        String stdout = "name\tsize  used\n disk1  40G\t15G";
        ChannelExec channel = oneRowChannel(stdout, "", 0);
        Metrics metrics = Metrics.builder().ssh(multiRowProtocol()).build();
        metrics.setAliasFields(List.of("used", "name"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(1, builder.getValuesCount());
        assertEquals("15G", builder.getValues(0).getColumns(0));
        assertEquals("disk1", builder.getValues(0).getColumns(1));
    }

    @Test
    void collectParsesMultiRowReturnsNullForMissingColumns() throws Exception {
        // a row shorter than the header and an alias absent from the header both stay NULL
        String stdout = "name size used\ndisk1 40G";
        ChannelExec channel = oneRowChannel(stdout, "", 0);
        Metrics metrics = Metrics.builder().ssh(multiRowProtocol()).build();
        metrics.setAliasFields(List.of("name", "size", "used", "vendor"));

        ClientSession clientSession = channelSession(channel);
        try (MockedStatic<SshHelper> sshHelper = mockStatic(SshHelper.class)) {
            sshHelper.when(() -> SshHelper.getConnectSession(any(), anyInt(), anyBoolean(), anyBoolean()))
                    .thenReturn(clientSession);
            sshCollect.collect(builder, metrics);
        }

        assertEquals(CollectRep.Code.SUCCESS, builder.getCode());
        assertEquals(1, builder.getValuesCount());
        assertEquals("disk1", builder.getValues(0).getColumns(0));
        assertEquals("40G", builder.getValues(0).getColumns(1));
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(2));
        assertEquals(CommonConstants.NULL_VALUE, builder.getValues(0).getColumns(3));
    }

    @Test
    void collectRecoversWithReuseConnectionAfterChannelOpenTimeout() throws Exception {
        String host = UUID.randomUUID() + ".example.com";
        SshProtocol protocol = reuseProtocol(host);
        Metrics metrics = reuseMetrics(protocol);

        ChannelExec initialChannel = oneRowChannel("ok", "", 0);
        ChannelExec timedOutChannel = mock(ChannelExec.class);
        OpenFuture failedOpen = mock(OpenFuture.class);
        CloseFuture timedOutGracefulClose = mock(CloseFuture.class);
        CloseFuture immediateLocalClose = mock(CloseFuture.class);
        when(timedOutChannel.open()).thenReturn(failedOpen);
        when(failedOpen.verify(1_000L)).thenThrow(new SshException("Channel opening failed while waiting 1000 msec."));
        when(timedOutChannel.close(false)).thenReturn(timedOutGracefulClose);
        when(timedOutGracefulClose.await(1_000L)).thenReturn(false);
        when(timedOutChannel.close(true)).thenReturn(immediateLocalClose);
        when(immediateLocalClose.await(1_000L)).thenReturn(true);

        SshClient sshClient = mock(SshClient.class);
        ClientSession firstSession = mockAuthenticatedSession();
        when(firstSession.createExecChannel("echo ok")).thenReturn(initialChannel, timedOutChannel);
        ChannelExec recoveredChannel = oneRowChannel("recovered", "", 0);
        ClientSession recoveredSession = mockAuthenticatedSession();
        when(recoveredSession.createExecChannel("echo ok")).thenReturn(recoveredChannel);

        ConnectFuture firstConnect = mockConnectFuture(firstSession);
        ConnectFuture secondConnect = mockConnectFuture(recoveredSession);
        when(sshClient.connect("root", host, 22)).thenReturn(firstConnect, secondConnect);

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            CollectRep.MetricsData.Builder firstBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(firstBuilder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, firstBuilder.getCode());
            assertEquals("ok", firstBuilder.getValues(0).getColumns(0));

            CollectRep.MetricsData.Builder failedBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(failedBuilder, metrics);
            assertEquals(CollectRep.Code.UN_CONNECTABLE, failedBuilder.getCode());

            CollectRep.MetricsData.Builder recoveredBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(recoveredBuilder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, recoveredBuilder.getCode());
            assertEquals("recovered", recoveredBuilder.getValues(0).getColumns(0));
        }

        verify(sshClient, times(2)).connect("root", host, 22);
        verify(firstSession).close();
    }

    @Test
    void collectRecoversWithReuseConnectionAfterCommandTimeout() throws Exception {
        String host = UUID.randomUUID() + ".example.com";
        SshProtocol protocol = reuseProtocol(host);
        Metrics metrics = reuseMetrics(protocol);

        ChannelExec initialChannel = oneRowChannel("ok", "", 0);
        ChannelExec hungChannel = mock(ChannelExec.class);
        OpenFuture openFuture = mock(OpenFuture.class);
        CloseFuture closeFuture = mock(CloseFuture.class);
        when(hungChannel.open()).thenReturn(openFuture);
        when(hungChannel.waitFor(any(), anyLong())).thenReturn(Set.of(ClientChannelEvent.TIMEOUT));
        when(hungChannel.getInvertedIn()).thenReturn(OutputStream.nullOutputStream());
        when(hungChannel.close(false)).thenReturn(closeFuture);
        when(closeFuture.await(1_000L)).thenReturn(true);

        SshClient sshClient = mock(SshClient.class);
        ClientSession firstSession = mockAuthenticatedSession();
        when(firstSession.createExecChannel("echo ok")).thenReturn(initialChannel, hungChannel);
        ChannelExec recoveredChannel = oneRowChannel("recovered", "", 0);
        ClientSession recoveredSession = mockAuthenticatedSession();
        when(recoveredSession.createExecChannel("echo ok")).thenReturn(recoveredChannel);

        ConnectFuture firstConnect = mockConnectFuture(firstSession);
        ConnectFuture secondConnect = mockConnectFuture(recoveredSession);
        when(sshClient.connect("root", host, 22)).thenReturn(firstConnect, secondConnect);

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            CollectRep.MetricsData.Builder firstBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(firstBuilder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, firstBuilder.getCode());

            CollectRep.MetricsData.Builder timedOutBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(timedOutBuilder, metrics);
            assertEquals(CollectRep.Code.UN_CONNECTABLE, timedOutBuilder.getCode());

            CollectRep.MetricsData.Builder recoveredBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(recoveredBuilder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, recoveredBuilder.getCode());
            assertEquals("recovered", recoveredBuilder.getValues(0).getColumns(0));
        }

        verify(sshClient, times(2)).connect("root", host, 22);
        verify(firstSession).close();
    }

    @Test
    void collectKeepsCachedSessionOnChannelOpenLimit() throws Exception {
        String host = UUID.randomUUID() + ".example.com";
        SshProtocol protocol = reuseProtocol(host);
        Metrics metrics = reuseMetrics(protocol);

        ChannelExec initialChannel = oneRowChannel("ok", "", 0);
        ChannelExec rejectedChannel = mock(ChannelExec.class);
        OpenFuture rejectedOpen = mock(OpenFuture.class);
        CloseFuture closeFuture = mock(CloseFuture.class);
        when(rejectedChannel.open()).thenReturn(rejectedOpen);
        when(rejectedOpen.verify(1_000L))
                .thenThrow(new SshException("channel limit", new SshChannelOpenException(0L, 1, "MaxSessions")));
        when(rejectedChannel.close(false)).thenReturn(closeFuture);
        when(closeFuture.await(1_000L)).thenReturn(true);
        ChannelExec thirdChannel = oneRowChannel("reused", "", 0);

        SshClient sshClient = mock(SshClient.class);
        ClientSession session = mockAuthenticatedSession();
        when(session.createExecChannel("echo ok")).thenReturn(initialChannel, rejectedChannel, thirdChannel);
        ConnectFuture connectFuture = mockConnectFuture(session);
        when(sshClient.connect("root", host, 22)).thenReturn(connectFuture);

        try (MockedStatic<CommonSshClient> commonSshClient = mockStatic(CommonSshClient.class)) {
            commonSshClient.when(CommonSshClient::getSshClient).thenReturn(sshClient);

            CollectRep.MetricsData.Builder firstBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(firstBuilder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, firstBuilder.getCode());

            CollectRep.MetricsData.Builder limitedBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(limitedBuilder, metrics);
            assertEquals(CollectRep.Code.UN_CONNECTABLE, limitedBuilder.getCode());

            CollectRep.MetricsData.Builder reusedBuilder = CollectRep.MetricsData.newBuilder();
            sshCollect.collect(reusedBuilder, metrics);
            assertEquals(CollectRep.Code.SUCCESS, reusedBuilder.getCode());
            assertEquals("reused", reusedBuilder.getValues(0).getColumns(0));
        }

        verify(sshClient, times(1)).connect("root", host, 22);
        verify(session, never()).close();
    }

    private SshProtocol reuseProtocol(String host) {
        return SshProtocol.builder()
                .host(host)
                .port("22")
                .username("root")
                .password("password")
                .timeout("1000")
                .reuseConnection("true")
                .useProxy("false")
                .script("echo ok")
                .parseType("oneRow")
                .build();
    }

    private Metrics reuseMetrics(SshProtocol protocol) {
        Metrics metrics = Metrics.builder().ssh(protocol).build();
        metrics.setAliasFields(List.of("status"));
        return metrics;
    }

    private ClientSession mockAuthenticatedSession() throws IOException {
        ClientSession session = mock(ClientSession.class);
        AuthFuture authFuture = mock(AuthFuture.class);
        when(session.auth()).thenReturn(authFuture);
        when(authFuture.verify(1_000, TimeUnit.MILLISECONDS)).thenReturn(authFuture);
        return session;
    }

    private ConnectFuture mockConnectFuture(ClientSession session) throws IOException {
        ConnectFuture connectFuture = mock(ConnectFuture.class);
        when(connectFuture.verify(1_000, TimeUnit.MILLISECONDS)).thenReturn(connectFuture);
        when(connectFuture.getSession()).thenReturn(session);
        return connectFuture;
    }

    private SshProtocol multiRowProtocol() {
        return SshProtocol.builder()
                .host("target.example.com")
                .port("22")
                .username("root")
                .password("password")
                .timeout("1000")
                .reuseConnection("true")
                .useProxy("false")
                .script("echo ok")
                .parseType("multiRow")
                .build();
    }

    private SshProtocol oneRowProtocol() {
        return SshProtocol.builder()
                .host("target.example.com")
                .port("22")
                .username("root")
                .password("password")
                .timeout("1000")
                .reuseConnection("true")
                .useProxy("false")
                .script("echo ok")
                .parseType("oneRow")
                .build();
    }

    private ClientSession channelSession(ChannelExec channel) throws IOException {
        ClientSession clientSession = mock(ClientSession.class);
        when(clientSession.createExecChannel("echo ok")).thenReturn(channel);
        return clientSession;
    }

    private ChannelExec oneRowChannel(String stdout, String stderr, int exitStatus) throws IOException {
        return oneRowChannel(stdout.getBytes(StandardCharsets.UTF_8), stderr.getBytes(StandardCharsets.UTF_8), exitStatus);
    }

    private ChannelExec oneRowChannel(byte[] stdout, byte[] stderr, int exitStatus) throws IOException {
        ChannelExec channel = mock(ChannelExec.class);
        OpenFuture openFuture = mock(OpenFuture.class);
        CloseFuture closeFuture = mock(CloseFuture.class);
        AtomicReference<OutputStream> out = new AtomicReference<>();
        AtomicReference<OutputStream> err = new AtomicReference<>();
        doAnswer(inv -> {
            out.set(inv.getArgument(0));
            return null;
        }).when(channel).setOut(any());
        doAnswer(inv -> {
            err.set(inv.getArgument(0));
            return null;
        }).when(channel).setErr(any());
        when(channel.open()).thenReturn(openFuture);
        when(channel.waitFor(any(), anyLong())).thenAnswer(inv -> {
            out.get().write(stdout);
            err.get().write(stderr);
            return Set.of(ClientChannelEvent.CLOSED);
        });
        when(channel.getExitStatus()).thenReturn(exitStatus);
        when(channel.close(false)).thenReturn(closeFuture);
        when(closeFuture.await(anyLong())).thenReturn(true);
        return channel;
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
