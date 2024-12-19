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

package org.apache.hertzbeat.collector.collect.smtp;

import java.io.IOException;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.smtp.SMTP;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.common.entity.arrow.MetricsDataBuilder;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CollectCodeConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SmtpProtocol;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * smtp collect
 */
@Slf4j
public class SmtpCollectImpl extends AbstractCollect {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getSmtp() == null) {
            throw new IllegalArgumentException("Smtp collect must has Smtp params");
        }
    }

    @Override
    public void collect(MetricsDataBuilder metricsDataBuilder, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        SmtpProtocol smtpProtocol = metrics.getSmtp();
        String host = smtpProtocol.getHost();
        String port = smtpProtocol.getPort();
        int timeout = CollectUtil.getTimeout(smtpProtocol.getTimeout());
        SMTP smtp = null;
        try {
            smtp = new SMTP();
            smtp.setConnectTimeout(timeout);
            smtp.setCharset(StandardCharsets.UTF_8);
            smtp.connect(host, Integer.parseInt(port));
            if (!smtp.isConnected()) {
                metricsDataBuilder.setCodeAndMsg(CollectCodeConstants.UN_CONNECTABLE, "Peer connect failed，Timeout " + timeout + "ms");
                return;
            }

            long responseTime = System.currentTimeMillis() - startTime;
            List<String> aliasFields = metrics.getAliasFields();

            Map<String, String> resultMap = execCmdAndParseResult(smtp, smtpProtocol.getCmd(), smtpProtocol);
            resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));
            if (resultMap.size() < aliasFields.size()) {
                log.error("smtp response data not enough: {}", resultMap);
                metricsDataBuilder.setFailedMsg("The cmd execution results do not match the expected number of metrics.");
                return;
            }

            for (String field : aliasFields) {
                String fieldValue = resultMap.get(field);
                metricsDataBuilder.getArrowVectorWriter().setValue(field, fieldValue);
            }

            smtp.disconnect();
        } catch (SocketException socketException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(socketException);
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
            if (smtp != null) {
                try {
                    smtp.disconnect();
                } catch (Exception e) {
                    log.warn(e.getMessage());
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SMTP;
    }

    private static Map<String, String> execCmdAndParseResult(SMTP smtp, String cmd, SmtpProtocol smtpProtocol) throws IOException {
        Map<String, String> result = new HashMap<>(8);
        // Store the response of the SMTP connection
        result.put("smtpBanner", smtp.getReplyString());
        smtp.helo(smtpProtocol.getEmail());
        // Retrieve the response for the HELO command
        String replyString = smtp.getReplyString();
        result.put("heloInfo", replyString);
        String[] lines = replyString.split("\n");
        for (String line : lines) {
            if (line.startsWith("250")) {
                result.put("response", "OK");
            }
        }
        return result;
    }
}
