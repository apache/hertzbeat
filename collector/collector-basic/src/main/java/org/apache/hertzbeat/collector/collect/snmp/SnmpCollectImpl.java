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

package org.apache.hertzbeat.collector.collect.snmp;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.collector.util.CollectUtil;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.SnmpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.snmp4j.PDU;
import org.snmp4j.Snmp;
import org.snmp4j.Target;
import org.snmp4j.fluent.SnmpBuilder;
import org.snmp4j.fluent.SnmpCompletableFuture;
import org.snmp4j.fluent.TargetBuilder;
import org.snmp4j.mp.MPv3;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.security.AuthMD5;
import org.snmp4j.security.PrivDES;
import org.snmp4j.security.SecurityModel;
import org.snmp4j.security.SecurityModels;
import org.snmp4j.security.SecurityProtocols;
import org.snmp4j.security.USM;
import org.snmp4j.security.UsmUser;
import org.snmp4j.smi.Address;
import org.snmp4j.smi.GenericAddress;
import org.snmp4j.smi.OID;
import org.snmp4j.smi.OctetString;
import org.snmp4j.smi.TimeTicks;
import org.snmp4j.smi.Variable;
import org.snmp4j.smi.VariableBinding;
import org.snmp4j.util.DefaultPDUFactory;
import org.snmp4j.util.TableEvent;
import org.snmp4j.util.TableUtils;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

/**
 * Snmp protocol collection implementation
 */
@Slf4j
public class SnmpCollectImpl extends AbstractCollect {

    private static final String AES128 = "1";

    private static final String SHA1 = "1";
    private static final String DEFAULT_PROTOCOL = "udp";
    private static final String OPERATION_GET = "get";
    private static final String OPERATION_WALK = "walk";
    private static final String HEX_SPLIT = ":";
    private static final String FORMAT_PATTERN =
            "{0,choice,0#|1#1 day, |1<{0,number,integer} days, }"
                    + "{1,choice,0#|1#1 hour, |1<{1,number,integer} hours, }"
                    + "{2,choice,0#|1#1 minute, |1<{2,number,integer} minutes, }"
                    + "{3,choice,0#|1#1 second, |1<{3,number,integer} seconds }";

