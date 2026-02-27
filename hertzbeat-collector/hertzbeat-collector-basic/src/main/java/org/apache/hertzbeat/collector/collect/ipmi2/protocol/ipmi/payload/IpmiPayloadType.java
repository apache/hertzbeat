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

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.payload;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 13.27.3
 */
public enum IpmiPayloadType implements IpmiCode.Code {
    IPMI(0x00, 1, 0),
    SOL(0x01, 1, 0),
    OEM_EXPLICIT(0x02, -1, -1),
    RMCPOpenSessionRequest(0x10, 1, 0),
    RMCPOpenSessionResponse(0x11, 1, 0),
    RAKPMessage1(0x12, 1, 0),
    RAKPMessage2(0x13, 1, 0),
    RAKPMessage3(0x14, 1, 0),
    RAKPMessage4(0x15, 1, 0),
    OEM0(0x20, -1, -1),
    OEM1(0x21, -1, -1),
    OEM2(0x22, -1, -1),
    OEM3(0x23, -1, -1),
    OEM4(0x24, -1, -1),
    OEM5(0x25, -1, -1),
    OEM6(0x26, -1, -1),
    OEM7(0x27, -1, -1);
    // 6 bits only.
    private final byte code;
    private final int majorFormat;
    private final int minorFormat;

    public static final byte MASK = 0x3f;

    private IpmiPayloadType(int code, int majorFormat, int minorFormat) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.majorFormat = majorFormat;
        this.minorFormat = minorFormat;
    }

    @Override
    public byte getCode() {
        return code;
    }
}
