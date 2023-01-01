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

package com.usthe.collector.collect.snmp;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.SnmpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.CommonUtil;
import lombok.extern.slf4j.Slf4j;
import org.snmp4j.PDU;
import org.snmp4j.Snmp;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.smi.*;
import org.springframework.util.Assert;
import org.snmp4j.*;
import org.snmp4j.fluent.SnmpBuilder;
import org.snmp4j.fluent.SnmpCompletableFuture;
import org.snmp4j.fluent.TargetBuilder;
import org.snmp4j.security.SecurityModel;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

/**
 * Snmp protocol collection implementation
 * snmp 协议采集实现
 *
 * @author wangtao
 * @date 2022/6/3
 */
@Slf4j
public class SnmpCollectImpl extends AbstractCollect {

    private static final String DEFAULT_PROTOCOL = "udp";
    private static final String FORMAT_PATTERN =
            "{0,choice,0#|1#1 day, |1<{0,number,integer} days, }" +
                    "{1,choice,0#|1#1 hour, |1<{1,number,integer} hours, }" +
                    "{2,choice,0#|1#1 minute, |1<{2,number,integer} minutes, }" +
                    "{3,choice,0#|1#1 second, |1<{3,number,integer} seconds }";

    private final Map<Integer, Snmp> versionSnmpService = new ConcurrentHashMap<>(3);

    public SnmpCollectImpl() {
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
        SnmpProtocol snmpProtocol = metrics.getSnmp();
        int timeout = CollectUtil.getTimeout(snmpProtocol.getTimeout());
        int snmpVersion = getSnmpVersion(snmpProtocol.getVersion());
        try {
            SnmpBuilder snmpBuilder = new SnmpBuilder();
            Snmp snmpService = getSnmpService(snmpVersion);
            Target<?> target;
            Address targetAddress = GenericAddress.parse(DEFAULT_PROTOCOL + ":" + snmpProtocol.getHost()
                    + "/" + snmpProtocol.getPort());
            TargetBuilder<?> targetBuilder = snmpBuilder.target(targetAddress);
            if (snmpVersion == SnmpConstants.version3) {
                target = targetBuilder
                        .user(snmpProtocol.getUsername())
                        .auth(TargetBuilder.AuthProtocol.hmac192sha256).authPassphrase(snmpProtocol.getAuthPassphrase())
                        .priv(TargetBuilder.PrivProtocol.aes128).privPassphrase(snmpProtocol.getPrivPassphrase())
                        .done()
                        .timeout(timeout).retries(1)
                        .build();
            } else if (snmpVersion == SnmpConstants.version1) {
                target = targetBuilder
                        .v1()
                        .community(new OctetString(snmpProtocol.getCommunity()))
                        .timeout(timeout).retries(1)
                        .build();
                target.setSecurityModel(SecurityModel.SECURITY_MODEL_SNMPv1);
            } else {
                target = targetBuilder
                        .v2c()
                        .community(new OctetString(snmpProtocol.getCommunity()))
                        .timeout(timeout).retries(1)
                        .build();
                target.setSecurityModel(SecurityModel.SECURITY_MODEL_SNMPv2c);
            }

            PDU pdu = targetBuilder.pdu().type(PDU.GET).oids(snmpProtocol.getOids().values().toArray(new String[0])).build();
            SnmpCompletableFuture snmpRequestFuture = SnmpCompletableFuture.send(snmpService, target, pdu);
            List<VariableBinding> vbs = snmpRequestFuture.get().getAll();
            long responseTime = System.currentTimeMillis() - startTime;
            Map<String, String> oidsMap = snmpProtocol.getOids();
            Map<String, String> oidsValueMap = new HashMap<>(oidsMap.size());
            for (VariableBinding binding : vbs) {
                Variable variable = binding.getVariable();
                if (variable instanceof TimeTicks) {
                    String value = ((TimeTicks) variable).toString(FORMAT_PATTERN);
                    oidsValueMap.put(binding.getOid().toDottedString(), value);
                } else {
                    oidsValueMap.put(binding.getOid().toDottedString(), binding.toValueString());
                }
            }
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : metrics.getAliasFields()) {
                if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(Long.toString(responseTime));
                } else {
                    String oid = oidsMap.get(alias);
                    String value = oidsValueMap.get(oid);
                    if (value != null) {
                        valueRowBuilder.addColumns(value);
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                }
            }
            builder.addValues(valueRowBuilder.build());
        } catch (ExecutionException | InterruptedException ex) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ex);
            log.info("[snmp collect] error: {}", errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("[snmp collect] error: {}", errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SNMP;
    }

    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getSnmp() == null) {
            throw new IllegalArgumentException("Snmp collect must has snmp params");
        }
        SnmpProtocol snmpProtocol = metrics.getSnmp();
        Assert.hasText(snmpProtocol.getHost(), "snmp host is required.");
        Assert.hasText(snmpProtocol.getPort(), "snmp port is required.");
        Assert.notNull(snmpProtocol.getVersion(), "snmp version is required.");
    }

    private synchronized Snmp getSnmpService(int snmpVersion) throws IOException {
        Snmp snmpService = versionSnmpService.get(snmpVersion);
        if (snmpService != null) {
            return snmpService;
        }
        SnmpBuilder snmpBuilder = new SnmpBuilder();
        if (snmpVersion == SnmpConstants.version3) {
            snmpService = snmpBuilder.udp().v3().usm().threads(4).build();
        } else if (snmpVersion == SnmpConstants.version1) {
            snmpService = snmpBuilder.udp().v1().threads(4).build();
        } else {
            snmpService = snmpBuilder.udp().v2c().threads(4).build();
        }
        versionSnmpService.put(snmpVersion, snmpService);
        return snmpService;
    }

    private int getSnmpVersion(String snmpVersion) {
        int version = SnmpConstants.version2c;
        if (!StringUtils.hasText(snmpVersion)) {
            return version;
        }
        if (snmpVersion.equalsIgnoreCase(String.valueOf(SnmpConstants.version1))
                || snmpVersion.equalsIgnoreCase(TargetBuilder.SnmpVersion.v1.name())) {
            return SnmpConstants.version1;
        }
        if (snmpVersion.equalsIgnoreCase(String.valueOf(SnmpConstants.version3))
                || snmpVersion.equalsIgnoreCase(TargetBuilder.SnmpVersion.v3.name())) {
            return SnmpConstants.version3;
        }
        return version;
    }
}
