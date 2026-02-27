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

package org.apache.hertzbeat.collector.collect.modbus;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.plc.AbstractPlcCollectImpl;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.ModbusProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.PlcProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.plc4x.java.api.PlcConnection;
import org.apache.plc4x.java.api.messages.PlcReadRequest;
import org.springframework.beans.BeanUtils;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * plc collect
 */
@Slf4j
public class ModbusCollectImpl extends AbstractPlcCollectImpl {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        ModbusProtocol modbus = metrics.getModbus();
        List<String> registerAddressList = modbus.getRegisterAddresses();
        // check slaveId
        if (!StringUtils.hasText(modbus.getSlaveId())) {
            modbus.setSlaveId("1");
        }
        if (!StringUtils.hasText(modbus.getTimeout())) {
            modbus.setTimeout("5000");
        }
        PlcProtocol plc = metrics.getPlc() == null ? new PlcProtocol() : metrics.getPlc();
        plc.setRegisterAddresses(registerAddressList);
        BeanUtils.copyProperties(modbus, plc);
        metrics.setPlc(plc);
        super.preCheck(metrics);
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        super.collect(builder, metrics);
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MODBUS;
    }

    @Override
    protected String getConnectionString(Metrics metrics) {
        ModbusProtocol plcProtocol = metrics.getModbus();
        return "modbus-tcp:tcp://" + plcProtocol.getHost() + ":" + plcProtocol.getPort() + "?unit-identifier=" + plcProtocol.getSlaveId();
    }

    @Override
    protected PlcReadRequest buildRequest(Metrics metrics, PlcConnection connection) {
        ModbusProtocol modbus = metrics.getModbus();
        List<String> registerAddressList = modbus.getRegisterAddresses();
        // Create a new read request:
        PlcReadRequest.Builder requestBuilder = connection.readRequestBuilder();
        for (int i = 0; i < registerAddressList.size(); i++) {
            String s1 = modbus.getAddressSyntax() + ":" + registerAddressList.get(i);
            requestBuilder.addTagAddress(metrics.getModbus().getAddressSyntax() + ":" + i, s1);
        }
        return requestBuilder.build();
    }
}
