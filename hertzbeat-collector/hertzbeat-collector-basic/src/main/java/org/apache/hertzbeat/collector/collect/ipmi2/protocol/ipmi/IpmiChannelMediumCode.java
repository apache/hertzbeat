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
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 6.5
 */
public enum IpmiChannelMediumCode implements IpmiCode.Code {
    IPMB_I2C(0x1),
    ICMB_v1_0(0x2),
    ICMB_v0_9(0x3),
    LAN_802_3(0x4),
    Serial_Modem(0x5),
    LAN_Other(0x6),
    PCI_SMBus(0x7),
    SMBus_v1(0x8),
    SMBus_v2(0x9),
    USB_v1(0xA),
    USB_v2(0xB),
    System_Interface(0xC);
    private final byte code;

    public static final int MASK = 0x7F;

    private IpmiChannelMediumCode(int code) {
        this.code = ByteConvertUtils.checkCastByte(code);
    }

    @Override
    public byte getCode() {
        return code;
    }

}
