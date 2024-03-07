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

package org.dromara.hertzbeat.collector.collect.smtp;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.smtp.SMTP;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.SmtpProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;

import java.io.IOException;
import java.net.SocketException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * @author dongfeng
 */
@Slf4j
public class SmtpCollectImpl extends AbstractCollect {
    public SmtpCollectImpl() {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        if (metrics == null || metrics.getSmtp() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Smtp collect must has Smtp params");
            return;
        }
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
            if (smtp.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;
                List<String> aliasFields = metrics.getAliasFields();

                Map<String, String> resultMap = execCmdAndParseResult(smtp, smtpProtocol.getCmd(), smtpProtocol);
                resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));
                if (resultMap.size() < aliasFields.size()) {
                    log.error("smtp response data not enough: {}", resultMap);
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("The cmd execution results do not match the expected number of metrics.");
                    return;
                }
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String field : aliasFields) {
                    String fieldValue = resultMap.get(field);
                    valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
                }
                builder.addValues(valueRowBuilder.build());
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("Peer connect failed，Timeout " + timeout + "ms");
                return;
            }
            smtp.disconnect();
        } catch (SocketException socketException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(socketException);
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
        // 存入smtp连接的响应
        result.put("smtpBanner", smtp.getReplyString());
        smtp.helo(smtpProtocol.getEmail());
        // 获取helo的响应
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
