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

package org.apache.hertzbeat.collector.collect.websocket;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.WebsocketProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.util.Assert;

/**
 * Websocket Collect
 */
@Slf4j
public class WebsocketCollectImpl extends AbstractCollect {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getWebsocket() == null) {
            throw new IllegalArgumentException("Websocket collect must has Websocket params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();

        WebsocketProtocol websocketProtocol = metrics.getWebsocket();
        // Compatible with monitoring templates without path parameters
        if (StringUtils.isBlank(websocketProtocol.getPath())) {
            websocketProtocol.setPath("/");
        }
        checkParam(websocketProtocol);
        String host = websocketProtocol.getHost();
        String port = websocketProtocol.getPort();
        Socket socket = null;
        try {
            socket = new Socket();
            SocketAddress socketAddress = new InetSocketAddress(host, Integer.parseInt(port));
            socket.connect(socketAddress);

            if (socket.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;
                OutputStream out = socket.getOutputStream();
                InputStream in = socket.getInputStream();
                
                send(out, websocketProtocol);
                Map<String, String> resultMap = readHeaders(in);
                resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));

                // Close the output stream and socket connection
                in.close();
                out.close();
                socket.close();
                List<String> aliasFields = metrics.getAliasFields();
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String field : aliasFields) {
                    String fieldValue = resultMap.get(field);
                    valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
                }
                builder.addValues(valueRowBuilder.build());
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("Peer connect failed:");
            }
        } catch (UnknownHostException unknownHostException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(unknownHostException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("UnknownHost:" + errorMsg);
        } catch (SocketTimeoutException socketTimeoutException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(socketTimeoutException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Socket connect timeout: " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Connect may fail:" + errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_WEBSOCKET;
    }

    private void send(OutputStream out, WebsocketProtocol websocketProtocol) throws IOException {
        byte[] key = generateRandomKey();
        String base64Key = base64Encode(key);
        String requestLine = "GET " + websocketProtocol.getPath() + " HTTP/1.1\r\n";
        out.write(requestLine.getBytes());
        String hostName = InetAddress.getLocalHost().getHostAddress();
        out.write(("Host:" + hostName + "\r\n").getBytes());
        out.write("Upgrade: websocket\r\n".getBytes());
        out.write("Connection: Upgrade\r\n".getBytes());
        out.write("Sec-WebSocket-Version: 13\r\n".getBytes());
        out.write("Sec-WebSocket-Extensions: chat, superchat\r\n".getBytes());
        out.write(("Sec-WebSocket-Key: " + base64Key + "\r\n").getBytes());
        out.write("Content-Length: 0\r\n".getBytes());
        out.write("\r\n".getBytes());
        out.flush();
    }

    // Read response headers
    private Map<String, String> readHeaders(InputStream in) throws IOException {

        Map<String, String> map = new HashMap<>(8);
        BufferedReader reader = new BufferedReader(new InputStreamReader(in));

        String line;
        while ((line = reader.readLine()) != null && !line.isEmpty()) {
            int separatorIndex = line.indexOf(':');
            if (separatorIndex != -1) {
                String key = line.substring(0, separatorIndex).trim();
                String value = line.substring(separatorIndex + 1).trim();
                // Lowercase first letter
                map.put(StringUtils.uncapitalize(key), value);
            } else {
                // Cut HTTP/1.1, 101, Switching Protocols
                String[] parts = line.split("\\s+", 3);
                if (parts.length == 3) {
                    for (String part : parts) {
                        if (part.startsWith("HTTP")) {
                            map.put("httpVersion", part);
                        } else if (StringUtils.isNotBlank(part) && Character.isDigit(part.charAt(0))) {
                            map.put("responseCode", part);
                        } else {
                            map.put("statusMessage", part);
                        }
                    }
                }
            }
        }
        return map;
    }

    private byte[] generateRandomKey() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] key = new byte[16];
        secureRandom.nextBytes(key);
        return key;
    }

    private void checkParam(WebsocketProtocol protocol) {
        Assert.hasText(protocol.getHost(), "Websocket Protocol host is required.");
        Assert.hasText(protocol.getPort(), "Websocket Protocol port is required.");
        Assert.hasText(protocol.getPath(), "Websocket Protocol path is required.");
    }
    
    private String base64Encode(byte[] data) {
        return Base64.getEncoder().encodeToString(data);
    }
}
