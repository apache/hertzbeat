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

package org.apache.hertzbeat.collector.collect.pop3;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.pop3.POP3Client;
import org.apache.commons.net.pop3.POP3MessageInfo;
import org.apache.commons.net.pop3.POP3SClient;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.Pop3Protocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;

/**
 * pop3 collect
 */
@Slf4j
public class Pop3CollectImpl extends AbstractCollect {

    private static final String EMAIL_COUNT = "email_count";
    private static final String MAILBOX_SIZE = "mailbox_size";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        Pop3Protocol pop3Protocol;
        if (metrics == null || (pop3Protocol = metrics.getPop3()) == null || pop3Protocol.isInvalid()) {
            throw new IllegalArgumentException("Pop3 collect must has pop3 params");
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();

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
     * create a POP3 connection【 with SSL encryption support 】
     * @param pop3Protocol pop3 Protocol
     * @param ssl ssl
     * @return return
     * @throws IOException IO Exception
     */
    private POP3Client createPOP3Client(Pop3Protocol pop3Protocol, boolean ssl) throws Exception {
        POP3Client pop3Client = null;
        // determine whether to use SSL-encrypted connections
        if (ssl) {
            pop3Client = new POP3SClient(true);
        } else {
            pop3Client = new POP3Client();
        }
        // set timeout
        int timeout = Integer.parseInt(pop3Protocol.getTimeout());
        if (timeout > 0) {
            pop3Client.setConnectTimeout(timeout);
        }
        pop3Client.setCharset(StandardCharsets.UTF_8);
        // connect to the POP3 server
        String host = pop3Protocol.getHost();
        int port = Integer.parseInt(pop3Protocol.getPort());
        pop3Client.connect(host, port);
        // validate credentials
        String email = pop3Protocol.getEmail();
        String authorize = pop3Protocol.getAuthorize();
        boolean isAuthenticated = pop3Client.login(email, authorize);
        if (!isAuthenticated) {
            throw new Exception("Pop3 client authentication failed");
        }
        return pop3Client;
    }

    /**
     * retrieve Pop3 metric information
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
            // bytes to KB
            mailboxSize = (double) status.size / 1024.0;
            pop3Metrics.put(EMAIL_COUNT, emailCount);
            pop3Metrics.put(MAILBOX_SIZE, mailboxSize);
        }
        return pop3Metrics;
    }
}
