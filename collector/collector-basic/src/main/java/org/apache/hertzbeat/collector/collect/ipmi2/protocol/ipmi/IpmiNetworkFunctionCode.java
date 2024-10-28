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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.IpmiCommand;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.IpmiResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 5.1
 */
public enum IpmiNetworkFunctionCode implements IpmiCode.Code {

    Chassis(0x00),
    Bridge(0x02),
    Sensor_Event(0x04),
    App(0x06),
    Firmware(0x08),
    Storage(0x0A),
    Transport(0x0C),
    GroupExtension(0x2C),
    OEM_Group(0x2E);

    private final byte code;

    public static final int MASK = 0x3F;

    private IpmiNetworkFunctionCode(int code) {
        this.code = ByteConvertUtils.checkCastByte(code);
    }

    @Override
    public byte getCode() {
        return code;
    }

    public int getCode(IpmiCommand command) {
        if (command instanceof IpmiResponse) {
            return (code | 0x1);
        }
        return code;
    }
}
