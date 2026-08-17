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
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.net.telnet.TelnetClient;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.TelnetProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
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
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        TelnetProtocol telnet = metrics.getTelnet();
        int timeout = CollectUtil.getTimeout(telnet.getTimeout());
        TelnetClient telnetClient = null;
        try {
            telnetClient = new TelnetClient("vt200");
            telnetClient.setConnectTimeout(timeout);
            telnetClient.connect(telnet.getHost(), Integer.parseInt(telnet.getPort()));
            if (telnetClient.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;
                List<String> aliasFields = metrics.getAliasFields();
                String app = builder.getApp();
                CmdResult cmdResult = execCmdAndParseResult(telnetClient, telnet.getCmd(), app);
                Map<String, String> resultMap = cmdResult.values();
                boolean expectsCmdMetrics = StringUtils.isNotBlank(telnet.getCmd())
                        && aliasFields.stream().anyMatch(field -> !CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(field));
                boolean hasExpectedMetric = aliasFields.stream().anyMatch(resultMap::containsKey);
                if (expectsCmdMetrics && !hasExpectedMetric) {
                    // e.g. zookeeper refusing a 4lw command not in its 4lw.commands.whitelist
                    String reply = sanitizeReply(cmdResult.rawResponse());
                    log.warn("telnet cmd [{}] returned no expected metrics: {}", telnet.getCmd(), reply);
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Cmd [" + telnet.getCmd() + "] returned no expected metrics. Response: " + reply);
                    return;
                }
                resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String field : aliasFields) {
                    String fieldValue = resultMap.get(field);
                    valueRowBuilder.addColumn(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
                }
                builder.addValueRow(valueRowBuilder.build());
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("Peer connect failed，Timeout " + timeout + "ms");
                return;
            }
            telnetClient.disconnect();
        } catch (ConnectException connectException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(connectException);
            log.debug(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("The peer refused to connect: service port does not listening or firewall: " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Peer connect failed: " + errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
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

    record CmdResult(Map<String, String> values, String rawResponse) {
    }

    private static String sanitizeReply(String raw) {
        return StringUtils.abbreviate(raw.trim().replaceAll("[\\p{Cntrl}]+", " "), 300);
    }

    private static CmdResult execCmdAndParseResult(TelnetClient telnetClient, String cmd, String app) throws IOException {
        if (cmd == null || StringUtils.isEmpty(cmd.trim())) {
            return new CmdResult(new HashMap<>(16), "");
        }
        OutputStream outputStream = telnetClient.getOutputStream();
        outputStream.write(cmd.getBytes(StandardCharsets.UTF_8));
        outputStream.flush();
        String result = new String(telnetClient.getInputStream().readAllBytes());
        String[] lines = result.split("\n");
        if (lines.length > 0 && CollectorConstants.ZOOKEEPER_APP.equals(app)
                && CollectorConstants.ZOOKEEPER_ENVI_HEAD.equals(lines[0])) {
            lines = Arrays.stream(lines)
                    .skip(1)
                    .toArray(String[]::new);
        }
        if (lines.length == 0) {
            return new CmdResult(new HashMap<>(16), result);
        }
        String separator = lines[0].contains("=") ? "=" : "\t";
        Map<String, String> values = Arrays.stream(lines)
                .map(item -> item.split(separator, 2))
                .filter(item -> item.length == 2)
                .collect(Collectors.toMap(x -> x[0], x -> x[1], (first, second) -> first, HashMap::new));
        return new CmdResult(values, result);
    }
}
