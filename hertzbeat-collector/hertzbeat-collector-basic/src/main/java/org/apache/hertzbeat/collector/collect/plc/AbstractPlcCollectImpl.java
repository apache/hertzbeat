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

package org.apache.hertzbeat.collector.collect.plc;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PlcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.apache.plc4x.java.api.PlcConnection;
import org.apache.plc4x.java.api.PlcConnectionManager;
import org.apache.plc4x.java.api.PlcDriverManager;
import org.apache.plc4x.java.api.messages.PlcReadRequest;
import org.apache.plc4x.java.api.messages.PlcReadResponse;
import org.apache.plc4x.java.api.types.PlcResponseCode;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * abstract plc collect implement
 */
@Slf4j
public abstract class AbstractPlcCollectImpl extends AbstractCollect {
    private static final String[] DRIVER_LIST = {"s7", "modbus-tcp"};
    private static final String[] ADDRESS_SYNTAX = {"discrete-input", "coil", "input-register", "holding-register"};
    private static final String COIL = "coil";

    private static final PlcConnectionManager CONNECTION_MANAGER;

    static {
        CONNECTION_MANAGER = PlcDriverManager.getDefault().getConnectionManager();
    }


    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics == null || metrics.getPlc() == null) {
            throw new IllegalArgumentException("PLC collect must have PLC params");
        }
        // check driver name
        if (metrics.getPlc().getDriverName() == null || !ArrayUtils.contains(DRIVER_LIST, metrics.getPlc().getDriverName())) {
            throw new IllegalArgumentException("PLC collect must have valid driver name");
        }
        // check address syntax
        if (!ArrayUtils.contains(ADDRESS_SYNTAX, metrics.getPlc().getAddressSyntax())) {
            throw new IllegalArgumentException("PLC collect must have valid address syntax");
        }
        // check register address
        if (metrics.getPlc().getRegisterAddresses() == null || metrics.getPlc().getRegisterAddresses().isEmpty()) {
            throw new IllegalArgumentException("PLC collect must have register address");
        }
        // check timeout is legal
        if (Objects.nonNull(metrics.getPlc().getTimeout())) {
            try {
                Long.parseLong(metrics.getPlc().getTimeout());
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("PLC collect must have valid timeout");
            }
        }

        AtomicInteger addressCount = new AtomicInteger();
        metrics.getPlc().getRegisterAddresses().forEach(address -> {
            if (address.contains("[") && address.contains("]")) {
                String[] addressArray = address.split("\\[");
                String num = addressArray[1].replace("]", "");
                addressCount.addAndGet(Integer.parseInt(num));
            } else {
                addressCount.addAndGet(1);
            }
        });
        List<String> aliasFields = metrics.getAliasFields();
        if (Objects.isNull(aliasFields)) {
            throw new IllegalArgumentException("Please ensure that the number of aliasFields (tagName) in yml matches the number of registered addresses"
                    + "Number of AliasFields(tagList): 0 ,but Number of addresses:"
                    + addressCount.get());
        }
        int tagListCount = aliasFields.size() - 1;
        if (aliasFields.size() - 1 != addressCount.get()) {
            throw new IllegalArgumentException("Please ensure that the number of aliasFields (tagName) in yml matches the number of registered addresses"
                    + "Number of AliasFields(tagList): "
                    + tagListCount
                    + " ,but Number of addresses:" + addressCount.get());
        }
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {

        long startTime = System.currentTimeMillis();
        PlcProtocol plcProtocol = metrics.getPlc();
        PlcConnection plcConnection = null;
        try {
            String connectionString = getConnectionString(metrics);
            plcConnection = CONNECTION_MANAGER.getConnection(connectionString);
            if (!plcConnection.getMetadata().isReadSupported()) {
                log.error("This connection doesn't support reading.");
            }
            // Check if this connection support reading of data.
            if (!plcConnection.getMetadata().isWriteSupported()) {
                log.error("This connection doesn't support writing.");
            }

            PlcReadRequest readRequest = buildRequest(metrics, plcConnection);
            PlcReadResponse response = readRequest.execute().get(Long.parseLong(plcProtocol.getTimeout()), TimeUnit.MILLISECONDS);
            long responseTime = System.currentTimeMillis() - startTime;
            Map<String, String> resultMap = new HashMap<>();
            for (String tagName : response.getTagNames()) {
                if (response.getResponseCode(tagName) == PlcResponseCode.OK) {
                    int numValues = response.getNumberOfValues(tagName);
                    // If it's just one element, output just one single line.
                    log.info("{}: {}", tagName, response.getPlcValue(tagName));
                    if (numValues == 1) {
                        resultMap.put(tagName, response.getPlcValue(tagName).toString());
                    }
                    // If it's more than one element, output each in a single row.
                    else {
                        for (int i = 0; i < numValues; i++) {
                            resultMap.put(tagName + "-" + i, response.getObject(tagName, i).toString());
                        }
                    }
                } else {
                    log.error("Error[{}]: {}", tagName, response.getResponseCode(tagName).name());
                }
            }
            if (COIL.equals(plcProtocol.getAddressSyntax())) {
                resultMap = resultMap.entrySet()
                        .stream()
                        .peek(obj -> obj.setValue(String.valueOf(Boolean.TRUE.equals(Boolean.valueOf(obj.getValue())) ? 1 : 0)))
                        .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

            }
            resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));
            List<String> aliasFields = metrics.getAliasFields();
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String field : aliasFields) {
                String fieldValue = resultMap.get(field);
                valueRowBuilder.addColumn(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
            }
            builder.addValueRow(valueRowBuilder.build());
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            String message = CommonUtil.getMessageFromThrowable(e);
            builder.setMsg(message);
            log.warn(message, e);
        } finally {
            if (plcConnection != null) {
                try {
                    plcConnection.close();
                } catch (Exception e) {
                    log.warn(e.getMessage());
                }
            }
        }

    }

    protected abstract String getConnectionString(Metrics metrics);

    protected abstract PlcReadRequest buildRequest(Metrics metrics, PlcConnection connection);
}
