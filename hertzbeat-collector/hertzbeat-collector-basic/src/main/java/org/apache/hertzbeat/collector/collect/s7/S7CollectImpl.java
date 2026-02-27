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

package org.apache.hertzbeat.collector.collect.s7;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.plc.AbstractPlcCollectImpl;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.PlcProtocol;
import org.apache.hertzbeat.common.entity.job.protocol.S7Protocol;
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
public class S7CollectImpl extends AbstractPlcCollectImpl {

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        S7Protocol s7 = metrics.getS7();
        List<String> registerAddressList = s7.getRegisterAddresses();
        // check RackId
        if (!StringUtils.hasText(s7.getRackId())) {
            s7.setRackId("0");
        }
        // check SlotId
        if (!StringUtils.hasText(s7.getSlotId())) {
            s7.setSlotId("0");
        }
        // check controllerType
        if (!StringUtils.hasText(s7.getControllerType())) {
            s7.setControllerType("S7_1500");
        }
        if (!StringUtils.hasText(s7.getTimeout())) {
            s7.setTimeout("5000");
        }
        PlcProtocol plc = metrics.getPlc() == null ? new PlcProtocol() : metrics.getPlc();
        plc.setRegisterAddresses(registerAddressList);
        BeanUtils.copyProperties(s7, plc);
        metrics.setPlc(plc);
        super.preCheck(metrics);
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        super.collect(builder, metrics);
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_S7;
    }

    @Override
    protected String getConnectionString(Metrics metrics) {
        S7Protocol s7Protocol = metrics.getS7();
        return "s7://" + s7Protocol.getHost() + ":" + s7Protocol.getPort() + "?remote-rack:" + s7Protocol.getRackId()
                + "&remote-slot:" + s7Protocol.getSlotId() + "&controller-type=" + s7Protocol.getControllerType();
    }

    @Override
    protected PlcReadRequest buildRequest(Metrics metrics, PlcConnection connection) {
        S7Protocol s7Protocol = metrics.getS7();
        List<String> registerAddressList = s7Protocol.getRegisterAddresses();
        // Create a new read request:
        PlcReadRequest.Builder requestBuilder = connection.readRequestBuilder();
        for (int i = 0; i < registerAddressList.size(); i++) {
            String s1 = registerAddressList.get(i);
            requestBuilder.addTagAddress(metrics.getS7().getAddressSyntax() + ":" + i, s1);
        }
        return requestBuilder.build();
    }
}
