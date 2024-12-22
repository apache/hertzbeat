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

package org.apache.hertzbeat.collector.collect.imap;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.net.imap.IMAPClient;
import org.apache.commons.net.imap.IMAPSClient;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ImapProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.springframework.util.Assert;

/**
 * imap collect
 */
@Slf4j
public class ImapCollectImpl extends AbstractCollect {

    private static final String UTF_7_X = "X-MODIFIED-UTF-7";
    private static final String STATUS = "STATUS";
    private static final String STATUS_COMMAND = "(MESSAGES RECENT UNSEEN)";
    private static final String MESSAGES = "MESSAGES";
    private static final String RECENT = "RECENT";
    private static final String UNSEEN = "UNSEEN";
    private static final String RESPONSETIME = "responseTime";
    private static final String totalMessageCount = "TotalMessageCount";
    private static final String recentMessageCount = "RecentMessageCount";
    private static final String unseenMessageCount = "UnseenMessageCount";

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        ImapProtocol imapProtocol = metrics.getImap();
        Assert.notNull(metrics, "IMAP collect must has Imap params");
        Assert.notNull(metrics.getImap(), "IMAP collect must has Imap params");
        Assert.hasText(imapProtocol.getHost(), "IMAP host is required");
        Assert.hasText(imapProtocol.getPort(), "IMAP port is required");
        Assert.hasText(imapProtocol.getEmail(), "IMAP email is required");
        Assert.hasText(imapProtocol.getAuthorize(), "IMAP authorize code is required");
        Assert.hasText(imapProtocol.getFolderName(), "IMAP folder name is required");
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        ImapProtocol imapProtocol = metrics.getImap();
        IMAPClient imapClient = null;
        boolean ssl = Boolean.parseBoolean(imapProtocol.getSsl());

        try {
            imapClient = createImapClient(imapProtocol, ssl);
            // if Connected, then collect metrics
            if (imapClient.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;
                String folderName = imapProtocol.getFolderName();
                collectImapMetrics(builder, imapClient, metrics.getAliasFields(), folderName, responseTime);
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("Peer connect failed，Timeout " + imapProtocol.getTimeout() + "ms");
            }
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (imapClient != null) {
                try {
                    imapClient.logout();
                    imapClient.disconnect();
                } catch (IOException e) {
                    String errorMsg = CommonUtil.getMessageFromThrowable(e);
                    log.error(errorMsg);
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg(errorMsg);
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_IMAP;
    }

    private IMAPClient createImapClient(ImapProtocol imapProtocol, boolean ssl) throws Exception {
        IMAPClient imapClient = null;
        // determine whether to use SSL-encrypted connections
        imapClient = new IMAPSClient(true);
        if (!ssl) {
            imapClient = new IMAPClient();
        }
        // set timeout
        int timeout = Integer.parseInt(imapProtocol.getTimeout());
        if (timeout > 0) {
            imapClient.setConnectTimeout(timeout);
        }
        //set Charset
        imapClient.setCharset(StandardCharsets.US_ASCII);
        // connect to the IMAP server
        String host = imapProtocol.getHost();
        int port = Integer.parseInt(imapProtocol.getPort());
        imapClient.connect(host, port);
        // validate credentials
        String email = imapProtocol.getEmail();
        String authorize = imapProtocol.getAuthorize();
        boolean isAuthenticated = imapClient.login(email, authorize);
        if (!isAuthenticated) {
            throw new Exception("IMAP client authentication failed");
        }
        return imapClient;

    }

    private void collectImapMetrics(CollectRep.MetricsData.Builder builder, IMAPClient imapClient, List<String> aliasFields,
                                    String folderName, long responseTime) throws Exception {
        Map<String, String> resultsMap = new HashMap<>();
        resultsMap.put(RESPONSETIME, String.valueOf(responseTime));
        imapClient.sendCommand(STATUS + " \"" + CollectUtil.stringEncodeUtf7String(folderName, UTF_7_X) + "\" " + STATUS_COMMAND);
        String[] response = imapClient.getReplyString().split("\\s+|\\(|\\)");
        for (int i = 0; i < response.length; i++) {
            switch (response[i]) {
                case MESSAGES:
                    resultsMap.put(folderName + totalMessageCount, response[i + 1]);
                    break;
                case RECENT:
                    resultsMap.put(folderName + recentMessageCount, response[i + 1]);
                    break;
                case UNSEEN:
                    resultsMap.put(folderName + unseenMessageCount, response[i + 1]);
                    break;
                default:
                    break;
            }
        }

        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String field : aliasFields) {
            String fieldValue = resultsMap.get(field);
            valueRowBuilder.addColumn(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
        }
        builder.addValueRow(valueRowBuilder.build());
    }
}
