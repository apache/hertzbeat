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

package org.dromara.hertzbeat.collector.collect.pop3;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.pop3.POP3MessageInfo;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.Pop3Protocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;

import org.apache.commons.net.pop3.POP3SClient;
import org.apache.commons.net.pop3.POP3Client;
import org.dromara.hertzbeat.common.util.CommonUtil;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


/**
 * pop3 collect
 * @author a-little-fool
 */
@Slf4j
public class Pop3CollectImpl extends AbstractCollect {

    private final static String EMAIL_COUNT = "email_count";
    private final static String MAILBOX_SIZE = "mailbox_size";

    public Pop3CollectImpl() {

    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();

        try {
            validateParams(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }

        Pop3Protocol pop3Protocol = metrics.getPop3();
        POP3Client pop3Client = null;
        boolean ssl = Boolean.parseBoolean(pop3Protocol.getSsl());
        try {
            pop3Client = createPOP3Client(pop3Protocol, ssl);

            if (pop3Client.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;

                obtainPop3Metrics(builder, pop3Client, metrics.getAliasFields(),
                        responseTime);
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("Peer connect failed，Timeout " + pop3Protocol.getTimeout() + "ms");
            }
        } catch (IOException e1) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e1);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e2) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e2);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (pop3Client != null) {
                try {
                    pop3Client.logout();
                    pop3Client.disconnect();
                } catch (IOException e) {
                    String errorMsg = CommonUtil.getMessageFromThrowable(e);
                    log.info(errorMsg);
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg(errorMsg);
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_POP3;
    }

    /**
     * 校验参数
     * @param metrics metrics
     * @throws Exception exception
     */
    private void validateParams(Metrics metrics) throws Exception {
        Pop3Protocol pop3Protocol = metrics.getPop3();
        if (metrics == null || pop3Protocol == null || pop3Protocol.isInvalid()) {
            throw new Exception("Pop3 collect must has pop3 params");
        }
    }

    /**
     * 创建POP3连接【支持SSL加密】
     * @param pop3Protocol pop3 Protocol
     * @param ssl ssl
     * @return return
     * @throws IOException IO Exception
     */
    private POP3Client createPOP3Client(Pop3Protocol pop3Protocol, boolean ssl) throws Exception {
        POP3Client pop3Client = null;
        // 判断是否启用 SSL 加密连接
        if (ssl) {
            pop3Client = new POP3SClient(true);
        } else {
            pop3Client = new POP3Client();
        }
        // 设置超时时间
        int timeout = Integer.parseInt(pop3Protocol.getTimeout());
        if (timeout > 0) {
            pop3Client.setConnectTimeout(timeout);
        }
        pop3Client.setCharset(StandardCharsets.UTF_8);
        // 连接到POP3服务器
        String host = pop3Protocol.getHost();
        int port = Integer.parseInt(pop3Protocol.getPort());
        pop3Client.connect(host, port);
        // 验证凭据
        String email = pop3Protocol.getEmail();
        String authorize = pop3Protocol.getAuthorize();
        boolean isAuthenticated = pop3Client.login(email, authorize);
        if (!isAuthenticated) {
            throw new Exception("Pop3 client authentication failed");
        }
        return pop3Client;
    }

    /**
     * 获取Pop3指标信息
     * @param builder builder
     * @param pop3Client pop3 client
     * @param aliasFields alias Fields
     * @param responseTime response Time
     */
    private void obtainPop3Metrics(CollectRep.MetricsData.Builder builder, POP3Client pop3Client,
                                                 List<String> aliasFields, long responseTime) throws IOException {
        Map<String, Object> pop3Metrics = parsePop3Metrics(pop3Client, aliasFields);

        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String alias : aliasFields) {
            Object value = pop3Metrics.get(alias);
            if (value != null) {
                valueRowBuilder.addColumns(String.valueOf(value));
            } else {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(String.valueOf(responseTime));
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
            }
        }
        builder.addValues(valueRowBuilder);
    }

    private Map<String, Object> parsePop3Metrics(POP3Client pop3Client, List<String> aliasFields) throws IOException {
        Map<String, Object> pop3Metrics = new HashMap<>(aliasFields.size());
        POP3MessageInfo status = pop3Client.status();
        int emailCount = 0;
        double mailboxSize = 0.0;
        if (status != null) {
            emailCount = status.number;
            // byte -> kb
            mailboxSize = (double) status.size / 1024.0;
            pop3Metrics.put(EMAIL_COUNT, emailCount);
            pop3Metrics.put(MAILBOX_SIZE, mailboxSize);
        }
        return pop3Metrics;
    }
}