    private final Map<Integer, Snmp> versionSnmpService = new ConcurrentHashMap<>(3);


    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getSnmp() == null) {
            throw new IllegalArgumentException("Snmp collect must has snmp params");
        }
        SnmpProtocol snmpProtocol = metrics.getSnmp();
        Assert.hasText(snmpProtocol.getHost(), "snmp host is required.");
        Assert.hasText(snmpProtocol.getPort(), "snmp port is required.");
        Assert.notNull(snmpProtocol.getVersion(), "snmp version is required.");
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        SnmpProtocol snmpProtocol = metrics.getSnmp();
        int timeout = CollectUtil.getTimeout(snmpProtocol.getTimeout());
        int snmpVersion = getSnmpVersion(snmpProtocol.getVersion());
        Snmp snmpService = null;
        try {
            SnmpBuilder snmpBuilder = new SnmpBuilder();
            snmpService = getSnmpService(snmpVersion, snmpBuilder);
            snmpService.listen();
            Target<?> target;
            Address targetAddress = GenericAddress.parse(DEFAULT_PROTOCOL + ":" + snmpProtocol.getHost()
                    + "/" + snmpProtocol.getPort());
            TargetBuilder<?> targetBuilder = snmpBuilder.target(targetAddress);
            if (snmpVersion == SnmpConstants.version3) {
                TargetBuilder.PrivProtocol privatePasswordEncryption = getPrivPasswordEncryption(snmpProtocol.getPrivPasswordEncryption());
                TargetBuilder.AuthProtocol authPasswordEncryption = getAuthPasswordEncryption(snmpProtocol.getAuthPasswordEncryption());
                target = targetBuilder
                        .user(snmpProtocol.getUsername())
                        .auth(authPasswordEncryption).authPassphrase(snmpProtocol.getAuthPassphrase())
                        .priv(privatePasswordEncryption).privPassphrase(snmpProtocol.getPrivPassphrase())
                        .done()
                        .timeout(timeout).retries(1)
                        .build();
                USM usm = new USM(SecurityProtocols.getInstance(), new OctetString(MPv3.createLocalEngineID()), 0);
                SecurityModels.getInstance().addSecurityModel(usm);
                snmpService.getUSM().addUser(
                        new OctetString(snmpProtocol.getUsername()),
                        new UsmUser(new OctetString(snmpProtocol.getUsername()),
                                AuthMD5.ID,
                                new OctetString(snmpProtocol.getAuthPassphrase()),
                                PrivDES.ID,
                                new OctetString(snmpProtocol.getPrivPassphrase()))
                );
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
            String operation = snmpProtocol.getOperation();
            operation = StringUtils.hasText(operation) ? operation : OPERATION_GET;
            if (OPERATION_GET.equalsIgnoreCase(operation)) {
                String contextName = getContextName(snmpProtocol.getContextName());
                PDU pdu = targetBuilder.pdu().type(PDU.GET).oids(snmpProtocol.getOids().values().toArray(new String[0])).contextName(contextName).build();
                SnmpCompletableFuture snmpRequestFuture = SnmpCompletableFuture.send(snmpService, target, pdu);
                List<VariableBinding> vbs = snmpRequestFuture.get().getAll();
                long responseTime = System.currentTimeMillis() - startTime;
                Map<String, String> oidsMap = snmpProtocol.getOids();
                Map<String, String> oidsValueMap = new HashMap<>(oidsMap.size());
                for (VariableBinding binding : vbs) {
                    if (binding == null) {
                        continue;
                    }
                    Variable variable = binding.getVariable();
                    if (variable instanceof TimeTicks timeTicks) {
                        String value = timeTicks.toString(FORMAT_PATTERN);
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
                        valueRowBuilder.addColumns(Objects.requireNonNullElse(value, CommonConstants.NULL_VALUE));
                    }
                }
                builder.addValues(valueRowBuilder.build());
            } else if (OPERATION_WALK.equalsIgnoreCase(operation)) {
                Map<String, String> oidMap = snmpProtocol.getOids();
                Assert.notEmpty(oidMap, "snmp oids is required when operation is walk.");
                TableUtils tableUtils = new TableUtils(snmpService, new DefaultPDUFactory(PDU.GETBULK));
                OID[] oids = oidMap.values().stream().map(OID::new).toArray(OID[]::new);
                List<TableEvent> tableEvents = tableUtils.getTable(target, oids, null, null);
                Assert.notNull(tableEvents, "snmp walk response empty content.");
                long responseTime = System.currentTimeMillis() - startTime;
                for (TableEvent tableEvent : tableEvents) {
                    if (tableEvent == null || tableEvent.isError()) {
                        continue;
                    }
                    VariableBinding[] varBindings = tableEvent.getColumns();
                    Map<String, String> oidsValueMap = new HashMap<>(varBindings.length);
                    for (VariableBinding binding : varBindings) {
                        if (binding == null) {
                            continue;
                        }
                        Variable variable = binding.getVariable();
                        if (variable instanceof TimeTicks timeTicks) {
                            String value = timeTicks.toString(FORMAT_PATTERN);
                            oidsValueMap.put(binding.getOid().trim().toDottedString(), value);
                        } else {
                            oidsValueMap.put(binding.getOid().trim().toDottedString(), bingdingHexValueToString(binding));
                        }
                    }
                    // when too many empty value field, ignore
                    if (oidsValueMap.size() < metrics.getAliasFields().size() / 2) {
                        continue;
                    }
                    CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                    for (String alias : metrics.getAliasFields()) {
                        if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                            valueRowBuilder.addColumns(Long.toString(responseTime));
                        } else {
                            String oid = oidMap.get(alias);
                            String value = oidsValueMap.get(oid);
                            if (value == null) {
                                // get leaf
                                for (String key : oidsValueMap.keySet()) {
                                    if (key.startsWith(oid)){
                                        value = oidsValueMap.get(key);
                                        break;
                                    }
                                }
                            }
                            valueRowBuilder.addColumns(Objects.requireNonNullElse(value, CommonConstants.NULL_VALUE));
                        }
                    }
                    builder.addValues(valueRowBuilder.build());
                }
            }
        } catch (ExecutionException | InterruptedException ex) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ex);
            log.warn("[snmp collect] error: {}", errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("[snmp collect] error: {}", errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (snmpService != null) {
                if (snmpVersion == SnmpConstants.version3) {
                    try {
                        snmpClose(snmpService, SnmpConstants.version3);
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                }
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SNMP;
    }


    private synchronized Snmp getSnmpService(int snmpVersion, SnmpBuilder snmpBuilder) throws IOException {
        Snmp snmpService = versionSnmpService.get(snmpVersion);
        if (snmpService != null) {
            return snmpService;
        }
        if (snmpVersion == SnmpConstants.version3) {
            snmpService = snmpBuilder.udp().v3().securityProtocols(SecurityProtocols.SecurityProtocolSet.maxCompatibility).usm().threads(4).build();
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

    private String bingdingHexValueToString(VariableBinding binding) {
        // whether if binding is hex
        String hexString = binding.toValueString();
        if (hexString.contains(HEX_SPLIT)) {
            try {
                StringBuilder output = new StringBuilder();
                String[] hexArr = hexString.split(HEX_SPLIT);
                for (String hex : hexArr) {
                    output.append((char) Integer.parseInt(hex, 16));
                }
                return output.toString();
            } catch (Exception e) {
                return hexString;
            }
        } else {
            return hexString;
        }
    }

    private void snmpClose(Snmp snmp, int version) throws IOException {
        snmp.close();
        versionSnmpService.remove(version);
    }

    private TargetBuilder.PrivProtocol getPrivPasswordEncryption(String privPasswordEncryption) {
        if (privPasswordEncryption == null) {
            return TargetBuilder.PrivProtocol.des;
        } else if (AES128.equals(privPasswordEncryption)) {
            return TargetBuilder.PrivProtocol.aes128;
        } else {
            return TargetBuilder.PrivProtocol.des;
        }
    }

    private TargetBuilder.AuthProtocol getAuthPasswordEncryption(String authPasswordEncryption) {
        if (authPasswordEncryption == null) {
            return TargetBuilder.AuthProtocol.md5;
        } else if (SHA1.equals(authPasswordEncryption)) {
            return TargetBuilder.AuthProtocol.sha1;
        } else {
            return TargetBuilder.AuthProtocol.md5;
        }
    }

    private String getContextName(String contextName) {
        return contextName == null ? "" : contextName;
    }
}
