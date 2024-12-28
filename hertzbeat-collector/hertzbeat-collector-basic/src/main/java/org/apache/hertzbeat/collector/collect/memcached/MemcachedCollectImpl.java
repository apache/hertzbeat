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

package org.apache.hertzbeat.collector.collect.memcached;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MemcachedProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 *  memcached collect
 */
@Slf4j
public class MemcachedCollectImpl extends AbstractCollect {

    private static final String STATS = "stats";
    private static final String STATS_SETTINGS = "stats settings";
    private static final String STATS_SIZES = "stats sizes";
    private static final String STATS_END_RSP = "END";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getMemcached() == null) {
            throw new IllegalArgumentException("Memcached collect must has Memcached params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();

        MemcachedProtocol memcachedProtocol = metrics.getMemcached();
        String memcachedHost = memcachedProtocol.getHost();
        String memcachedPort = memcachedProtocol.getPort();
        Socket socket = null;
        try {
            socket = new Socket();
            SocketAddress socketAddress = new InetSocketAddress(memcachedHost, Integer.parseInt(memcachedPort));
            socket.connect(socketAddress);
            if (socket.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;
                PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
                BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                // Send a command to collect statistics
                Map<String, String> resultMap = new HashMap<>(128);
                parseCmdResponse(resultMap, in, out, STATS);
                parseCmdResponse(resultMap, in, out, STATS_SETTINGS);
                parseSizesOutput(resultMap, in, out);

                resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));

                //  Close the output stream and socket connection
                in.close();
                out.close();
                socket.close();
                List<String> aliasFields = metrics.getAliasFields();
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String field : aliasFields) {
                    String fieldValue = resultMap.get(field);
                    valueRowBuilder.addColumn(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
                }
                builder.addValueRow(valueRowBuilder.build());
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
            builder.setMsg("Connect fail:" + errorMsg);
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
        }
    }

    private static void parseCmdResponse(Map<String, String> statsMap,
                                         BufferedReader in,
                                         PrintWriter out,
                                         String cmd) throws IOException {
        out.println(cmd);
        String line;
        while ((line = in.readLine()) != null && !line.equals(STATS_END_RSP)) {
            // Parse each line and store the key-value pairs in a HashMap
            String[] parts = line.split(" ");
            if (parts.length == 3) {
                statsMap.put(parts[1], parts[2]);
            }
        }
    }

    private static void parseSizesOutput(Map<String, String> statsMap,
                                         BufferedReader in,
                                         PrintWriter out) throws IOException {
        out.println(STATS_SIZES);
        String line;
        while ((line = in.readLine()) != null && !line.equals(STATS_END_RSP)) {
            String[] parts = line.split("\\s+");
            // Extract slab size and slab count, then add them to the HashMap
            if (parts.length >= 3 && "STAT".equals(parts[0])) {
                statsMap.put("item_size", parts[1]);
                statsMap.put("item_count", parts[2]);
            }
        }
    }


    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MEMCACHED;
    }
}
