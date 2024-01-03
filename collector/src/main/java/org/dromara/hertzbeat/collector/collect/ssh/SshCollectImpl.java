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

package org.dromara.hertzbeat.collector.collect.ssh;

import org.apache.sshd.common.SshException;
import org.apache.sshd.common.channel.exception.SshChannelOpenException;
import org.apache.sshd.common.util.io.output.NoCloseOutputStream;
import org.apache.sshd.common.util.security.SecurityUtils;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.dromara.hertzbeat.collector.collect.common.cache.ConnectionCommonCache;
import org.dromara.hertzbeat.collector.collect.common.cache.SshConnect;
import org.dromara.hertzbeat.collector.collect.common.ssh.CommonSshClient;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.collector.util.CollectUtil;
import org.dromara.hertzbeat.collector.util.PrivateKeyUtils;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.SshProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ClientChannel;
import org.apache.sshd.client.channel.ClientChannelEvent;
import org.apache.sshd.client.session.ClientSession;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Ssh protocol collection implementation
 * @author tom
 */
@Slf4j
public class SshCollectImpl extends AbstractCollect {

    private static final String PARSE_TYPE_ONE_ROW = "oneRow";
    private static final String PARSE_TYPE_MULTI_ROW = "multiRow";
    private static final String PARSE_TYPE_NETCAT = "netcat";
    private static final String PARSE_TYPE_LOG = "log";

    private static final int DEFAULT_TIMEOUT = 10_000;

    public SshCollectImpl() {
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
        SshProtocol sshProtocol = metrics.getSsh();
        boolean reuseConnection = Boolean.parseBoolean(sshProtocol.getReuseConnection());
        int timeout = CollectUtil.getTimeout(sshProtocol.getTimeout(), DEFAULT_TIMEOUT);
        ClientChannel channel = null;
        ClientSession clientSession = null;
        try {
            clientSession = getConnectSession(sshProtocol, timeout, reuseConnection);
            channel = clientSession.createExecChannel(sshProtocol.getScript());
            ByteArrayOutputStream response = new ByteArrayOutputStream();
            channel.setOut(response);
            channel.setErr(new NoCloseOutputStream(System.err));
            channel.open().verify(timeout);
            List<ClientChannelEvent> list = new ArrayList<>();
            list.add(ClientChannelEvent.CLOSED);
            Collection<ClientChannelEvent> waitEvents = channel.waitFor(list, timeout);
            if (waitEvents.contains(ClientChannelEvent.TIMEOUT)) {
                throw new SocketTimeoutException("Failed to retrieve command result in time: " + sshProtocol.getScript());
            }
            Long responseTime = System.currentTimeMillis() - startTime;
            String result = response.toString();
            if (!StringUtils.hasText(result)) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("ssh shell response data is null");
                return;
            }
            switch (sshProtocol.getParseType()) {
                case PARSE_TYPE_LOG:
                    parseResponseDataByLog(result, metrics.getAliasFields(), builder, responseTime);
                    break;
                case PARSE_TYPE_NETCAT:
                    parseResponseDataByNetcat(result, metrics.getAliasFields(), builder, responseTime);
                    break;
                case PARSE_TYPE_ONE_ROW:
                    parseResponseDataByOne(result, metrics.getAliasFields(), builder, responseTime);
                    break;
                case PARSE_TYPE_MULTI_ROW:
                    parseResponseDataByMulti(result, metrics.getAliasFields(), builder, responseTime);
                    break;
                default:
                    builder.setCode(CollectRep.Code.FAIL);
                    builder.setMsg("Ssh collect not support this parse type: " + sshProtocol.getParseType());
                    break;
            }
        } catch (ConnectException connectException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(connectException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("The peer refused to connect: service port does not listening or firewall: " + errorMsg);
        } catch (SshException sshException) {
            Throwable throwable = sshException.getCause();
            if (throwable instanceof SshChannelOpenException) {
                log.warn("Remote ssh server no more session channel, please increase sshd_config MaxSessions.");
            }
            String errorMsg = CommonUtil.getMessageFromThrowable(sshException);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Peer ssh connection failed: " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Peer io connection failed: " + errorMsg);
        } catch (Exception exception) {
            String errorMsg = CommonUtil.getMessageFromThrowable(exception);
            log.warn(errorMsg, exception);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (channel != null && channel.isOpen()) {
                try {
                    channel.close();
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
            if (clientSession != null && !reuseConnection) {
                try {
                    clientSession.close();
                } catch (Exception e) {
                    log.error(e.getMessage(), e);
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SSH;
    }

    private void parseResponseDataByLog(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("ssh response data not enough: {}", result);
            return;
        }
        for (String line : lines) {
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(responseTime.toString());
                } else {
                    valueRowBuilder.addColumns(line);
                }
            }
            builder.addValues(valueRowBuilder.build());
        }
    }

    private void parseResponseDataByNetcat(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("ssh response data not enough: {}", result);
            return;
        }
        boolean contains = lines[0].contains("=");
        Map<String, String> mapValue = Arrays.stream(lines)
                .map(item -> {
                    if (contains) {
                        return item.split("=");
                    } else {
                        return item.split("\t");
                    }
                })
                .filter(item -> item.length == 2)
                .collect(Collectors.toMap(x -> x[0], x -> x[1]));

        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (String field : aliasFields) {
            String fieldValue = mapValue.get(field);
            if (fieldValue == null) {
                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
            } else {
                valueRowBuilder.addColumns(fieldValue);
            }
        }
        builder.addValues(valueRowBuilder.build());
    }

