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

package org.apache.hertzbeat.collector.collect.telnet;

import java.io.IOException;
import java.io.OutputStream;
import java.net.ConnectException;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.net.telnet.TelnetClient;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CollectCodeConstants;
import org.apache.hertzbeat.common.constants.MetricDataConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.TelnetProtocol;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * telnet collect
 */
@Slf4j
public class TelnetCollectImpl extends AbstractCollect {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getTelnet() == null) {
            throw new IllegalArgumentException("Telnet collect must has Telnet params");
        }
    }

    @Override
    public void collect(MetricsDataBuilder metricsDataBuilder, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        TelnetProtocol telnet = metrics.getTelnet();
        int timeout = CollectUtil.getTimeout(telnet.getTimeout());
        TelnetClient telnetClient = null;
        try {
            telnetClient = new TelnetClient("vt200");
            telnetClient.setConnectTimeout(timeout);
            telnetClient.connect(telnet.getHost(), Integer.parseInt(telnet.getPort()));
            if (!telnetClient.isConnected()) {
                metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_CONNECTABLE, "Peer connect failed，Timeout " + timeout + "ms");
                return;
            }

            long responseTime = System.currentTimeMillis() - startTime;
            List<String> aliasFields = metrics.getAliasFields();
            Map<String, String> resultMap = execCmdAndParseResult(telnetClient, telnet.getCmd(), metricsDataBuilder.getApp());
            resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));
            if (resultMap.size() < aliasFields.size()) {
                log.error("telnet response data not enough: {}", resultMap);
                metricsDataBuilder.setFailedMsg("The cmd execution results do not match the expected number of metrics.");
                return;
            }

            for (String field : aliasFields) {
                String fieldValue = resultMap.get(field);
                metricsDataBuilder.getArrowVectorWriter().setValue(field, fieldValue);
            }

            telnetClient.disconnect();
        } catch (ConnectException connectException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(connectException);
            log.debug(errorMsg);
            metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_CONNECTABLE,
                    "The peer refused to connect: service port does not listening or firewall: " + errorMsg);

        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_CONNECTABLE, "Peer connect failed: " + errorMsg);

        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn(errorMsg, e);
            metricsDataBuilder.setFailedMsg(errorMsg);

        } finally {
            if (telnetClient != null) {
                try {
                    telnetClient.disconnect();
                } catch (Exception e) {
                    log.warn(e.getMessage());
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_TELNET;
    }

    private static Map<String, String> execCmdAndParseResult(TelnetClient telnetClient, String cmd, String app) throws IOException {
        if (cmd == null || StringUtils.isEmpty(cmd.trim())) {
            return new HashMap<>(16);
        }
        OutputStream outputStream = telnetClient.getOutputStream();
        outputStream.write(cmd.getBytes());
        outputStream.flush();
        String result = new String(telnetClient.getInputStream().readAllBytes());
        String[] lines = result.split("\n");
        if (CollectorConstants.ZOOKEEPER_APP.equals(app) && CollectorConstants.ZOOKEEPER_ENVI_HEAD.equals(lines[0])) {
            lines = Arrays.stream(lines)
                    .skip(1)
                    .toArray(String[]::new);
        }
        boolean contains = lines[0].contains("=");
        return Arrays.stream(lines)
                .map(item -> {
                    if (contains) {
                        return item.split("=");
                    } else {
                        return item.split("\t");
                    }
                })
                .filter(item -> item.length == 2)
                .collect(Collectors.toMap(x -> x[0], x -> x[1]));
    }
}
