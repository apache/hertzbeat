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

package org.apache.hertzbeat.collector.collect;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockConstruction;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.hertzbeat.collector.collect.ftp.FtpCollectImpl;
import org.apache.hertzbeat.collector.collect.websocket.WebsocketCollectImpl;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.FtpProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.WebsocketProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ResourceCleanupTest {

    @ParameterizedTest
    @ValueSource(strings = {"login-rejected", "login-io", "directory-io", "connect-io"})
    void ftpFailuresAlwaysDisconnect(String failure) throws Exception {
        try (var clients = mockConstruction(FTPClient.class, (client, context) -> {
            when(client.login("fixture-user", "fixture-password")).thenReturn(!failure.equals("login-rejected"));
            if (failure.equals("login-io")) {
                when(client.login("fixture-user", "fixture-password")).thenThrow(new IOException("fixture login failure"));
            } else if (failure.equals("directory-io")) {
                when(client.changeWorkingDirectory("/")).thenThrow(new IOException("fixture directory failure"));
            } else if (failure.equals("connect-io")) {
                doThrow(new IOException("fixture connect failure")).when(client).connect("127.0.0.1", 21);
            }
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new FtpCollectImpl().collect(result, ftpMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertEquals(0, result.getValuesCount());
            verify(clients.constructed().get(0)).disconnect();
        }
    }

    @Test
    void ftpSuccessRetainsValuesAndDisconnectsOnce() throws Exception {
        try (var clients = mockConstruction(FTPClient.class, (client, context) -> {
            when(client.login("fixture-user", "fixture-password")).thenReturn(true);
            when(client.changeWorkingDirectory("/")).thenReturn(true);
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new FtpCollectImpl().collect(result, ftpMetrics());
            assertEquals(CollectRep.Code.SUCCESS, result.getCode());
            assertEquals(1, result.getValuesCount());
            assertEquals("true", result.getValues(0).getColumns(0));
            assertTrue(Long.parseLong(result.getValues(0).getColumns(1)) >= 0);
            verify(clients.constructed().get(0)).disconnect();
        }
    }

    @Test
    void ftpCleanupFailureDoesNotReplaceLoginFailure() throws Exception {
        try (var clients = mockConstruction(FTPClient.class, (client, context) -> {
            when(client.login("fixture-user", "fixture-password")).thenReturn(false);
            doThrow(new IOException("fixture cleanup failure")).when(client).disconnect();
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new FtpCollectImpl().collect(result, ftpMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertTrue(result.getMsg().contains("username or password"));
            verify(clients.constructed().get(0)).disconnect();
        }
    }

    @Test
    void ftpSuccessfulReadWithFailedDisconnectStillReportsFailure() throws Exception {
        try (var clients = mockConstruction(FTPClient.class, (client, context) -> {
            when(client.login("fixture-user", "fixture-password")).thenReturn(true);
            when(client.changeWorkingDirectory("/")).thenReturn(true);
            doThrow(new IOException("fixture cleanup failure")).when(client).disconnect();
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new FtpCollectImpl().collect(result, ftpMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertEquals(0, result.getValuesCount());
            verify(clients.constructed().get(0)).disconnect();
        }
    }

    @Test
    void ftpRuntimeCleanupFailureDoesNotReplaceLoginFailure() throws Exception {
        try (var clients = mockConstruction(FTPClient.class, (client, context) -> {
            when(client.login("fixture-user", "fixture-password")).thenReturn(false);
            doThrow(new IllegalStateException("fixture runtime cleanup failure")).when(client).disconnect();
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new FtpCollectImpl().collect(result, ftpMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertTrue(result.getMsg().contains("username or password"));
            verify(clients.constructed().get(0)).disconnect();
        }
    }

    @Test
    void ftpSuccessfulReadWithRuntimeCleanupFailureStillReportsFailure() throws Exception {
        try (var clients = mockConstruction(FTPClient.class, (client, context) -> {
            when(client.login("fixture-user", "fixture-password")).thenReturn(true);
            when(client.changeWorkingDirectory("/")).thenReturn(true);
            doThrow(new IllegalStateException("fixture runtime cleanup failure")).when(client).disconnect();
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new FtpCollectImpl().collect(result, ftpMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertTrue(result.getMsg().contains("fixture runtime cleanup failure"));
            assertEquals(0, result.getValuesCount());
            verify(clients.constructed().get(0)).disconnect();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"connect", "write", "read"})
    void websocketFailuresAlwaysCloseSocket(String failure) throws Exception {
        try (var sockets = mockConstruction(Socket.class, (socket, context) -> {
            when(socket.isConnected()).thenReturn(true);
            when(socket.getInputStream()).thenReturn(failure.equals("read") ? failingInput() : response());
            OutputStream output = new ByteArrayOutputStream();
            if (failure.equals("connect")) {
                doThrow(new SocketTimeoutException("fixture connect failure")).when(socket).connect(any(SocketAddress.class));
            } else if (failure.equals("write")) {
                output = mock(OutputStream.class);
                doThrow(new IOException("fixture write failure")).when(output).write(any(byte[].class));
            }
            when(socket.getOutputStream()).thenReturn(output);
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new WebsocketCollectImpl().collect(result, websocketMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertEquals(0, result.getValuesCount());
            verify(sockets.constructed().get(0)).close();
        }
    }

    @Test
    void websocketSuccessPreservesHandshakeValuesAndClosesSocket() throws Exception {
        try (var sockets = mockConstruction(Socket.class, (socket, context) -> {
            when(socket.isConnected()).thenReturn(true);
            when(socket.getInputStream()).thenReturn(response());
            when(socket.getOutputStream()).thenReturn(new ByteArrayOutputStream());
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new WebsocketCollectImpl().collect(result, websocketMetrics());
            assertEquals(CollectRep.Code.SUCCESS, result.getCode());
            assertEquals(1, result.getValuesCount());
            assertEquals("101", result.getValues(0).getColumns(0));
            assertEquals("Switching Protocols", result.getValues(0).getColumns(1));
            verify(sockets.constructed().get(0)).close();
        }
    }

    @Test
    void websocketFlushesBufferedHandshakeBeforeReadingResponse() throws Exception {
        ByteArrayOutputStream wire = new ByteArrayOutputStream();
        OutputStream output = new BufferedOutputStream(wire);
        InputStream input = new ByteArrayInputStream("HTTP/1.1 101 Switching Protocols\r\n\r\n"
                .getBytes(StandardCharsets.UTF_8)) {
            @Override
            public synchronized int read(byte[] bytes, int offset, int length) {
                assertTrue(wire.toString(StandardCharsets.UTF_8).endsWith("\r\n\r\n"));
                return super.read(bytes, offset, length);
            }
        };
        try (var sockets = mockConstruction(Socket.class, (socket, context) -> {
            when(socket.isConnected()).thenReturn(true);
            when(socket.getInputStream()).thenReturn(input);
            when(socket.getOutputStream()).thenReturn(output);
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new WebsocketCollectImpl().collect(result, websocketMetrics());
            assertEquals(CollectRep.Code.SUCCESS, result.getCode());
            assertEquals(1, result.getValuesCount());
            verify(sockets.constructed().get(0)).close();
        }
    }

    @Test
    void websocketNotConnectedStillClosesSocket() throws Exception {
        try (var sockets = mockConstruction(Socket.class)) {
            var result = CollectRep.MetricsData.newBuilder();
            new WebsocketCollectImpl().collect(result, websocketMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            verify(sockets.constructed().get(0)).close();
        }
    }

    @Test
    void websocketCleanupFailureDoesNotReplaceReadFailure() throws Exception {
        try (var sockets = mockConstruction(Socket.class, (socket, context) -> {
            when(socket.isConnected()).thenReturn(true);
            when(socket.getOutputStream()).thenReturn(new ByteArrayOutputStream());
            when(socket.getInputStream()).thenReturn(failingInput());
            doThrow(new IOException("fixture cleanup failure")).when(socket).close();
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new WebsocketCollectImpl().collect(result, websocketMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertTrue(result.getMsg().contains("fixture read failure"));
            verify(sockets.constructed().get(0)).close();
        }
    }

    @Test
    void websocketSuccessfulReadWithFailedCloseStillReportsFailureWithoutRows() throws Exception {
        try (var sockets = mockConstruction(Socket.class, (socket, context) -> {
            when(socket.isConnected()).thenReturn(true);
            when(socket.getInputStream()).thenReturn(response());
            when(socket.getOutputStream()).thenReturn(new ByteArrayOutputStream());
            doThrow(new IOException("fixture cleanup failure")).when(socket).close();
        })) {
            var result = CollectRep.MetricsData.newBuilder();
            new WebsocketCollectImpl().collect(result, websocketMetrics());
            assertEquals(CollectRep.Code.UN_CONNECTABLE, result.getCode());
            assertEquals(0, result.getValuesCount());
            verify(sockets.constructed().get(0)).close();
        }
    }

    private Metrics ftpMetrics() {
        Metrics metrics = new Metrics();
        metrics.setFtp(FtpProtocol.builder().host("127.0.0.1").port("21").timeout("100")
                .username("fixture-user").password("fixture-password").direction("/").build());
        metrics.setAliasFields(List.of("isActive", "responseTime"));
        return metrics;
    }

    private Metrics websocketMetrics() {
        Metrics metrics = new Metrics();
        metrics.setWebsocket(WebsocketProtocol.builder().host("127.0.0.1").port("18569").path("/").build());
        metrics.setAliasFields(List.of("responseCode", "statusMessage"));
        return metrics;
    }

    private InputStream response() {
        return new ByteArrayInputStream("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n\r\n"
                .getBytes(StandardCharsets.UTF_8));
    }

    private InputStream failingInput() {
        return new InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("fixture read failure");
            }
        };
    }
}