    private void parseResponseDataByOne(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("ssh response data not enough: {}", result);
            return;
        }
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        int aliasIndex = 0;
        int lineIndex = 0;
        while (aliasIndex < aliasFields.size()) {
            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(aliasFields.get(aliasIndex))) {
                valueRowBuilder.addColumns(responseTime.toString());
            } else {
                if (lineIndex < lines.length) {
                    valueRowBuilder.addColumns(lines[lineIndex].trim());
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
                lineIndex++;
            }
            aliasIndex++;
        }
        builder.addValues(valueRowBuilder.build());
    }

    private void parseResponseDataByMulti(String result, List<String> aliasFields,
                                          CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length <= 1) {
            log.error("ssh response data only has header: {}", result);
            return;
        }
        String[] fields = lines[0].split(" ");
        Map<String, Integer> fieldMapping = new HashMap<>(fields.length);
        for (int i = 0; i < fields.length; i++) {
            fieldMapping.put(fields[i].trim().toLowerCase(), i);
        }
        for (int i = 1; i < lines.length; i++) {
            String[] values = lines[i].split(" ");
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(responseTime.toString());
                } else {
                    Integer index = fieldMapping.get(alias.toLowerCase());
                    if (index != null && index < values.length) {
                        valueRowBuilder.addColumns(values[index]);
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                }
            }
            builder.addValues(valueRowBuilder.build());
        }
    }

    private void removeConnectSessionCache(SshProtocol sshProtocol) {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(sshProtocol.getHost()).port(sshProtocol.getPort())
                .username(sshProtocol.getUsername()).password(sshProtocol.getPassword())
                .build();
        ConnectionCommonCache.getInstance().removeCache(identifier);
    }

    private ClientSession getConnectSession(SshProtocol sshProtocol, int timeout, boolean reuseConnection)
            throws IOException, GeneralSecurityException {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(sshProtocol.getHost()).port(sshProtocol.getPort())
                .username(sshProtocol.getUsername()).password(sshProtocol.getPassword())
                .build();
        ClientSession clientSession = null;
        if (reuseConnection) {
            Optional<Object> cacheOption = ConnectionCommonCache.getInstance().getCache(identifier, true);
            if (cacheOption.isPresent()) {
                clientSession = ((SshConnect) cacheOption.get()).getConnection();
                try {
                    if (clientSession == null || clientSession.isClosed() || clientSession.isClosing()) {
                        clientSession = null;
                        ConnectionCommonCache.getInstance().removeCache(identifier);
                    }
                } catch (Exception e) {
                    log.warn(e.getMessage());
                    clientSession = null;
                    ConnectionCommonCache.getInstance().removeCache(identifier);
                }
            }
            if (clientSession != null) {
                return clientSession;
            }
        }
        SshClient sshClient = CommonSshClient.getSshClient();
        clientSession = sshClient.connect(sshProtocol.getUsername(), sshProtocol.getHost(), Integer.parseInt(sshProtocol.getPort()))
                .verify(timeout, TimeUnit.MILLISECONDS).getSession();
        if (StringUtils.hasText(sshProtocol.getPassword())) {
            clientSession.addPasswordIdentity(sshProtocol.getPassword());
        } else if (StringUtils.hasText(sshProtocol.getPrivateKey())) {
            var resourceKey = PrivateKeyUtils.writePrivateKey(sshProtocol.getHost(), sshProtocol.getPrivateKey());
            SecurityUtils.loadKeyPairIdentities(null, () -> resourceKey, new FileInputStream(resourceKey), null)
                    .forEach(clientSession::addPublicKeyIdentity);
        }  // else auth with localhost private public key certificates

        // auth
        if (!clientSession.auth().verify(timeout, TimeUnit.MILLISECONDS).isSuccess()) {
            clientSession.close();
            throw new IllegalArgumentException("ssh auth failed.");
        }
        if (reuseConnection) {
            SshConnect sshConnect = new SshConnect(clientSession);
            ConnectionCommonCache.getInstance().addCache(identifier, sshConnect);
        }
        return clientSession;
    }

    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getSsh() == null) {
            throw new Exception("ssh collect must has ssh params");
        }
    }
}
