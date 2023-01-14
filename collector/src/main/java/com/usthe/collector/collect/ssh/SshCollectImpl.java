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

package com.usthe.collector.collect.ssh;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.ssh.CommonSshClient;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.collector.util.KeyPairUtil;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.SshProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ClientChannel;
import org.apache.sshd.client.channel.ClientChannelEvent;
import org.apache.sshd.client.session.ClientSession;
import org.springframework.util.StringUtils;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.ConnectException;
import java.security.KeyPair;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Ssh protocol collection implementation
 * ssh协议采集实现
 *
 * @author tom
 * @date 2022/03/11 15:10
 */
@Slf4j
public class SshCollectImpl extends AbstractCollect {

    private static final String PARSE_TYPE_ONE_ROW = "oneRow";
    private static final String PARSE_TYPE_MULTI_ROW = "multiRow";
    private static final String PARSE_TYPE_NETCAT = "netcat";

    public SshCollectImpl() {
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        // 校验参数
        try {
            validateParams(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        SshProtocol sshProtocol = metrics.getSsh();
        // 超时时间默认6000毫秒
        int timeout = 6000;
        try {
            timeout = Integer.parseInt(sshProtocol.getTimeout());
        } catch (Exception e) {
            log.warn(e.getMessage());
        }
        try {
            ClientSession clientSession = getConnectSession(sshProtocol, timeout);
            ClientChannel channel = clientSession.createExecChannel(sshProtocol.getScript());
            ByteArrayOutputStream response = new ByteArrayOutputStream();
            channel.setOut(response);
            if (!channel.open().verify(timeout).isOpened()) {
                throw new Exception("open failed");
            }
            List<ClientChannelEvent> list = new ArrayList<>();
            list.add(ClientChannelEvent.CLOSED);
            channel.waitFor(list, timeout);
            Long responseTime = System.currentTimeMillis() - startTime;
            channel.close();
            String result = response.toString();
            if (!StringUtils.hasText(result)) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("采集数据失败");
            }
            switch (sshProtocol.getParseType()) {
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
                    parseResponseDataByMulti(result, metrics.getAliasFields(), builder, responseTime);
                    break;
            }
        } catch (ConnectException connectException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(connectException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("The peer refused to connect: service port does not listening or firewall: " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Peer connection failed: " + errorMsg);
        } catch (Exception exception) {
            String errorMsg = CommonUtil.getMessageFromThrowable(exception);
            log.warn(errorMsg, exception);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SSH;
    }


    private void parseResponseDataByNetcat(String result, List<String> aliasFields, CollectRep.MetricsData.Builder builder, Long responseTime) {
        String[] lines = result.split("\n");
        if (lines.length + 1 < aliasFields.size()) {
            log.error("ssh response data not enough: {}", result);
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
        }
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        int aliasIndex = 0;
        int lineIndex = 0;
        while (aliasIndex < aliasFields.size()) {
            if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(aliasFields.get(aliasIndex))) {
                valueRowBuilder.addColumns(responseTime.toString());
            } else {
                valueRowBuilder.addColumns(lines[lineIndex].trim());
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

    private ClientSession getConnectSession(SshProtocol sshProtocol, int timeout) throws IOException {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(sshProtocol.getHost()).port(sshProtocol.getPort())
                .username(sshProtocol.getUsername()).password(sshProtocol.getPassword())
                .build();
        Optional<Object> cacheOption = CommonCache.getInstance().getCache(identifier, true);
        ClientSession clientSession = null;
        if (cacheOption.isPresent()) {
            clientSession = (ClientSession) cacheOption.get();
            try {
                if (clientSession.isClosed() || clientSession.isClosing()) {
                    clientSession = null;
                    CommonCache.getInstance().removeCache(identifier);
                }
            } catch (Exception e) {
                log.warn(e.getMessage());
                clientSession = null;
                CommonCache.getInstance().removeCache(identifier);
            }
        }
        if (clientSession != null) {
            return clientSession;
        }
        SshClient sshClient = CommonSshClient.getSshClient();
        clientSession = sshClient.connect(sshProtocol.getUsername(), sshProtocol.getHost(), Integer.parseInt(sshProtocol.getPort()))
                .verify(timeout, TimeUnit.MILLISECONDS).getSession();
        if (StringUtils.hasText(sshProtocol.getPassword())) {
            clientSession.addPasswordIdentity(sshProtocol.getPassword());
        } else if (StringUtils.hasText(sshProtocol.getPublicKey())) {
            KeyPair keyPair = KeyPairUtil.getKeyPairFromPublicKey(sshProtocol.getPublicKey());
            if (keyPair != null) {
                clientSession.addPublicKeyIdentity(keyPair);
            }
        } else {
            throw new IllegalArgumentException("需填写账户登陆密码或公钥");
        }
        // 进行认证
        if (!clientSession.auth().verify(timeout, TimeUnit.MILLISECONDS).isSuccess()) {
            throw new IllegalArgumentException("认证失败");
        }
        CommonCache.getInstance().addCache(identifier, clientSession);
        return clientSession;
    }

    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getSsh() == null) {
            throw new Exception("Ssh collect must has ssh params");
        }
    }
}
