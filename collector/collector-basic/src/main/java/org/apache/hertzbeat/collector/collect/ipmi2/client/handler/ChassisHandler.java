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

package org.apache.hertzbeat.collector.collect.ipmi2.client.handler;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiSession;
import org.apache.hertzbeat.collector.collect.ipmi2.client.UdpConnection;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis.GetChassisStatusRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis.GetChassisStatusResponse;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * ChassisHandler
 */
public class ChassisHandler implements IpmiHandler {

    Map<String, String> parseValue = new HashMap<>();

    @Override
    public void handler(IpmiSession session, UdpConnection connection, CollectRep.MetricsData.Builder builder, Metrics metrics) throws IOException {
        GetChassisStatusResponse getChassisStatusResponse = connection.get(session, new GetChassisStatusRequest(), GetChassisStatusResponse.class);
        parseFieldToMap(getChassisStatusResponse);
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        for (Metrics.Field field : metrics.getFields()) {
            if (!parseValue.containsKey(field.getField())) {
                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                continue;
            }
            valueRowBuilder.addColumns(parseValue.get(field.getField()));
        }
        builder.addValues(valueRowBuilder.build());
    }

    public void parseFieldToMap(GetChassisStatusResponse getChassisStatusResponse) {
        parseValue.put("system_power", getChassisStatusResponse.isPowerOn ? "on" : "off");
        parseValue.put("power_overload", getChassisStatusResponse.isPowerOverload ? "true" : "false");
        parseValue.put("power_interlock", getChassisStatusResponse.isPowerInterlock ? "true" : "false");
        parseValue.put("power_fault", getChassisStatusResponse.isPowerFault ? "true" : "false");
        parseValue.put("power_control_fault", getChassisStatusResponse.isPowerControlFault ? "true" : "false");
        parseValue.put("power_restore_policy", getChassisStatusResponse.powerRestorePolicy);
        parseValue.put("last_power_event", getChassisStatusResponse.lastPowerEvent);
        parseValue.put("fan_fault", getChassisStatusResponse.isFanFault ? "true" : "false");
        parseValue.put("drive_fault", getChassisStatusResponse.isDriveFault ? "true" : "false");
        parseValue.put("front_panel_lockout_active", getChassisStatusResponse.isFrontPanelLockoutActive ? "true" : "false");
    }

}
