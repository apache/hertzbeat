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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis;

import java.nio.ByteBuffer;
import org.apache.hertzbeat.collector.collect.ipmi2.client.IpmiPacketContext;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.IpmiCommandName;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.AbstractIpmiResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;


/**
 *  See IPMIv2 Section 28.2
 */
public class GetChassisStatusResponse extends AbstractIpmiResponse {

    public boolean isPowerOn;
    public boolean isPowerOverload;
    public boolean isPowerInterlock;
    public boolean isPowerFault;
    public boolean isPowerControlFault;
    public String powerRestorePolicy;
    public String lastPowerEvent;
    public boolean isFanFault;
    public boolean isDriveFault;
    public boolean isFrontPanelLockoutActive;

    enum PowerRestorePolicy implements IpmiCode.Code {
        alwaysOff(0, "Always Off"),
        previous(1, "Previous"),
        alwaysOn(2, "Always On"),
        unknown(3, "Unknown");

        private final byte code;
        private final String description;

        PowerRestorePolicy(int code, String description) {
            this.code = ByteConvertUtils.checkCastByte(code);
            this.description = description;
        }

        @Override
        public byte getCode() {
            return code;
        }

        @Override
        public String getDescription() {
            return description;
        }
    }

    enum LastPowerEvent implements IpmiCode.Code {
        none(0, "None"),
        unknown(1, "Unknown"),
        lastPowerOff(2, "Last Power Off"),
        lastPowerOn(3, "Last Power On");

        private final byte code;
        private final String description;

        LastPowerEvent(int code, String description) {
            this.code = ByteConvertUtils.checkCastByte(code);
            this.description = description;
        }

        @Override
        public byte getCode() {
            return code;
        }

        @Override
        public String getDescription() {
            return description;
        }
    }

    @Override
    public IpmiCommandName getCommandName() {
        return IpmiCommandName.GetChassisStatus;
    }

    @Override
    public void fromResponseData(IpmiPacketContext context, ByteBuffer buffer) {
        byte t = buffer.get();
        isPowerOn = getBits(t, 0, 0x1) == 1;
        isPowerOverload = getBits(t, 1, 0x1) == 1;
        isPowerInterlock = getBits(t, 2, 0x1) == 1;
        isPowerFault = getBits(t, 3, 0x1) == 1;
        isPowerControlFault = getBits(t, 4, 0x1) == 1;
        powerRestorePolicy = IpmiCode.fromByte(PowerRestorePolicy.class, getBits(t, 5, 0x3)).getDescription();
        t = buffer.get();
        lastPowerEvent = IpmiCode.fromByte(LastPowerEvent.class, getBits(t, 0, 0x1F)).getDescription();
        t = buffer.get();
        isFrontPanelLockoutActive = getBits(t, 1, 0x1) == 1;
        isDriveFault = getBits(t, 2, 0x1) == 1;
        isFanFault = getBits(t, 3, 0x1) == 1;
        ignoreBytes(buffer, 1);
    }
}
